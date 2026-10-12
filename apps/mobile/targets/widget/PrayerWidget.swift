import SwiftUI
import WidgetKit

struct PrayerEntry: TimelineEntry {
  let date: Date
  let next: WPrayer?
  let day: [WPrayer]
  let place: String
  let label: String
}

/// One entry per prayer change; between them the countdown is a self-updating
/// Text(timer), so the widget never has to wake to tick.
struct PrayerProvider: TimelineProvider {
  func placeholder(in context: Context) -> PrayerEntry {
    PrayerEntry(date: .now, next: nil, day: [], place: "", label: "Next")
  }

  func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
    completion(entry(at: .now))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
    let now = Date.now
    var entries = [entry(at: now)]
    for p in WidgetStore.prayers() where p.date > now {
      entries.append(entry(at: p.date.addingTimeInterval(1)))
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }

  private func entry(at date: Date) -> PrayerEntry {
    let all = WidgetStore.prayers()
    let next = all.first { $0.date > date && $0.id != "sunrise" }
    var day: [WPrayer] = []
    if let next {
      let start = all.lastIndex { $0.id == "fajr" && $0.at <= next.at } ?? 0
      day = Array(all[start...].prefix(6))
    }
    return PrayerEntry(date: date, next: next, day: day, place: WidgetStore.place, label: WidgetStore.nextLabel)
  }
}

struct PrayerWidgetView: View {
  let entry: PrayerEntry
  @Environment(\.widgetFamily) private var family
  private let gold = Color(red: 0.85, green: 0.71, blue: 0.36)
  private let muted = Color(red: 0.66, green: 0.72, blue: 0.69)
  private let ivory = Color(red: 0.95, green: 0.94, blue: 0.89)

  var body: some View {
    if let next = entry.next {
      VStack(alignment: .leading, spacing: 6) {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: 0) {
            Text("\(entry.label) · \(next.name)".uppercased()).font(.caption2).foregroundStyle(muted).lineLimit(1)
            Text(next.date, style: .timer).font(.system(size: family == .systemSmall ? 26 : 32, weight: .semibold)).monospacedDigit().foregroundStyle(gold).lineLimit(1)
          }
          Spacer(minLength: 4)
          if family != .systemSmall {
            VStack(alignment: .trailing, spacing: 0) {
              Text(next.time).font(.headline).foregroundStyle(ivory)
              Text(entry.place).font(.caption2).foregroundStyle(muted).lineLimit(1)
            }
          }
        }
        if family == .systemSmall {
          Text(next.time).font(.headline).foregroundStyle(ivory)
        } else {
          HStack(spacing: 2) {
            ForEach(entry.day, id: \.at) { p in
              let isNext = p.at == next.at
              VStack(spacing: 0) {
                Text(p.name).font(.system(size: 10)).foregroundStyle(isNext ? gold : muted).lineLimit(1)
                Text(p.time).font(.system(size: 12, weight: isNext ? .bold : .regular)).foregroundStyle(isNext ? gold : ivory)
              }
              .frame(maxWidth: .infinity)
            }
          }
        }
      }
    } else {
      Text("Barakah").font(.headline).foregroundStyle(gold)
    }
  }
}

struct PrayerWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "BarakahPrayer", provider: PrayerProvider()) { entry in
      PrayerWidgetView(entry: entry)
        .containerBackground(for: .widget) {
          LinearGradient(colors: [Color(red: 0.07, green: 0.19, blue: 0.17), Color(red: 0.04, green: 0.12, blue: 0.11)], startPoint: .top, endPoint: .bottom)
        }
    }
    .configurationDisplayName("Prayer times")
    .description("Next prayer with a live countdown and today's times")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
