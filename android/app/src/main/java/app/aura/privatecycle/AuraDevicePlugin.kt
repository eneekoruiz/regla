package app.aura.privatecycle

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.MenstruationFlowRecord
import androidx.health.connect.client.records.MenstruationPeriodRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.*
import java.time.*

@CapacitorPlugin(name = "AuraDevice")
class AuraDevicePlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val client by lazy { HealthConnectClient.getOrCreate(context) }
    private val read = HealthPermission.getReadPermission(MenstruationFlowRecord::class)
    private val readPeriod = HealthPermission.getReadPermission(MenstruationPeriodRecord::class)
    private val write = HealthPermission.getWritePermission(MenstruationFlowRecord::class)
    private var pending: PluginCall? = null
    private lateinit var launcher: androidx.activity.result.ActivityResultLauncher<Set<String>>
    override fun load() {
        launcher = activity.activityResultRegistry.register("aura-health", activity, PermissionController.createRequestPermissionResultContract()) { permissions ->
            pending?.resolve(JSObject().put("granted", permissions.contains(read)))
            pending = null
        }
    }
    override fun handleOnDestroy() { scope.cancel(); super.handleOnDestroy() }
    @PluginMethod fun authorize(call: PluginCall) {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Instala o actualiza Health Connect para conectar tu historial."); return
        }
        if (pending != null) { call.reject("Hay una solicitud de permisos abierta."); return }
        pending = call
        val permissions = mutableSetOf(read, readPeriod, write)
        if (client.features.getFeatureStatus(androidx.health.connect.client.HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_HISTORY) == androidx.health.connect.client.HealthConnectFeatures.FEATURE_STATUS_AVAILABLE) {
            permissions.add(HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY)
        }
        activity.runOnUiThread { launcher.launch(permissions) }
    }
    private fun run(call: PluginCall, action: suspend () -> Unit) {
        scope.launch { try { action() } catch (_: Exception) { call.reject("No se ha completado la operación con Salud. Revisa sus permisos.") } }
    }
    @PluginMethod fun readPeriodDays(call: PluginCall) = run(call) {
        val granted = client.permissionController.getGrantedPermissions()
        if (!granted.contains(read)) { call.reject("Autoriza la lectura del sangrado en Health Connect."); return@run }
        val from = if (granted.contains(HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY)) Instant.EPOCH else Instant.now().minusSeconds(29 * 86400L)
        val days = JSArray()
        var token: String? = null
        do {
            val response = client.readRecords(ReadRecordsRequest(MenstruationFlowRecord::class, TimeRangeFilter.between(from, Instant.now()), pageSize = 1000, pageToken = token))
            for (record in response.records) {
                val flow = when (record.flow) {
                    MenstruationFlowRecord.FLOW_LIGHT -> "light"
                    MenstruationFlowRecord.FLOW_MEDIUM -> "medium"
                    MenstruationFlowRecord.FLOW_HEAVY -> "heavy"
                    else -> continue
                }
                days.put(JSObject().put("date", record.time.atZone(record.zoneOffset ?: ZoneId.systemDefault()).toLocalDate().toString()).put("flow", flow))
            }
            token = response.pageToken
        } while (token != null)
        if (granted.contains(readPeriod)) {
            do {
                val response = client.readRecords(ReadRecordsRequest(MenstruationPeriodRecord::class, TimeRangeFilter.between(from, Instant.now()), pageSize = 1000, pageToken = token))
                for (record in response.records) {
                        var date = record.startTime.atZone(record.startZoneOffset ?: ZoneId.systemDefault()).toLocalDate()
                    val end = record.endTime.minusNanos(1).atZone(record.endZoneOffset ?: ZoneId.systemDefault()).toLocalDate()
                    while (date <= end && date <= LocalDate.now()) {
                        days.put(JSObject().put("date", date.toString()))
                        date = date.plusDays(1)
                    }
                }
                token = response.pageToken
            } while (token != null)
        }
        call.resolve(JSObject().put("days", days))
    }
    @PluginMethod fun writePeriodDays(call: PluginCall) = run(call) {
        if (!client.permissionController.getGrantedPermissions().contains(write)) { call.reject("La escritura en Salud no está autorizada."); return@run }
        val days = call.getArray("days") ?: JSArray()
        val records = mutableListOf<MenstruationFlowRecord>()
        for (index in 0 until days.length()) {
            val day = days.getJSONObject(index)
            val date = LocalDate.parse(day.getString("date"))
            if (date > LocalDate.now()) continue
            val id = day.getString("recordId")
            require(id.startsWith("aura-"))
            if (!day.getBoolean("isPeriod")) {
                client.deleteRecords(MenstruationFlowRecord::class, emptyList(), listOf(id)); continue
            }
            val time = date.atTime(12, 0).atZone(ZoneId.systemDefault())
            val flow = when (day.optString("flow")) {
                "light", "spotting" -> MenstruationFlowRecord.FLOW_LIGHT
                "heavy", "very_heavy" -> MenstruationFlowRecord.FLOW_HEAVY
                else -> MenstruationFlowRecord.FLOW_MEDIUM
            }
            records.add(MenstruationFlowRecord(time.toInstant(), time.offset, flow, Metadata.manualEntry(clientRecordId = id, clientRecordVersion = day.getLong("version"))))
        }
        records.chunked(500).forEach { client.insertRecords(it) }
        call.resolve()
    }
    @PluginMethod fun updateWidget(call: PluginCall) {
        val snapshot = call.getObject("snapshot")
        context.getSharedPreferences("aura_widget", 0).edit().apply {
            if (snapshot == null) remove("snapshot") else putString("snapshot", snapshot.toString())
        }.apply()
        AuraWidgetProvider.refresh(context)
        call.resolve()
    }
}
