import AppIntents
import SwiftUI
import WidgetKit

/// Counts one dhikr from the home screen (iOS 17 interactive widgets).
struct TapDhikrIntent: AppIntent {
  static var title: LocalizedStringResource = "Count dhikr"

  func perform() async throws -> some IntentResult {
    if var d = WidgetStore.dhikr() {
      d.count = d.count >= d.target ? 1 : d.count + 1
      WidgetStore.save(d)
      WidgetStore.addPendingTap()
    }
    return .result()
  }
}

struct DhikrEntry: TimelineEntry {
  let date: Date
  let dhikr: WDhikr?
}

struct DhikrProvider: TimelineProvider {
  func placeholder(in context: Context) -> DhikrEntry { DhikrEntry(date: .now, dhikr: nil) }
  func getSnapshot(in context: Context, completion: @escaping (DhikrEntry) -> Void) {
    completion(DhikrEntry(date: .now, dhikr: WidgetStore.dhikr()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<DhikrEntry>) -> Void) {
    completion(Timeline(entries: [DhikrEntry(date: .now, dhikr: WidgetStore.dhikr())], policy: .never))
  }
}

struct DhikrWidgetView: View {
  let entry: DhikrEntry
  private let gold = Color(red: 0.85, green: 0.71, blue: 0.36)
  private let ink = Color(red: 0.11, green: 0.08, blue: 0.0)
  private let muted = Color(red: 0.66, green: 0.72, blue: 0.69)

  var body: some View {
    let d = entry.dhikr
    Button(intent: TapDhikrIntent()) {
      VStack(spacing: 6) {
        Text(d?.arabic ?? "سُبْحَانَ ٱللَّٰهِ").font(.system(size: 20)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6)
        Text(d.map { $0.count >= $0.target ? "✓ \($0.target)" : "\($0.count) / \($0.target)" } ?? "0")
          .font(.system(size: 18, weight: .bold)).monospacedDigit()
          .padding(.horizontal, 14).padding(.vertical, 6)
          .background(Capsule().fill(gold))
          .foregroundStyle(ink)
        Text(d?.label ?? "").font(.caption2).foregroundStyle(muted).lineLimit(1)
      }
    }
    .buttonStyle(.plain)
  }
}

struct DhikrWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "BarakahDhikr", provider: DhikrProvider()) { entry in
      DhikrWidgetView(entry: entry)
        .containerBackground(for: .widget) {
          LinearGradient(colors: [Color(red: 0.07, green: 0.19, blue: 0.17), Color(red: 0.04, green: 0.12, blue: 0.11)], startPoint: .top, endPoint: .bottom)
        }
    }
    .configurationDisplayName("Dhikr counter")
    .description("Tap to count your dhikr")
    .supportedFamilies([.systemSmall])
  }
}
