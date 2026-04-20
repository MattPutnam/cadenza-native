// Jest mock for @expo/vector-icons.
//
// The real module resolves native-font assets that don't exist in the Jest
// environment. We don't test icon visuals — only accessibility labels on the
// surrounding Pressable — so a no-op passthrough View is sufficient.
const React = require('react');
const { View } = require('react-native');

const Icon = (props) => React.createElement(View, props);

module.exports = new Proxy(
  {},
  {
    get: (_target, _name) => Icon,
  }
);
