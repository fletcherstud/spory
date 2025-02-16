import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import React, { useState, useEffect } from "react";
import ResponseBadge from "./ResponseBadge";
import ModifierButton from "./ModifierButton";
import Animated, { FadeOutDown, FadeIn } from "react-native-reanimated";
import LoadingSpinner from "./LoadingSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchComponent from "./SearchComponent";
import HighlightKeywordsText from "./HighlightKeywordsText";
import WikiImageCarousel from "./WikiImageCarousel";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, arrayUnion, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Timestamp } from 'firebase/firestore';
import { HistoryItem } from '../types/user';

interface ResponseComponentProps {
  response: string;
  clearResponse: () => void;
  getLocationAndHistory: (
    modifier: { title: string; premium?: boolean } | null
  ) => void;
  isLoading: boolean;
  keywordsData: Array<{
    keyword: string;
    thumbnail: string | null;
    title: string;
    extract: string;
    url: string | null;
  }>;
  selectedLocation?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  } | null;
  isHistoryView?: boolean;
  modifier?: string;
}

const cleanResponse = (text: string) => {
  return text.replace(/\*\*/g, '');
};

export default function ResponseComponent({
  response,
  clearResponse,
  getLocationAndHistory,
  isLoading,
  keywordsData,
  selectedLocation,
  isHistoryView = false,
  modifier
}: ResponseComponentProps) {
  const { user, setUser } = useAuth();
  const [hasSavedToHistory, setHasSavedToHistory] = useState(false);
  const keywords = keywordsData.map((data) => data.keyword);
  const [centeredKeyword, setCenteredKeyword] = useState<string | null>(
    keywordsData.find((k) => k.thumbnail)?.keyword || null
  );
  const [scrollToKeyword, setScrollToKeyword] = useState<string | null>(null);

  // Reset hasSavedToHistory when response changes
  useEffect(() => {
    setHasSavedToHistory(false);
  }, [response]);

  // Save to history effect
  useEffect(() => {
    const saveToHistory = async () => {
      if (isLoading || !user?.isPremium || hasSavedToHistory || isHistoryView) return;
      const historyItem: HistoryItem = {
        response: cleanResponse(response),
        thumbnail: keywordsData.find(k => k.thumbnail)?.thumbnail || null,
        timestamp: Timestamp.now(),
        location: selectedLocation ? selectedLocation.formattedAddress : "Device Location",
        modifier: modifier
      };

      try {
        const historyRef = collection(db, 'users', user.id, 'history');
        await addDoc(historyRef, historyItem);
        setUser({
          ...user,
          history: [historyItem, ...(user.history || [])]
        });
        setHasSavedToHistory(true);
      } catch (error) {
        console.error('Error saving history:', error);
      }
    };

    saveToHistory();
  }, [isLoading, user, response, selectedLocation, hasSavedToHistory, isHistoryView, modifier]);

  const handleKeywordPress = (keyword: string) => {
    setScrollToKeyword(keyword);
    setCenteredKeyword(keyword);
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          stickyHeaderIndices={[1]} // Index of the "The History" header in the ScrollView children
        >
          {keywordsData.length > 0 && (
            <View className="mt-1">
              <WikiImageCarousel
                keywordsData={keywordsData}
                onCenterItemChange={setCenteredKeyword}
                scrollToKeyword={scrollToKeyword}
              />
            </View>
          )}

          <View className="px-4 bg-white py-2">
            <Text className="text-2xl font-bold">The Facts:</Text>
          </View>

          <View className="px-4 pb-4">
            <HighlightKeywordsText
              text={cleanResponse(response)}
              keywords={keywords}
              centeredKeyword={centeredKeyword}
              onKeywordPress={handleKeywordPress}
            />
          </View>
        </ScrollView>

        {/* Response metadata badges
        <View className="flex-row gap-2 px-4 mt-4">
          <ResponseBadge icon="📍" title="Boulder" />
          <ResponseBadge icon="��" title="Funny" />
        </View> */}
      </View>
      {/* <SearchComponent
        getLocationAndHistory={getLocationAndHistory}
        isLoading={isLoading}
        buttonTitle="Get Another Fact"
      /> */}
      {isLoading && (
        <View
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.7)" }}
        >
          <LoadingSpinner color="black" />
        </View>
      )}
    </SafeAreaView>
  );
}
