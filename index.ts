import { registerRootComponent } from 'expo';

import App from './App';
import StorybookApp from './.storybook';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
//
// When EXPO_PUBLIC_STORYBOOK is set (via `npm run storybook`), the dev client
// boots into the Storybook workshop instead of the normal app. Unset in every
// other build path, including production.
const isStorybook = process.env.EXPO_PUBLIC_STORYBOOK === 'true';
registerRootComponent(isStorybook ? StorybookApp : App);
