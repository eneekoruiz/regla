import SwiftUI
import WidgetKit

struct CycleSnapshot: Decodable { let date: String; let title: String; let day: Int; let progress: Double }
struct CycleEntry: TimelineEntry { let date: Date; let snapshot: CycleSnapshot? }
struct CycleProvider: TimelineProvider {
    func placeholder(in context: Context) -> CycleEntry { CycleEntry(date: Date(), snapshot: nil) }
    func getSnapshot(in context: Context, completion: @escaping (CycleEntry) -> Void) { completion(read()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<CycleEntry>) -> Void) {
        let now = Date()
        let midnight = Calendar.current.startOfDay(for: Calendar.current.date(byAdding: .day, value: 1, to: now)!)
        // Expire the cached estimate at midnight. Never infer a new period in a widget.
        completion(Timeline(entries: [read(), CycleEntry(date: midnight, snapshot: nil)], policy: .never))
    }
    private func read() -> CycleEntry {
        let data = UserDefaults(suiteName: "group.app.aura.privatecycle")?.data(forKey: "snapshot")
        let snapshot = data.flatMap { try? JSONDecoder().decode(CycleSnapshot.self, from: $0) }
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd"
        return CycleEntry(date: Date(), snapshot: snapshot?.date == formatter.string(from: Date()) ? snapshot : nil)
    }
}
struct CycleWidgetView: View {
    let entry: CycleEntry
    @Environment(\.widgetFamily) var family
    private let ink = Color(red: 0.22, green: 0.23, blue: 0.22)
    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().stroke(Color(red: 0.94, green: 0.90, blue: 0.90), lineWidth: 7)
                Circle().trim(from: 0, to: min(1, max(0, entry.snapshot?.progress ?? 0))).stroke(Color(red: 0.53, green: 0.26, blue: 0.33), style: StrokeStyle(lineWidth: 7, lineCap: .round)).rotationEffect(.degrees(-90))
                VStack { Text("Aura").font(.system(.caption, design: .serif)); if let s = entry.snapshot, s.day > 0 { Text("Día \(s.day)").font(.system(.title2, design: .serif)) } }
            }.aspectRatio(1, contentMode: .fit)
            if family == .systemMedium { Text(entry.snapshot?.title ?? "Tu espacio privado. Abre Aura.").font(.system(.title3, design: .serif)) }
        }.foregroundStyle(ink).padding(8).privacySensitive().containerBackground(Color(red: 0.98, green: 0.98, blue: 0.96), for: .widget)
    }
}
@main struct AuraWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AuraCycle", provider: CycleProvider()) { CycleWidgetView(entry: $0) }
            .configurationDisplayName("Tu ciclo, a tu ritmo").description("El último registro de Aura, sin conexión.").supportedFamilies([.systemSmall, .systemMedium])
    }
}
