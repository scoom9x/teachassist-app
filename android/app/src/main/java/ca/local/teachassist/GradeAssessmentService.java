package ca.local.teachassist;
import android.content.*;
import android.widget.*;
import org.json.*;
import java.util.*;

public class GradeAssessmentService extends RemoteViewsService {
 public RemoteViewsFactory onGetViewFactory(Intent intent) { return new Factory(getApplicationContext()); }
 static class Factory implements RemoteViewsFactory {
  final Context context;
  final ArrayList<JSONObject> items=new ArrayList<>();
  boolean hidden;
  Factory(Context context){this.context=context;}
  public void onCreate(){onDataSetChanged();}
  public void onDataSetChanged(){
   items.clear();hidden=GradeStore.prefs(context).getBoolean("hidden",false);
   try{JSONArray courses=new JSONArray(GradeStore.prefs(context).getString("courses","[]"));
    for(int i=0;i<courses.length();i++){JSONObject course=courses.getJSONObject(i);JSONArray assessments=course.optJSONArray("assessments");if(assessments==null)continue;
     for(int j=0;j<assessments.length();j++){JSONObject item=assessments.getJSONObject(j);item.put("course",course.optString("code"));items.add(item);}}
    items.sort((a,b)->b.optString("updated").compareTo(a.optString("updated")));
   }catch(Exception ignored){}
  }
  public RemoteViews getViewAt(int position){
   if(position<0||position>=items.size())return null;
   JSONObject item=items.get(position);RemoteViews row=new RemoteViews(context.getPackageName(),R.layout.grade_widget_assessment);
   row.setTextViewText(R.id.assessment_title,item.optString("name"));
   row.setTextViewText(R.id.assessment_score,item.optString("course")+" · "+(hidden?"•••":item.optString("score","Not graded")));
   return row;
  }
  public int getCount(){return items.size();}
  public long getItemId(int position){return position;}
  public boolean hasStableIds(){return false;}
  public int getViewTypeCount(){return 1;}
  public RemoteViews getLoadingView(){return null;}
  public void onDestroy(){items.clear();}
 }
}
