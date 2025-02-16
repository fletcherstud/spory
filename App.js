import "./global.css";
import { Home } from "./src/pages/Home";
import { NavigationContainer } from "@react-navigation/native";
import Purchases from "react-native-purchases";
import { AuthProvider } from "./src/contexts/AuthContext";
import "./src/firebase/config";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useState, useEffect } from "react";
import * as SplashScreen from 'expo-splash-screen';
import Radar from 'react-native-radar';

console.log('App.js - Start of file execution:', Date.now());

SplashScreen.preventAutoHideAsync().then(() => {
  console.log('SplashScreen prevented auto hide:', Date.now());
});

export default function App() {
  console.log('App component render start:', Date.now());
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    console.log('App useEffect triggered:', Date.now());
    async function initialize() {
      console.log('Initialize function start:', Date.now());
      try {
        // Configure RevenueCat
        console.log('Configuring RevenueCat:', Date.now());
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        await Purchases.configure({
          apiKey: process.env.REVENUE_CAT,
        });
        
        console.log('Configuring Radar:', Date.now());
        await Radar.initialize(process.env.RADAR_API_KEY);
        
      } catch (e) {
        console.warn(e);
      } finally {
        console.log('Setting app ready:', Date.now());
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    initialize();
  }, []);

  if (!appIsReady) {
    console.log('App not ready render:', Date.now());
    return null;
  }

  console.log('App ready render:', Date.now());
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AuthProvider>
          <Home />
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
