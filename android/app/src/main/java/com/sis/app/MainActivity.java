package com.sis.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // L'enregistrement doit précéder super.onCreate() pour que le pont
        // JavaScript expose `Capacitor.Plugins.ProximityMesh` dès le
        // chargement de la page.
        registerPlugin(ProximityMeshPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
