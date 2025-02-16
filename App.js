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

SplashScreen.preventAutoHideAsync()

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        // Configure RevenueCat
        await Purchases.configure({
          apiKey: process.env.REVENUE_CAT,
        });
        await Radar.initialize(process.env.RADAR_API_KEY);
        
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    initialize();
  }, []);

  if (!appIsReady) {
    return null;
  }

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
