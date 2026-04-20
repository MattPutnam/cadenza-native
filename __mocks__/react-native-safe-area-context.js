// Jest mock for react-native-safe-area-context.
//
// The real module requires native measurement of device insets; in tests we
// render with zero insets and a no-op provider so components that depend on
// `useSafeAreaInsets()` work without a native shell.
const React = require('react');
const { View } = require('react-native');

const zeroInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const zeroFrame = { x: 0, y: 0, width: 0, height: 0 };

module.exports = {
  SafeAreaProvider: ({ children }) =>
    React.createElement(React.Fragment, null, children),
  SafeAreaConsumer: ({ children }) => children(zeroInsets),
  SafeAreaView: ({ children, ...props }) =>
    React.createElement(View, props, children),
  useSafeAreaInsets: () => zeroInsets,
  useSafeAreaFrame: () => zeroFrame,
  initialWindowMetrics: { insets: zeroInsets, frame: zeroFrame },
  SafeAreaInsetsContext: React.createContext(zeroInsets),
  SafeAreaFrameContext: React.createContext(zeroFrame),
};
