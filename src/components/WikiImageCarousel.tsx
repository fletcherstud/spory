import React, { useState, useRef } from "react";
import {
  View,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  Dimensions,
  Linking,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";

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

  React.useEffect(() => {
    if (scrollToKeyword) {
      const index = keywordsData.findIndex(
        (item) => item.keyword === scrollToKeyword && item.thumbnail
      );
      if (index !== -1) {
        const xOffset = index * (imageWidth + SPACING);
        scrollViewRef.current?.scrollTo({ x: xOffset, animated: true });
      }
    }
  }, [scrollToKeyword]);

  const updateCenteredItem = (scrollPosition: number) => {
    const itemWidth = imageWidth + SPACING;
    const centerIndex = Math.round((scrollPosition - sideInsets) / itemWidth);

    // Find the first valid item with a thumbnail at or after centerIndex
    let validIndex = centerIndex;
    while (
      validIndex < keywordsData.length &&
      !keywordsData[validIndex].thumbnail
    ) {
      validIndex++;
    }
    // If we went past the end, try going backwards
    if (validIndex >= keywordsData.length) {
      validIndex = centerIndex;
      while (validIndex >= 0 && !keywordsData[validIndex].thumbnail) {
        validIndex--;
      }
    }

    if (
      validIndex >= 0 &&
      validIndex < keywordsData.length &&
      keywordsData[validIndex].thumbnail
    ) {
      onCenterItemChange?.(keywordsData[validIndex].keyword);
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
        {keywordsData.map(
          (item, index) =>
            item.thumbnail && (
              <TouchableOpacity
                key={index}
                className="rounded-lg overflow-hidden bg-white shadow"
                style={{
                  width: imageWidth,
                  marginRight: SPACING,
                }}
                onPress={() => item.url && Linking.openURL(item.url)}
              >
                <Image
                  source={{ uri: item.thumbnail }}
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
            )
        )}
      </ScrollView>
    </View>
  );
};

export default WikiImageCarousel;
