package com.sis.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Plugin natif « ProximityMesh » — étape 2 : découverte Bluetooth LE.
 *
 * Rôle de cette étape : trouver les autres téléphones SIS à portée et les
 * remonter au JavaScript via l'événement `peerFound`. Aucun message n'est
 * encore échangé (le GATT arrive à l'étape 3).
 *
 * Choix d'implémentation importants :
 *  - l'adresse MAC (identifiant matériel stable et traçable) ne sort jamais du
 *    téléphone : le JavaScript ne reçoit qu'un identifiant haché (`id`). La
 *    correspondance id → appareil reste en mémoire pour l'étape 3.
 *  - Android arrête silencieusement un scan BLE après un moment (économie
 *    d'énergie) : on relance donc le scan toutes les 15 s tant qu'il est actif.
 *  - les permissions diffèrent selon la version d'Android : BLUETOOTH_SCAN /
 *    BLUETOOTH_CONNECT à partir d'Android 12, ACCESS_FINE_LOCATION avant.
 */
@CapacitorPlugin(
        name = "ProximityMesh",
        permissions = {
                @Permission(alias = "scan", strings = { Manifest.permission.BLUETOOTH_SCAN }),
                @Permission(alias = "connect", strings = { Manifest.permission.BLUETOOTH_CONNECT }),
                @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
        }
)
public class ProximityMeshPlugin extends Plugin {

    private static final String TAG = "ProximityMesh";

    /** Sel fixe : le même appareil produit toujours le même identifiant local. */
    private static final String PEER_ID_SALT = "sis-proximity-v1";

    /** Un même appareil n'est remonté qu'une fois toutes les 2,5 s. */
    private static final long EMIT_INTERVAL_MS = 2500L;

    /** Android coupe les scans longs : on les relance à ce rythme. */
    private static final long RESTART_SCAN_MS = 15000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, Long> lastEmitAt = new HashMap<>();
    private final Map<String, BluetoothDevice> devices = new HashMap<>();

    private BluetoothAdapter adapter;
    private BluetoothLeScanner scanner;
    private ScanCallback scanCallback;
    private boolean scanning = false;
    private Runnable restartTask;

    @Override
    public void load() {
        BluetoothManager manager =
                (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        adapter = manager != null ? manager.getAdapter() : null;

        scanCallback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                handleScanResult(result);
            }

            @Override
            public void onBatchScanResults(List<ScanResult> results) {
                for (ScanResult result : results) {
                    handleScanResult(result);
                }
            }

            @Override
            public void onScanFailed(int errorCode) {
                Log.w(TAG, "Scan BLE interrompu par le système (code " + errorCode + ")");
                scanning = false;
                cancelRestart();
                notifyScanState(false, "scan_failed");
            }
        };
    }

    /** Démarre le scan (demande d'abord les permissions manquantes). */
    @PluginMethod
    public void start(PluginCall call) {
        String[] missing = missingPermissionAliases();
        if (missing.length > 0) {
            requestPermissionForAliases(missing, call, "permissionsCallback");
            return;
        }
        startScanning(call);
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        if (missingPermissionAliases().length > 0) {
            call.reject(
                    "Proximity a besoin du Bluetooth pour repérer les appareils autour de toi.",
                    "permission_denied"
            );
            return;
        }
        startScanning(call);
    }

    /** Arrête le scan et prévient l'interface. */
    @PluginMethod
    public void stop(PluginCall call) {
        stopScanning();
        call.resolve(status());
    }

    /** État courant, utile quand l'interface revient au premier plan. */
    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    /**
     * Permissions manquantes pour scanner, sous forme d'alias Capacitor
     * (voir l'annotation @CapacitorPlugin ci-dessus).
     */
    private String[] missingPermissionAliases() {
        List<String> missing = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (getPermissionState("scan") != PermissionState.GRANTED) {
                missing.add("scan");
            }
            if (getPermissionState("connect") != PermissionState.GRANTED) {
                missing.add("connect");
            }
        } else if (getPermissionState("location") != PermissionState.GRANTED) {
            // Avant Android 12, scanner du BLE est considéré comme une
            // localisation approximative par le système.
            missing.add("location");
        }
        return missing.toArray(new String[0]);
    }

    @SuppressLint("MissingPermission")
    private void startScanning(PluginCall call) {
        if (adapter == null) {
            call.reject("Ce téléphone ne gère pas le Bluetooth.", "unsupported");
            return;
        }
        if (!getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
            call.reject("Ce téléphone ne gère pas le Bluetooth Low Energy.", "ble_unsupported");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Le Bluetooth est désactivé.", "bluetooth_off");
            return;
        }

        scanner = adapter.getBluetoothLeScanner();
        if (scanner == null) {
            call.reject("Le Bluetooth est désactivé.", "bluetooth_off");
            return;
        }
        if (scanning) {
            call.resolve(status());
            return;
        }

        try {
            scanner.startScan(null, scanSettings(), scanCallback);
        } catch (SecurityException e) {
            call.reject("Permission Bluetooth refusée.", "permission_denied");
            return;
        }

        scanning = true;
        scheduleRestart();
        notifyScanState(true, null);
        call.resolve(status());
    }

    private void stopScanning() {
        scanning = false;
        cancelRestart();
        try {
            if (scanner != null) {
                scanner.stopScan(scanCallback);
            }
        } catch (SecurityException e) {
            Log.w(TAG, "Arrêt du scan refusé : " + e.getMessage());
        }
        notifyScanState(false, null);
    }

    private ScanSettings scanSettings() {
        return new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setReportDelay(0)
                .build();
    }

    private void scheduleRestart() {
        cancelRestart();
        restartTask = new Runnable() {
            @Override
            public void run() {
                if (!scanning) return;
                try {
                    if (scanner != null) {
                        scanner.stopScan(scanCallback);
                        scanner.startScan(null, scanSettings(), scanCallback);
                    }
                } catch (SecurityException e) {
                    Log.w(TAG, "Redémarrage du scan refusé : " + e.getMessage());
                }
                handler.postDelayed(this, RESTART_SCAN_MS);
            }
        };
        handler.postDelayed(restartTask, RESTART_SCAN_MS);
    }

    private void cancelRestart() {
        if (restartTask != null) {
            handler.removeCallbacks(restartTask);
            restartTask = null;
        }
    }

    private void handleScanResult(ScanResult result) {
        if (result == null) return;
        BluetoothDevice device = result.getDevice();
        if (device == null) return;

        String address;
        try {
            address = device.getAddress();
        } catch (SecurityException e) {
            return;
        }
        if (address == null || address.isEmpty()) return;

        long now = System.currentTimeMillis();
        String peerId = peerIdFor(address);

        // Anti-flood : un appareil qui reste à portée ne doit pas saturer
        // l'interface ni la batterie.
        Long last = lastEmitAt.get(peerId);
        if (last != null && now - last < EMIT_INTERVAL_MS) return;
        lastEmitAt.put(peerId, now);

        // Conserve l'appareil pour que l'étape 3 puisse ouvrir une connexion
        // GATT sans redemander une adresse au système.
        devices.put(peerId, device);

        JSObject peer = new JSObject();
        peer.put("id", peerId);
        peer.put("rssi", result.getRssi());
        peer.put("lastSeen", now);

        String name = safeDeviceName(device);
        if (name != null && !name.isEmpty()) {
            peer.put("name", name);
        }

        notifyListeners("peerFound", peer);
    }

    /** Le nom système peut nécessiter BLUETOOTH_CONNECT : on reste défensif. */
    private String safeDeviceName(BluetoothDevice device) {
        try {
            return device.getName();
        } catch (SecurityException e) {
            return null;
        }
    }

    /**
     * Identifiant public d'un pair : SHA-256 tronqué de l'adresse. Le
     * JavaScript ne voit donc jamais l'adresse MAC réelle.
     */
    private String peerIdFor(String address) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(
                    (address + "|" + PEER_ID_SALT).getBytes(StandardCharsets.UTF_8)
            );
            StringBuilder hex = new StringBuilder(16);
            for (int i = 0; i < 8; i++) {
                hex.append(String.format(Locale.US, "%02x", bytes[i]));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 est garanti sur Android ; repli de secours uniquement.
            return Integer.toHexString(address.hashCode());
        }
    }

    private JSObject status() {
        boolean bleSupported = adapter != null
                && getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE);

        JSObject ret = new JSObject();
        ret.put("supported", bleSupported);
        ret.put("bluetoothEnabled", adapter != null && adapter.isEnabled());
        ret.put("scanning", scanning);
        return ret;
    }

    private void notifyScanState(boolean active, String reason) {
        JSObject state = new JSObject();
        state.put("active", active);
        if (reason != null) {
            state.put("reason", reason);
        }
        notifyListeners("scanState", state);
    }

    @Override
    protected void handleOnDestroy() {
        stopScanning();
        super.handleOnDestroy();
    }
}
