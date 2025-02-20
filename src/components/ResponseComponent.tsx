import { View, Text, ScrollView } from "react-native";
import React, { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import HighlightKeywordsText from "./HighlightKeywordsText";
import WikiImageCarousel from "./WikiImageCarousel";

interface ResponseComponentProps {
  response: string;
  isLoading: boolean;
  keywordsData: Array<{
    keyword: string;
    thumbnail: string | null;
    title: string;
    extract: string;
    url: string | null;
  }>;
}

const cleanResponse = (text: string) => {
  return text.replace(/\*\*/g, '');
};

export default function ResponseComponent({
  response,
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
      </View>
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
