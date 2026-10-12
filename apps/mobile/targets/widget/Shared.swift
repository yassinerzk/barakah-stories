import Foundation

/// The App Group both the app and the widgets can read. The app writes with
/// ExtensionStorage (apps/mobile/modules/widgets/index.ts); nothing leaves the phone.
let barakahAppGroup = "group.com.barakah.stories"

struct WPrayer: Codable {
  let id: String
  let name: String
  let time: String
  /// Epoch milliseconds.
  let at: Double
  var date: Date { Date(timeIntervalSince1970: at / 1000) }
}

struct WDhikr: Codable {
  var arabic: String
  var label: String
  var count: Int
  var target: Int
}

enum WidgetStore {
  static var defaults: UserDefaults? { UserDefaults(suiteName: barakahAppGroup) }

  static func prayers() -> [WPrayer] {
    guard let raw = defaults?.string(forKey: "prayers"), let data = raw.data(using: .utf8) else { return [] }
    return ((try? JSONDecoder().decode([WPrayer].self, from: data)) ?? []).sorted { $0.at < $1.at }
  }

  static var place: String { defaults?.string(forKey: "place") ?? "" }
  static var nextLabel: String { defaults?.string(forKey: "nextLabel") ?? "Next" }

  static func dhikr() -> WDhikr? {
    guard let raw = defaults?.string(forKey: "dhikr"), let data = raw.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WDhikr.self, from: data)
  }

  static func save(_ d: WDhikr) {
    guard let data = try? JSONEncoder().encode(d), let raw = String(data: data, encoding: .utf8) else { return }
    defaults?.set(raw, forKey: "dhikr")
  }

  /// One more tap for the app to collect next time it opens.
  static func addPendingTap() {
    let n = Int(defaults?.string(forKey: "pendingTaps") ?? "0") ?? 0
    defaults?.set(String(n + 1), forKey: "pendingTaps")
  }
}
