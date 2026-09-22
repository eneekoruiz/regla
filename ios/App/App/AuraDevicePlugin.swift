import Foundation
import Capacitor
import HealthKit
import WidgetKit

@objc(AuraDevicePlugin)
public class AuraDevicePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AuraDevicePlugin"
    public let jsName = "AuraDevice"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readPeriodDays", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writePeriodDays", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateWidget", returnType: CAPPluginReturnPromise)
    ]
    private let health = HKHealthStore()
    private let flowType = HKObjectType.categoryType(forIdentifier: .menstrualFlow)!
    private let suite = "group.app.aura.privatecycle"
    private func formatter() -> DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }
    @objc func authorize(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("Apple Salud no está disponible en este dispositivo."); return }
        health.requestAuthorization(toShare: [flowType], read: [flowType]) { completed, error in
            if let error { call.reject(error.localizedDescription); return }
            // HealthKit intentionally does not disclose whether read access was denied.
            call.resolve(["granted": completed])
        }
    }
    @objc func readPeriodDays(_ call: CAPPluginCall) {
        let query = HKSampleQuery(sampleType: flowType, predicate: HKQuery.predicateForSamples(withStart: .distantPast, end: Date()), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if let error { call.reject(error.localizedDescription); return }
            let format = self.formatter()
            let days: [[String: String]] = (samples as? [HKCategorySample] ?? []).compactMap { sample in
                let flow: String
                switch sample.value {
                case HKCategoryValueMenstrualFlow.light.rawValue: flow = "light"
                case HKCategoryValueMenstrualFlow.medium.rawValue: flow = "medium"
                case HKCategoryValueMenstrualFlow.heavy.rawValue: flow = "heavy"
                default: return nil
                }
                return ["date": format.string(from: sample.startDate), "flow": flow]
            }
            call.resolve(["days": days])
        }
        health.execute(query)
    }
    @objc func writePeriodDays(_ call: CAPPluginCall) {
        guard health.authorizationStatus(for: flowType) == .sharingAuthorized else { call.reject("La escritura en Salud no está autorizada."); return }
        let format = formatter()
        let rows = call.getArray("days", JSObject.self) ?? []
        var samples: [HKCategorySample] = []
        for row in rows {
            guard let key = row["date"] as? String, let date = format.date(from: key), date <= Date(), let isPeriod = row["isPeriod"] as? Bool, let recordID = row["recordId"] as? String, recordID.hasPrefix("aura-") else { continue }
            let value: Int
            if !isPeriod { value = HKCategoryValueMenstrualFlow.none.rawValue }
            else {
                switch row["flow"] as? String {
                case "light", "spotting": value = HKCategoryValueMenstrualFlow.light.rawValue
                case "heavy", "very_heavy": value = HKCategoryValueMenstrualFlow.heavy.rawValue
                default: value = HKCategoryValueMenstrualFlow.medium.rawValue
                }
            }
            let version = (row["version"] as? NSNumber)?.int64Value ?? 1
            samples.append(HKCategorySample(type: flowType, value: value, start: date, end: date, metadata: [HKMetadataKeySyncIdentifier: recordID, HKMetadataKeySyncVersion: NSNumber(value: version)]))
        }
        if samples.isEmpty { call.resolve(); return }
        health.save(samples) { success, error in
            if success { call.resolve() } else { call.reject(error?.localizedDescription ?? "No se ha escrito en Salud.") }
        }
    }
    @objc func updateWidget(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: suite) else { call.reject("Configura el grupo compartido del widget."); return }
        if let snapshot = call.getObject("snapshot"), let data = try? JSONSerialization.data(withJSONObject: snapshot) { defaults.set(data, forKey: "snapshot") }
        else { defaults.removeObject(forKey: "snapshot") }
        WidgetCenter.shared.reloadTimelines(ofKind: "AuraCycle")
        call.resolve()
    }
}

class AuraViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(AuraDevicePlugin()) }
}
