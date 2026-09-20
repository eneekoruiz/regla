package app.aura.privatecycle;
public class HealthPrivacyActivity extends android.app.Activity {
  @Override public void onCreate(android.os.Bundle state) {
    super.onCreate(state);
    android.widget.TextView text = new android.widget.TextView(this);
    text.setText("Aura y tu privacidad\n\nAura lee el sangrado menstrual que autorices en Health Connect para completar tu historial. Si autorizas la escritura, guarda tus registros de sangrado en Salud. No comparte notas, intimidad ni síntomas. Puedes revocar los permisos en Health Connect.\n\nEl modo privado local conserva los datos en tu dispositivo. Una cuenta con sincronización guarda también una copia en tu servidor configurado. No usamos publicidad ni enviamos el chat a una IA externa.");
    text.setTextSize(18); text.setPadding(32, 60, 32, 32); text.setTextColor(android.graphics.Color.rgb(57,59,56)); text.setBackgroundColor(android.graphics.Color.rgb(250,249,246));
    android.widget.ScrollView scroll = new android.widget.ScrollView(this); scroll.addView(text); setContentView(scroll);
  }
}
