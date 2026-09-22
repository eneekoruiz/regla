package app.aura.privatecycle

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.widget.RemoteViews
import org.json.JSONObject
import java.time.LocalDate

/** Cached rendering only. No network, alarms or cycle inference inside the widget. */
class AuraWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { render(context, manager, it) } }
    companion object {
        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            manager.getAppWidgetIds(ComponentName(context, AuraWidgetProvider::class.java)).forEach { render(context, manager, it) }
        }
        private fun render(context: Context, manager: AppWidgetManager, id: Int) {
            val cached = context.getSharedPreferences("aura_widget", 0).getString("snapshot", null)
            val snapshot = try { cached?.let { JSONObject(it) } } catch (_: Exception) { null }
            val fresh = snapshot?.optString("date") == LocalDate.now().toString()
            val bitmap = Bitmap.createBitmap(300, 300, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 10f; strokeCap = Paint.Cap.ROUND; color = Color.rgb(239,230,229) }
            val bounds = RectF(18f,18f,282f,282f)
            canvas.drawOval(bounds, paint)
            paint.color = Color.rgb(134,67,85)
            if (fresh) canvas.drawArc(bounds, -90f, (snapshot?.optDouble("progress", 0.0) ?: 0.0).coerceIn(0.0,1.0).toFloat() * 360, false, paint)
            paint.style = Paint.Style.FILL; paint.textAlign = Paint.Align.CENTER; paint.textSize = 48f; paint.color = Color.rgb(57,59,56)
            val day = snapshot?.optInt("day", 0) ?: 0
            canvas.drawText(if (fresh && day > 0) "Día $day" else "Aura", 150f,165f,paint)
            val views = RemoteViews(context.packageName, R.layout.aura_widget)
            views.setImageViewBitmap(R.id.aura_ring, bitmap)
            views.setTextViewText(R.id.aura_title, if (fresh) snapshot?.optString("title") else "Tu espacio privado · Abre Aura")
            val intent = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            views.setOnClickPendingIntent(R.id.aura_widget_root, intent)
            manager.updateAppWidget(id, views)
        }
    }
}
