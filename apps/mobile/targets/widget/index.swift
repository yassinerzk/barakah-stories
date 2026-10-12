import SwiftUI
import WidgetKit

@main
struct BarakahWidgetBundle: WidgetBundle {
  var body: some Widget {
    PrayerWidget()
    DhikrWidget()
  }
}
