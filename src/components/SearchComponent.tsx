import { View, Text, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import ModifierButton from "./ModifierButton";
import Animated from "react-native-reanimated";

const modifiers = [
  { icon: "😄", title: "Funny Fact" },
  { icon: "🤯", title: "Crazy Fact" },
  { icon: "🎲", title: "Random Fact" },
  { icon: "💡", title: "Interesting Fact" },
  { icon: "🔮", title: "Mysterious Fact" },
];

interface SearchComponentProps {
  getLocationAndHistory: (modifier: string) => void;
  isLoading: boolean;
  buttonTitle: string;
}

const SearchComponent = ({
  getLocationAndHistory,
  isLoading,
  buttonTitle,
}: SearchComponentProps) => {
  const [selectedModifier, setSelectedModifier] = useState<string | null>(null);
  return (
    <View>
      {/* Modifier section - now positioned at bottom */}
      <View className="px-2">
        <Text className="text-lg font-semibold mb-2">Try another version:</Text>
        <View className="flex-row flex-wrap gap-1 gap-y-4">
          {modifiers.map((modifier) => (
            <ModifierButton
              key={modifier.title}
              icon={modifier.icon}
              title={modifier.title}
              isSelected={selectedModifier === modifier.title}
              onPress={() =>
                setSelectedModifier(
                  selectedModifier === modifier.title ? null : modifier.title
                )
              }
            />
          ))}
        </View>

        <Animated.View className="mt-4">
          <TouchableOpacity
            className="mt-auto px-8 py-4 rounded-full text-center items-center bg-black border border-white"
            onPress={() => getLocationAndHistory(selectedModifier)}
            disabled={isLoading}
          >
            <Text className="text-white font-bold text-lg">
              {selectedModifier ? `Get a ${selectedModifier}` : buttonTitle}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

export default SearchComponent;
