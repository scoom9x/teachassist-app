package ca.local.teachassist;
import android.appwidget.*;
import android.app.*;
import android.content.*;
import android.widget.RemoteViews;
import org.json.*;

public class GradeWidget extends AppWidgetProvider {
 public static void updateAll(Context context){AppWidgetManager manager=AppWidgetManager.getInstance(context);new GradeWidget().onUpdate(context,manager,manager.getAppWidgetIds(new ComponentName(context,GradeWidget.class)));}
 @Override public void onUpdate(Context context,AppWidgetManager manager,int[] ids){for(int id:ids){
  RemoteViews view=new RemoteViews(context.getPackageName(),R.layout.grade_widget);
  double total=0;int count=0;boolean hidden=GradeStore.prefs(context).getBoolean("hidden",false);
  try{JSONArray courses=new JSONArray(GradeStore.prefs(context).getString("courses","[]"));
   for(int i=0;i<courses.length();i++){JSONObject c=courses.getJSONObject(i);Object mark=c.isNull("final")?c.opt("mark"):c.opt("final");if(mark instanceof Number){total+=((Number)mark).doubleValue();count++;}}
  }catch(Exception ignored){}
  view.setTextViewText(R.id.widget_average,hidden?"•••":count==0?"—":String.format(java.util.Locale.getDefault(),"%.1f%%",total/count));
  if(android.os.Build.VERSION.SDK_INT>=31){
   GradeAssessmentService.Factory factory=new GradeAssessmentService.Factory(context);factory.onDataSetChanged();
   RemoteViews.RemoteCollectionItems.Builder items=new RemoteViews.RemoteCollectionItems.Builder().setViewTypeCount(1).setHasStableIds(false);
   for(int i=0;i<factory.getCount();i++)items.addItem(i,factory.getViewAt(i));
   view.setRemoteAdapter(R.id.widget_assessments,items.build());
  }else{
   Intent service=new Intent(context,GradeAssessmentService.class);service.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id);service.setData(android.net.Uri.parse(service.toUri(Intent.URI_INTENT_SCHEME)));
   view.setRemoteAdapter(R.id.widget_assessments,service);
  }
  view.setEmptyView(R.id.widget_assessments,R.id.widget_empty);
  String updated=GradeStore.prefs(context).getString("updated","");
  try{java.text.SimpleDateFormat source=new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss",java.util.Locale.US);source.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));updated=new java.text.SimpleDateFormat("MMM d, h:mm a",java.util.Locale.getDefault()).format(source.parse(updated));}catch(Exception ignored){}
  view.setTextViewText(R.id.widget_updated,updated.isEmpty()?"Not refreshed yet":"Updated "+updated);
  view.setOnClickPendingIntent(R.id.widget_root,PendingIntent.getActivity(context,0,new Intent(context,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));manager.updateAppWidget(id,view);if(android.os.Build.VERSION.SDK_INT<31)manager.notifyAppWidgetViewDataChanged(id,R.id.widget_assessments);
 }}
}
