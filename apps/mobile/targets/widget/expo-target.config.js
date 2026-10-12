/**
 * iOS home-screen widgets (WidgetKit). Built only in a native iOS build (EAS),
 * never in Expo Go. Shares data with the app through the App Group below.
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = () => ({
  type: 'widget',
  name: 'BarakahWidgets',
  icon: '../../assets/icon.png',
  deploymentTarget: '17.0',
  entitlements: { 'com.apple.security.application-groups': ['group.com.barakah.stories'] },
  colors: { $accent: '#D9B65C', $widgetBackground: '#0B1F1C' },
});
