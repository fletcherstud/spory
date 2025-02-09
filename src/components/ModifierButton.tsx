import { View, Text, TouchableOpacity } from "react-native";
import React from "react";

interface ModifierButtonProps {
  icon: string;
  title: string;
  isSelected: boolean;
  onPress: () => void;
}

export default function ModifierButton({
  icon,
  title,
  isSelected,
  onPress,
}: ModifierButtonProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View
        className={`flex-row items-center gap-1 px-3 py-2 rounded-full ${
          isSelected
            ? "bg-black border border-black"
            : "bg-white border border-black"
        }`}
      >
        <Text>{icon}</Text>
        <Text
          className={`font-medium ${isSelected ? "text-white" : "text-black"}`}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
