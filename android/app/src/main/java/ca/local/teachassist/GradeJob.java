package ca.local.teachassist;
import android.app.job.*;
import org.json.*;
import java.net.*;
import java.util.*;
import java.util.regex.*;
import java.io.*;

public class GradeJob extends JobService {
 private volatile boolean stopped=false;
 private Thread worker;
 @Override public boolean onStartJob(JobParameters params){stopped=false;worker=new Thread(()->{boolean retry=false;try{runRefresh();}catch(Exception e){retry=true;}if(!stopped)jobFinished(params,retry);});worker.start();return true;}
 @Override public boolean onStopJob(JobParameters params){stopped=true;if(worker!=null)worker.interrupt();return true;}
 static List<String[]> matches(String pattern,String text){Matcher m=Pattern.compile(pattern,Pattern.CASE_INSENSITIVE|Pattern.DOTALL).matcher(text);List<String[]> out=new ArrayList<>();while(m.find()){String[] groups=new String[m.groupCount()+1];for(int i=0;i<groups.length;i++)groups[i]=m.group(i);out.add(groups);}return out;}
 static String plain(String s){return s.replaceAll("<[^>]+>"," ").replace("&nbsp;"," ").replace("&amp;","&").trim();}
 static JSONArray parse(String html)throws Exception{
  if(!html.contains("Student Reports")||html.contains("name=\"password\""))throw new IOException("Not authenticated");
  JSONArray courses=new JSONArray();
  for(String[] row:matches("<tr\\b[^>]*>(.*?)</tr>",html)){
   List<String[]> cells=matches("<td\\b[^>]*>(.*?)</td>",row[1]);if(cells.size()!=3)continue;
   String code=plain(cells.get(0)[1]).split(":")[0].trim();if(!plain(cells.get(0)[1]).contains("Block:")||code.isEmpty()||code.startsWith("LUNCH"))continue;
   List<String[]> ids=matches("subject_id=(\\d+)",cells.get(2)[1]);JSONObject course=new JSONObject();course.put("id",ids.isEmpty()?"unavailable-"+courses.length():ids.get(0)[1]);course.put("code",code);
   String[][] patterns={{"mark","current mark\\s*=\\s*([0-9.]+)\\s*%"},{"midterm","MIDTERM MARK:\\s*([0-9.]+)\\s*%"},{"final","FINAL MARK:\\s*([0-9.]+)\\s*%"}};
   for(String[] pair:patterns){List<String[]> found=matches(pair[1],plain(cells.get(2)[1]));double number=found.isEmpty()?-1:Double.parseDouble(found.get(0)[1]);course.put(pair[0],number>=0&&number<=100?number:JSONObject.NULL);}
   courses.put(course);
  }
  if(courses.length()==0)throw new IOException("No courses parsed");return courses;
 }
 static String timestamp(){java.text.SimpleDateFormat f=new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'",Locale.US);f.setTimeZone(TimeZone.getTimeZone("UTC"));return f.format(new Date());}
 void runRefresh()throws Exception{
  JSONObject credentials=GradeStore.credentials(this);if(credentials==null)return;
  String user=credentials.getString("username");String body="subject_id=0&submit=login&username="+URLEncoder.encode(user,"UTF-8")+"&password="+URLEncoder.encode(credentials.getString("password"),"UTF-8");
  URL url=new URL("https://ta.yrdsb.ca/yrdsb/index.php");CookieManager cookies=new CookieManager(null,CookiePolicy.ACCEPT_ORIGINAL_SERVER);String html="";
  for(int i=0;i<8;i++){
   if(stopped||Thread.currentThread().isInterrupted())return;
   if(!url.getHost().equals("ta.yrdsb.ca")||!url.getProtocol().equals("https"))throw new IOException("Unsafe redirect");
   HttpURLConnection connection=(HttpURLConnection)url.openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(20000);connection.setReadTimeout(20000);
   for(Map.Entry<String,List<String>> h:cookies.get(url.toURI(),Collections.emptyMap()).entrySet())connection.setRequestProperty(h.getKey(),String.join("; ",h.getValue()));
   try{
    if(body!=null){connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/x-www-form-urlencoded");try(OutputStream stream=connection.getOutputStream()){stream.write(body.getBytes(java.nio.charset.StandardCharsets.UTF_8));}}
    int status=connection.getResponseCode();cookies.put(url.toURI(),connection.getHeaderFields());
    if(status>=300&&status<400){url=new URL(url,connection.getHeaderField("Location"));body=null;continue;}
    if(status==401||status==403)throw new IOException("Not authenticated");
    try(InputStream stream=status>=400?connection.getErrorStream():connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=stream.read(b))!=-1){if(out.size()>4000000)throw new IOException("Response too large");out.write(b,0,n);}html=out.toString("UTF-8");}
    if(html.contains("Student Reports"))break;
    if(status<200||status>=300)throw new IOException("Service unavailable");
    List<String[]> redirects=matches("(?:window\\.|top\\.|document\\.)?location(?:\\.href)?\\s*=\\s*['\"]([^'\"]+)['\"]",html);if(redirects.isEmpty())throw new IOException("Not authenticated");url=new URL(url,redirects.get(0)[1]);body=null;
   }finally{connection.disconnect();}
  }
  JSONArray courses=parse(html);
  synchronized(GradeStore.class){JSONObject now=GradeStore.credentials(this);
  if(!stopped&&now!=null&&user.equals(now.optString("username"))&&GradeStore.prefs(this).getInt("minutes",0)>=5)GradeStore.publish(this,courses,timestamp(),user,true);
  }
 }
}
