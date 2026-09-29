package ca.local.teachassist;

import android.Manifest;
import android.os.Build;
import android.app.job.*;
import android.content.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;

@CapacitorPlugin(name="GradeUpdates", permissions={@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class GradeUpdatesPlugin extends Plugin {
 @PluginMethod public void permission(PluginCall call) {
  if(Build.VERSION.SDK_INT<33 || getPermissionState("notifications")==PermissionState.GRANTED){JSObject r=new JSObject();r.put("granted",true);call.resolve(r);}else requestPermissionForAlias("notifications",call,"notificationResult");
 }
 @PermissionCallback private void notificationResult(PluginCall call){JSObject r=new JSObject();r.put("granted",getPermissionState("notifications")==PermissionState.GRANTED);call.resolve(r);}
 @PluginMethod public void configure(PluginCall call){try{
  int minutes=call.getInt("minutes",0);minutes=minutes>=5?Math.min(1440,minutes):0;
  GradeStore.prefs(getContext()).edit().putInt("minutes",minutes).putBoolean("notifications",call.getBoolean("notifications",false)).putBoolean("hidden",call.getBoolean("hidden",false)).apply();
  if(minutes>0 && call.getString("username")!=null && call.getString("password")!=null)GradeStore.credentials(getContext(),call.getString("username"),call.getString("password"));else GradeStore.eraseCredentials(getContext());
  JobScheduler scheduler=(JobScheduler)getContext().getSystemService(Context.JOB_SCHEDULER_SERVICE);
  scheduler.cancel(781);
  if(minutes>0)scheduler.schedule(new JobInfo.Builder(781,new ComponentName(getContext(),GradeJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(Math.max(15,minutes)*60000L).setPersisted(true).build());
  GradeWidget.updateAll(getContext());call.resolve();
 }catch(Exception e){call.reject("Could not configure background updates");}}
 @PluginMethod public void publish(PluginCall call){try{GradeStore.publish(getContext(),call.getArray("courses"),call.getString("updated",""),call.getString("account",""),call.getBoolean("notify",false));call.resolve();}catch(Exception e){call.reject("Could not update widget grades");}}
 @PluginMethod public void clear(PluginCall call){synchronized(GradeStore.class){((JobScheduler)getContext().getSystemService(Context.JOB_SCHEDULER_SERVICE)).cancel(781);GradeStore.prefs(getContext()).edit().clear().commit();GradeStore.eraseCredentials(getContext());((android.app.NotificationManager)getContext().getSystemService(Context.NOTIFICATION_SERVICE)).cancel(782);GradeWidget.updateAll(getContext());call.resolve();}}
}
