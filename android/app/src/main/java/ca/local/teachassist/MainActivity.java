package ca.local.teachassist;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
 @Override public void onCreate(android.os.Bundle state) { registerPlugin(GradeUpdatesPlugin.class); super.onCreate(state); }
 @Override public void onResume() { super.onResume(); if(getBridge()!=null)getBridge().triggerWindowJSEvent("teachassist-resume"); }
}
