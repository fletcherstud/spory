import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import "./global.css";
import { Home } from "./src/pages/Home";
import { NavigationContainer } from "@react-navigation/native";
import Purchases from "react-native-purchases";
import { AuthProvider } from "./src/contexts/AuthContext";
import "./src/firebase/config";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function App() {
  Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

  Purchases.configure({
    apiKey: process.env.REVENUE_CAT,
  });

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
