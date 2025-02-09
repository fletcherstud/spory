import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Linking,
  SafeAreaView,
} from "react-native";

import Animated, {
  FadeOutDown,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { getChatGPTResponse } from "../services/ChatGpt";
import * as Location from "expo-location";
import ResponseComponent from "../components/ResponseComponent";
import LoadingSpinner from "../components/LoadingSpinner";
import SearchComponent from "../components/SearchComponent";
import { useFocusEffect } from "@react-navigation/native";

export const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [hasLocationPermission, setHasLocationPermission] =
    useState<Location.PermissionStatus | null>(null);

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setHasLocationPermission(status);
  };

  useFocusEffect(() => {
    checkLocationPermission();
  });

  const openSettings = () => {
    Linking.openSettings();
  };

  const getLocationAndHistory = async (modifier: string | null) => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status);

      if (status !== "granted") {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Get history from ChatGPT
      const history = await getChatGPTResponse(
        latitude,
        longitude,
        modifier || null
      );
      setResponse(history);
    } catch (error) {
      alert("Failed to get location history");
    } finally {
      setIsLoading(false);
    }
  };

  const clearResponse = useCallback(() => {
    setResponse("");
  }, [response]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {response ? (
        <ResponseComponent
          response={response}
          clearResponse={clearResponse}
          getLocationAndHistory={getLocationAndHistory}
          isLoading={isLoading}
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-4xl font-bold text-center">
            Every <Text className="font-black">Spot</Text> has a{"\n"}
            <Text className="font-black">Story</Text>
          </Text>
          <Text className="mt-4 text-gray-400 text-xl">Discover yours now</Text>

          {hasLocationPermission === "denied" && (
            <View className="mt-8 px-4">
              <Text className="text-xl text-center mb-4">
                We need location permissions to find historical facts about
                where you are.
              </Text>
              <TouchableOpacity
                className="px-8 py-4 rounded-full text-center items-center bg-black border border-white"
                onPress={openSettings}
              >
                <Text className="text-white font-bold text-lg">
                  Open Settings
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isLoading && (
            <Animated.View
              className="flex items-center mt-8"
              exiting={FadeOutDown}
              entering={FadeInDown}
            >
              <LoadingSpinner size={48} />
            </Animated.View>
          )}

          {!isLoading && hasLocationPermission !== "denied" && (
            <Animated.View className="mt-auto" exiting={FadeOutDown}>
              <SearchComponent
                getLocationAndHistory={getLocationAndHistory}
                isLoading={isLoading}
                buttonTitle="Get a Fact"
              />
            </Animated.View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};
