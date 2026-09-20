package app.aura.privatecycle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle state) {
    registerPlugin(AuraDevicePlugin.class);
    super.onCreate(state);
  }
}
