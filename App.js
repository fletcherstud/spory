import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import "./global.css";
import { Home } from "./src/pages/Home";
import { NavigationContainer } from "@react-navigation/native";

export default function App() {
  return (
    <NavigationContainer>
      <Home />
    </NavigationContainer>
  );
}
