import React, { useState } from 'react';
import { View, Text, FlatList, Dimensions } from 'react-native';
import { HistoryItem } from '../types/user';
import { HistoryCard } from './HistoryCard';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  history?: HistoryItem[];
  onPress: (item: HistoryItem) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7; // Card takes up 70% of screen width

export const HistoryCarousel = ({ history, onPress }: Props) => {
  const { loadMoreHistory } = useAuth();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  if (!history?.length) {
    return (
      <View className="mx-4 my-6">
        <View className="bg-gray-100 rounded-lg p-4">
          <Text className="text-gray-500 text-center">No history yet</Text>
        </View>
      </View>
    );
  }

  const handleEndReached = async () => {
    console.log("handleEndReached");
    if (!isLoadingMore) {
      setIsLoadingMore(true);
      await loadMoreHistory();
      setIsLoadingMore(false);
    }
  };

  const sortedHistory = [...history].sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

  return (
    <View className="">
      <Text className="text-lg font-semibold mb-2 mx-4">History</Text>
      <FlatList
        data={sortedHistory}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: width * 0.15 }} // Add padding to show part of next card
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH }}>
            <HistoryCard item={item} onPress={onPress} />
          </View>
        )}
        keyExtractor={(item) => item.timestamp.toString()}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}; 