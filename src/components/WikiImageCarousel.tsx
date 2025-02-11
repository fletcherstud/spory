import React, { useState, useRef } from "react";
import {
  View,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import * as WebBrowser from "expo-web-browser";

const defaultWikiImage = require("../../assets/default_blank.jpg");

interface WikiImageCarouselProps {
  keywordsData: Array<{
    keyword: string;
    thumbnail: string | null;
    title: string;
    extract: string;
    url: string | null;
  }>;
  onCenterItemChange?: (keyword: string) => void;
  scrollToKeyword?: string | null;
}

const WikiImageCarousel: React.FC<WikiImageCarouselProps> = ({
  keywordsData,
  onCenterItemChange,
  scrollToKeyword,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const windowWidth = Dimensions.get("window").width;
  const imageWidth = windowWidth * 0.8;
  const imageHeight = imageWidth * 0.6;
  const SPACING = 16;

  // Calculate the padding needed to center the first and last items
  const sideInsets = (windowWidth - imageWidth - SPACING) / 2;

  // Sort the data to put items with thumbnails first
  const sortedKeywordsData = React.useMemo(() => {
    return [...keywordsData].sort((a, b) => {
      if (a.thumbnail && !b.thumbnail) return -1;
      if (!a.thumbnail && b.thumbnail) return 1;
      return 0;
    });
  }, [keywordsData]);

  React.useEffect(() => {
    if (scrollToKeyword) {
      const index = sortedKeywordsData.findIndex(
        (item) => item.keyword === scrollToKeyword
      );
      if (index !== -1) {
        const xOffset = index * (imageWidth + SPACING);
        scrollViewRef.current?.scrollTo({ x: xOffset, animated: true });
      }
    }
  }, [scrollToKeyword, sortedKeywordsData]);

  const updateCenteredItem = (scrollPosition: number) => {
    const itemWidth = imageWidth + SPACING;
    const centerIndex = Math.round((scrollPosition - sideInsets) / itemWidth);

    if (centerIndex >= 0 && centerIndex < sortedKeywordsData.length) {
      onCenterItemChange?.(sortedKeywordsData[centerIndex].keyword);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    setIsScrolling(true);

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set a new timeout
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      updateCenteredItem(scrollPosition);
    }, 150); // Wait for scroll to settle
  };

  const handleScrollBeginDrag = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  };

  const handlePress = async (url: string | null) => {
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    }
  };

  return (
    <View className="mt-4">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        snapToInterval={imageWidth + SPACING}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingLeft: sideInsets,
          paddingRight: sideInsets - SPACING,
        }}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        scrollEventThrottle={16}
      >
        {sortedKeywordsData.map((item, index) => (
          <TouchableOpacity
            key={index}
            className="rounded-lg overflow-hidden bg-white shadow"
            style={{
              width: imageWidth,
              marginRight: SPACING,
            }}
            onPress={() => handlePress(item.url)}
          >
            <Image
              source={
                item.thumbnail ? { uri: item.thumbnail } : defaultWikiImage
              }
              style={{ width: imageWidth, height: imageHeight }}
              className="rounded-t-lg"
            />
            <View className="p-3">
              <Text className="font-bold text-lg mb-1">{item.title}</Text>
              <Text className="text-gray-600" numberOfLines={2}>
                {item.extract}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default WikiImageCarousel;
