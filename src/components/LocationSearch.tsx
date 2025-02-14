import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Modal } from 'react-native';
import { searchLocations } from '../services/RadarService';
import { RadarAddress } from '../types/radar';
import debounce from 'lodash/debounce';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSelectLocation: (location: RadarAddress) => void;
}

export const LocationSearch = ({ isVisible, onClose, onSelectLocation }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<RadarAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatAddress = (address: RadarAddress) => {
    const mainText = address.placeLabel || address.city || address.formattedAddress;
    const subText = `${address.stateCode || ''} ${address.countryCode || ''}`.trim();
    return {
      mainText,
      subText,
      flag: address.countryFlag
    };
  };

  const searchDebounced = React.useCallback(
    debounce(async (query: string) => {
      if (!query) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      console.log('Searching for locations:', query);
      try {
        const response = await searchLocations({
          query,
          limit: 5,
          layers: 'locality'
        });
        setResults(response.addresses);
      } catch (error) {
        console.error('Error searching locations:', error);
      } finally {
        setIsLoading(false);
      }
    }, 1000),
    []
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-white p-4">
        <View className="flex-row justify-between items-center mb-4">
            <View className='flex-row items-center gap-2'>
                <Text className="text-xl font-bold">Set Location</Text>
                <TouchableOpacity onPress={() => onSelectLocation(null)}>
                <Text className="text-sm text-gray-500">Clear Location</Text>
                </TouchableOpacity>
            </View>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-2xl">✕</Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          className="bg-gray-100 p-4 rounded-lg mb-4"
          placeholder="Search for a location..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchDebounced(text);
          }}
        />

        <FlatList
          data={results}
          keyExtractor={(item) => item.formattedAddress}
          renderItem={({ item }) => {
            const { mainText, subText, flag } = formatAddress(item);
            return (
              <TouchableOpacity 
                className="p-4 border-b border-gray-200"
                onPress={() => {
                  onSelectLocation(item);
                }}
              >
                <View className="flex-row items-center">
                  <Text className="text-xl mr-2">{flag}</Text>
                  <View>
                    <Text className="font-medium">{mainText}</Text>
                    {subText && <Text className="text-gray-500 text-sm">{subText}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <Text className="text-center text-gray-500">
              {isLoading ? 'Searching...' : 'No results found'}
            </Text>
          )}
        />
      </View>
    </Modal>
  );
}; 