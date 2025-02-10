import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import React, { useState } from "react";
import ResponseBadge from "./ResponseBadge";
import ModifierButton from "./ModifierButton";
import Animated, { FadeOutDown, FadeIn } from "react-native-reanimated";
import LoadingSpinner from "./LoadingSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchComponent from "./SearchComponent";
import HighlightKeywordsText from "./HighlightKeywordsText";
import WikiImageCarousel from "./WikiImageCarousel";

interface ResponseComponentProps {
  response: string;
  clearResponse: () => void;
  getLocationAndHistory: (modifier: string) => void;
  isLoading: boolean;
  keywordsData: Array<{
    keyword: string;
    thumbnail: string | null;
    title: string;
    extract: string;
    url: string | null;
  }>;
}

export default function ResponseComponent({
  response,
  clearResponse,
  getLocationAndHistory,
  isLoading,
  keywordsData,
}: ResponseComponentProps) {
  const keywords = keywordsData.map((data) => data.keyword);
  const [centeredKeyword, setCenteredKeyword] = useState<string | null>(
    keywordsData.find((k) => k.thumbnail)?.keyword || null
  );
  const [scrollToKeyword, setScrollToKeyword] = useState<string | null>(null);

  const handleKeywordPress = (keyword: string) => {
    setScrollToKeyword(keyword);
    setCenteredKeyword(keyword);
  };

  return (
    <>
      {isLoading && (
        <View className="absolute inset-0 bg-gray-300/50 items-center justify-center z-20">
          <LoadingSpinner />
        </View>
      )}
      <SafeAreaView className="flex-1">
        <View className="flex-1">
          <TouchableOpacity
            className="absolute left-4 z-10"
            disabled={isLoading}
            onPress={clearResponse}
          >
            <Text className="text-2xl">✕</Text>
          </TouchableOpacity>
          {/* <View className="flex-row justify-between items-center px-4">
		<TouchableOpacity>
			<Text className="text-2xl">←</Text>
		</TouchableOpacity>
		<TouchableOpacity>
			<Text className="text-2xl">→</Text>
		</TouchableOpacity>
	</View> */}
          <ScrollView
            className="flex-1"
            stickyHeaderIndices={[1]} // Index of the "The History" header in the ScrollView children
          >
            {keywordsData.length > 0 && (
              <View className="mt-8">
                <WikiImageCarousel
                  keywordsData={keywordsData}
                  onCenterItemChange={setCenteredKeyword}
                  scrollToKeyword={scrollToKeyword}
                />
              </View>
            )}

            <View className="px-4 bg-white py-2">
              <Text className="text-2xl font-bold">The History:</Text>
            </View>

            <View className="px-4 pb-4">
              <HighlightKeywordsText
                text={response}
                keywords={keywords}
                centeredKeyword={centeredKeyword}
                onKeywordPress={handleKeywordPress}
              />
            </View>
          </ScrollView>

          {/* Response metadata badges
          <View className="flex-row gap-2 px-4 mt-4">
            <ResponseBadge icon="📍" title="Boulder" />
            <ResponseBadge icon="🎭" title="Funny" />
          </View> */}
        </View>
        <SearchComponent
          getLocationAndHistory={getLocationAndHistory}
          isLoading={isLoading}
          buttonTitle="Get Another Fact"
        />
      </SafeAreaView>
    </>
  );
}
