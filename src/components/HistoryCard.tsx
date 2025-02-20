import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { HistoryItem } from '../types/user';

interface Props {
  item: HistoryItem;
  onPress: (item: HistoryItem) => void;
}

export const HistoryCard = ({ item, onPress }: Props) => {
  return (
    <TouchableOpacity 
      className="bg-white rounded-lg overflow-hidden shadow-sm mb-2 mx-2"
      onPress={() => onPress(item)}
    >
      <Image
        source={item.thumbnail ? { uri: item.thumbnail } : require('../../assets/default_blank.jpg')}
        className="w-full h-28"
        resizeMode="cover"
      />
      <View className="p-3">
        <View className="flex-row items-center flex-wrap gap-1">
          {item.location && (
            <Text className="text-xs text-gray-500">
              📍 {item.location}
            </Text>
          )}
          {item.modifier && (
            <Text className="text-xs text-gray-500">
              • {item.modifier}
            </Text>
          )}
        </View>
        <Text 
          numberOfLines={2} 
          className="text-sm"
        >
          {item.response.replace(/\*\*/g, '')}
        </Text>
        <Text className="text-xs text-gray-400 mt-1">
          {item.timestamp.toDate().toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}; 