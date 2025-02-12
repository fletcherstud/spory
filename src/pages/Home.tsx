import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Linking,
  SafeAreaView,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
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
import { extractKeywords } from "../services/Compromise";
import SignInButton from "../components/SignInButton";

interface WikiData {
  keyword: string;
  thumbnail: string | null;
  title: string;
  extract: string;
  url: string | null;
  found: boolean;
}

export const Home = () => {
  const { user, signInWithApple, signOut, isSigningIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [keywordsData, setKeywordsData] = useState<WikiData[]>([]);
  const [isProcessingKeywords, setIsProcessingKeywords] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] =
    useState<Location.PermissionStatus | null>(null);
  const [hasInitialResponse, setHasInitialResponse] = useState(false);

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

  useEffect(() => {
    const processKeywords = async () => {
      if (response) {
        setIsProcessingKeywords(true);
        try {
          const extracted = await extractKeywords(response);
          setKeywordsData(extracted);
          if (!hasInitialResponse) {
            setHasInitialResponse(true);
          }
        } catch (error) {
          console.error("Error extracting keywords:", error);
          setKeywordsData([]);
        } finally {
          setIsProcessingKeywords(false);
          setIsLoading(false);
        }
      }
    };

    processKeywords();
  }, [response]);

  const getLocationAndHistory = async (modifier: string | null) => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status);

      if (status !== "granted") {
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
      setIsLoading(false);
    }
  };

  const clearResponse = useCallback(() => {
    setResponse("");
    setKeywordsData([]);
    setHasInitialResponse(false);
  }, []);

  const isLoadingOrProcessing = isLoading || isProcessingKeywords;

  const handlePremiumFeature = async (modifier: string | null) => {
    if (modifier && !user) {
      Alert.alert(
        "Premium Feature",
        "Sign in with Apple to access premium features like custom fact types!",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Sign In",
            onPress: async () => {
              await signInWithApple();
              await getLocationAndHistory(modifier);
            },
          },
        ]
      );
      return;
    }

    await getLocationAndHistory(modifier);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {hasInitialResponse ? (
        <View className="flex-1">
          <View className="flex-row justify-between items-center px-4 py-2">
            <TouchableOpacity onPress={clearResponse}>
              <Text className="text-2xl">✕</Text>
            </TouchableOpacity>
            {user ? (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Sign Out",
                    "Are you sure you want to sign out?",
                    [
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                      {
                        text: "Sign Out",
                        onPress: signOut,
                        style: "destructive",
                      },
                    ]
                  );
                }}
                className="flex-row items-center bg-gray-100 rounded-full px-4 py-2"
              >
                <Text className="text-sm font-semibold mr-2">
                  {user.fullName || user.email || "User"}
                </Text>
                <Text className="text-xs text-gray-500">
                  {user.isPremium ? "Pro" : "Free"}
                </Text>
              </TouchableOpacity>
            ) : (
              <SignInButton
                signInWithApple={signInWithApple}
                isSigningIn={isSigningIn}
              />
            )}
          </View>
          <ResponseComponent
            response={response}
            clearResponse={clearResponse}
            getLocationAndHistory={handlePremiumFeature}
            isLoading={isLoadingOrProcessing}
            keywordsData={keywordsData}
          />
        </View>
      ) : (
        <View className="flex-1">
          <View className="px-4 py-2 flex-row justify-end">
            {user ? (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Sign Out",
                    "Are you sure you want to sign out?",
                    [
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                      {
                        text: "Sign Out",
                        onPress: signOut,
                        style: "destructive",
                      },
                    ]
                  );
                }}
                className="flex-row items-center bg-gray-100 rounded-full px-4 py-2"
              >
                <Text className="text-sm font-semibold mr-2">
                  {user.fullName || user.email || "User"}
                </Text>
                <Text className="text-xs text-gray-500">
                  {user.isPremium ? "Premium" : "Free"}
                </Text>
              </TouchableOpacity>
            ) : (
              <SignInButton
                signInWithApple={signInWithApple}
                isSigningIn={isSigningIn}
              />
            )}
          </View>
          <View className="flex-1 items-center justify-center">
            <Text className="text-4xl font-bold text-center">
              Every <Text className="font-black">Spot</Text> has a{"\n"}
              <Text className="font-black">Story</Text>
            </Text>
            <Text className="mt-4 text-gray-400 text-xl">
              Discover yours now
            </Text>

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

            {isLoadingOrProcessing && (
              <Animated.View
                className="flex items-center mt-8"
                exiting={FadeOutDown}
                entering={FadeInDown}
              >
                <LoadingSpinner size={48} />
              </Animated.View>
            )}

            {!isLoadingOrProcessing && hasLocationPermission !== "denied" && (
              <Animated.View className="mt-auto" exiting={FadeOutDown}>
                <SearchComponent
                  getLocationAndHistory={handlePremiumFeature}
                  isLoading={isLoadingOrProcessing}
                  buttonTitle="Get a Fact"
                />
              </Animated.View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
