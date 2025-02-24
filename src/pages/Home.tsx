import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import Animated, {
  FadeOutDown,
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
import { usePremiumFeature } from "../hooks/usePremiumFeature";
import { useFactLimit } from "../hooks/useFactLimit";
import FactsLeftText from "../components/FactsLeftText";
import { RadarAddress } from '../types/radar';
import { LocationSearch } from '../components/LocationSearch';
import { HistoryItem } from '../types/user';
import { HistoryCarousel } from '../components/HistoryCarousel';
import { SettingsModal } from '../components/SettingsModal';
import { collection, addDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

interface WikiData {
  keyword: string;
  thumbnail: string | null;
  title: string;
  extract: string;
  url: string | null;
  found: boolean;
}

const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }
  const location = await Location.getCurrentPositionAsync({});
  return location.coords;
};

export const Home = () => {
  const { user, signInWithApple, signOut, isSigningIn, setUser } = useAuth();
  const { attemptPremiumFeature } = usePremiumFeature();
  const { canGetFact, incrementFactCount, remainingFacts } = useFactLimit();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [keywordsData, setKeywordsData] = useState<WikiData[]>([]);
  const [isProcessingKeywords, setIsProcessingKeywords] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] =
    useState<Location.PermissionStatus | null>(null);
  const [hasInitialResponse, setHasInitialResponse] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<RadarAddress | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

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
  
  const getLocationAndHistory = async (
    modifierTitle: string | null,
    customCoords?: { latitude: number; longitude: number }
  ) => {
    try {
      setIsLoading(true);
      let coords = selectedLocation ? {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude
      } : await getCurrentLocation();

      const response = await getChatGPTResponse(
        coords.latitude,
        coords.longitude,
        modifierTitle
      );
      
      setResponse(response); // Keep asterisks for display

      // Process keywords
      const keywords = await extractKeywords(response);
      setKeywordsData(keywords);

      // Save to history for premium users
      if (user?.isPremium) {
        const historyItem: HistoryItem = {
          response, // Store raw response with asterisks
          thumbnail: keywords.find(k => k.thumbnail)?.thumbnail || null,
          timestamp: Timestamp.now(),
          location: selectedLocation?.formattedAddress || "Device Location",
          modifier: modifierTitle
        };

        const historyRef = collection(db, 'users', user.id, 'history');
        await addDoc(historyRef, historyItem);
        setUser({
          ...user,
          history: [historyItem, ...(user.history || [])]
        });
      }
    } catch (error) {
      setIsLoading(false);
      if (error.message === "Location permission denied") {
        alert("Location permission is required to get facts");
      } else {
        alert("Failed to get location fact");
      }
      throw error; // Re-throw to prevent fact count increment
    }
  };

  const clearResponse = useCallback(() => {
    setResponse("");
    setKeywordsData([]);
    setHasInitialResponse(false);
  }, []);

  const isLoadingOrProcessing = isLoading || isProcessingKeywords;

  const handlePremiumFeature = async (
    modifier: { title: string; premium?: boolean } | null
  ) => {
    // Check if user can get a fact
    const allowed = await canGetFact();
    if (!allowed) return;

    try {
      if (modifier?.premium) {
        await attemptPremiumFeature(async () => {
          await getLocationAndHistory(modifier.title);
        });
      } else {
        await getLocationAndHistory(modifier?.title || null);
      }
      
      // Only increment fact count after successful response
      await incrementFactCount();
    } catch (error) {
      console.error('Error getting fact:', error);
      // Don't increment fact count on error
    }
  };

  const handleLocationSelect = (location: RadarAddress) => {
    setSelectedLocation(location);
    setIsSearchingLocation(false);
  };

  const handleCloseLocationSearch = () => {
    setIsSearchingLocation(false);
  };

  const handleHistorySelect = async (item: HistoryItem) => {
    try {
      setIsLoading(true);
      // Process keywords using raw response first
      setIsProcessingKeywords(true);
      const extracted = await extractKeywords(item.response);
      setKeywordsData(extracted);
      
      // Then set response and show everything
      setResponse(item.response);
      setHasInitialResponse(true);
    } catch (error) {
      console.error("Error processing history item:", error);
      setKeywordsData([]);
    } finally {
      setIsProcessingKeywords(false);
      setIsLoading(false);
    }
  };

  const LocationText = () => {
    if (selectedLocation) {
      return (
        <TouchableOpacity disabled={isLoadingOrProcessing} onPress={() => setIsSearchingLocation(true)}>
          <Text className="mt-2 text-gray-500">
            📍 {selectedLocation.formattedAddress}
          </Text>
        </TouchableOpacity>
      );
    }

    if (user?.isPremium) {
      return (
        <>
          <TouchableOpacity disabled={isLoadingOrProcessing} onPress={() => setIsSearchingLocation(true)}>
            <Text className="mt-2 text-blue-500">
              Set Location Anywhere
            </Text>
          </TouchableOpacity>
          <LocationSearch 
            isVisible={isSearchingLocation}
            onClose={handleCloseLocationSearch}
            onSelectLocation={handleLocationSelect}
          />
        </>
      );
    }

    return (
      <TouchableOpacity onPress={() => attemptPremiumFeature(() => {})}>
        <Text className="mt-2 text-blue-500">
          Unlock Premium
        </Text>
      </TouchableOpacity>
    );
  };

  const UserButton = () => (
    <TouchableOpacity
      onPress={() => setIsSettingsVisible(true)}
      className="flex-row items-center bg-gray-100 rounded-full px-4 py-2"
    >
      <Text className="text-sm font-semibold mr-2">
        {user?.fullName || user?.email || "User"}
      </Text>
      <FactsLeftText
        remainingFacts={remainingFacts}
        isPremium={user?.isPremium}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1">
      {hasInitialResponse ? (
        <View className="flex-1">
          <View className="flex-row justify-between items-center px-4 py-2">
            <TouchableOpacity onPress={clearResponse}>
              <Text className="text-2xl">✕</Text>
            </TouchableOpacity>
            {user ? (
              <UserButton />
            ) : (
              <View className="flex-row items-center gap-2">
                <FactsLeftText remainingFacts={remainingFacts} />
                <SignInButton
                  signInWithApple={signInWithApple}
                  isSigningIn={isSigningIn}
                />
              </View>
            )}
          </View>
          <ResponseComponent
            response={response}
            isLoading={isLoadingOrProcessing}
            keywordsData={keywordsData}
          />
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
      ) : (
        <View className="flex-1">
          <View className="px-4 py-2 flex-row justify-end">
            {user ? (
              <UserButton />
            ) : (
              <View className="flex-row items-center gap-2">
                <FactsLeftText remainingFacts={remainingFacts} />
                <SignInButton
                  signInWithApple={signInWithApple}
                  isSigningIn={isSigningIn}
                />
              </View>
            )}
          </View>
          <View className="flex-1 items-center mt-10">
            <Text className="text-4xl font-bold text-center">
              Every <Text className="font-black">Spot</Text> has a{"\n"}
              <Text className="font-black">Story</Text>
            </Text>
            <Text className="mt-4 text-gray-400 text-xl">
              Discover yours now
            </Text>
            <LocationText />
          

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

            {isLoadingOrProcessing ? (
              <Animated.View
                className="flex items-center mt-8"
                exiting={FadeOutDown}
                entering={FadeInDown}
              >
                <LoadingSpinner size={48} />
              </Animated.View>
            ) : (
                <>
                {user?.isPremium && (
                              <HistoryCarousel 
                                history={user.history}
                                onPress={handleHistorySelect}
                              />
                            )}
                </>
            )}
          </View>
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
      )}
      <LocationSearch 
        isVisible={isSearchingLocation}
        onClose={handleCloseLocationSearch}
        onSelectLocation={handleLocationSelect}
      />
      <SettingsModal 
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      />
    </SafeAreaView>
  );
};
