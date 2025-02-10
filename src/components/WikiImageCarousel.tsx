import React from "react";
import {
  View,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  Dimensions,
  Linking,
} from "react-native";

interface WikiImageCarouselProps {
  keywordsData: Array<{
    keyword: string;
    thumbnail: string | null;
    title: string;
    extract: string;
    url: string | null;
  }>;
}

const WikiImageCarousel: React.FC<WikiImageCarouselProps> = ({
  keywordsData,
}) => {
  const windowWidth = Dimensions.get("window").width;
  const imageWidth = windowWidth * 0.8;
  const imageHeight = imageWidth * 0.6;
  const SPACING = 16;

  // Calculate the padding needed to center the first and last items
  const sideInsets = (windowWidth - imageWidth - SPACING) / 2;

  return (
    <View className="mt-4">
      <ScrollView
        horizontal
        pagingEnabled
        snapToInterval={imageWidth + SPACING}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingLeft: sideInsets,
          paddingRight: sideInsets - SPACING, // Adjust right padding to account for last item spacing
        }}
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
