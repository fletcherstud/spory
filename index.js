console.log('index.js - Start of file execution:', Date.now());
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
console.log('index.js - Before registerRootComponent:', Date.now());
registerRootComponent(App);
console.log('index.js - After registerRootComponent:', Date.now());
