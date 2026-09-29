package ca.local.teachassist;
import android.content.*;
import android.app.*;
import android.security.keystore.*;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import org.json.*;

final class GradeStore {
 static SharedPreferences prefs(Context c){return c.getSharedPreferences("grade-updates",Context.MODE_PRIVATE);}
 static final String ALIAS="teach-assist-background";
 static javax.crypto.SecretKey key()throws Exception{
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
  if(!store.containsAlias(ALIAS)){KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generator.generateKey();}
  return (javax.crypto.SecretKey)store.getKey(ALIAS,null);
 }
 static void credentials(Context c,String user,String password)throws Exception{
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());JSONObject value=new JSONObject();value.put("username",user);value.put("password",password);
  prefs(c).edit().putString("secret",Base64.encodeToString(cipher.doFinal(value.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP)).putString("iv",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)).commit();
 }
 static JSONObject credentials(Context c)throws Exception{
  String secret=prefs(c).getString("secret",null);if(secret==null)return null;
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(prefs(c).getString("iv",""),Base64.NO_WRAP)));
  return new JSONObject(new String(cipher.doFinal(Base64.decode(secret,Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8));
 }
 static void eraseCredentials(Context c){prefs(c).edit().remove("secret").remove("iv").commit();try{KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);store.deleteEntry(ALIAS);}catch(Exception ignored){}}
 static boolean sameMark(Object a,Object b){if(a instanceof Number && b instanceof Number)return Double.compare(((Number)a).doubleValue(),((Number)b).doubleValue())==0;return (a==null||a==JSONObject.NULL)&&(b==null||b==JSONObject.NULL);}
 static synchronized void publish(Context c,JSONArray courses,String updated,String account,boolean notify)throws Exception{
  if(courses==null)throw new IllegalArgumentException();
  SharedPreferences prefs=prefs(c);JSONArray old=new JSONArray(prefs.getString("courses","[]"));boolean changed=false;
  if(account.equals(prefs.getString("account",""))) for(int i=0;i<courses.length();i++) for(int j=0;j<old.length();j++){
   JSONObject a=courses.getJSONObject(i),b=old.getJSONObject(j);if(!a.optString("code").equals(b.optString("code")))continue;
   for(String field:new String[]{"mark","midterm","final"})if(!sameMark(a.opt(field),b.opt(field)))changed=true;
  }
  if(account.equals(prefs.getString("account",""))) for(int i=0;i<courses.length();i++) {
   JSONObject next=courses.getJSONObject(i);
   if(!next.has("assessments")) for(int j=0;j<old.length();j++) if(next.optString("id").equals(old.getJSONObject(j).optString("id"))) next.put("assessments",old.getJSONObject(j).optJSONArray("assessments"));
  }
  prefs.edit().putString("courses",courses.toString()).putString("updated",updated).putString("account",account).commit();GradeWidget.updateAll(c);
  if(changed&&notify&&prefs.getBoolean("notifications",false)){
   NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
   if(android.os.Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("grade-changes","Grade changes",NotificationManager.IMPORTANCE_DEFAULT));
   Notification.Builder builder=android.os.Build.VERSION.SDK_INT>=26?new Notification.Builder(c,"grade-changes"):new Notification.Builder(c);
   PendingIntent intent=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
   try{manager.notify(782,builder.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("Grades updated").setContentText("Your TeachAssist course grades changed. Open the app for details.").setContentIntent(intent).setAutoCancel(true).build());}catch(SecurityException ignored){}
  }
 }
}
