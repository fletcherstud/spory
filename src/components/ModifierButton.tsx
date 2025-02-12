import { View, Text, TouchableOpacity } from "react-native";
import React from "react";

interface ModifierButtonProps {
  icon: string;
  title: string;
  isSelected: boolean;
  onPress: () => void;
  isPremium?: boolean;
  isLocked?: boolean;
}

const ModifierButton = ({
  icon,
  title,
  isSelected,
  onPress,
  isPremium = false,
  isLocked = false,
}: ModifierButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full border flex-row items-center ${
        isSelected ? "bg-black" : "bg-white"
      } ${isLocked ? "opacity-50" : ""}`}
    >
      <Text className="text-base mr-1.5">{icon}</Text>
      <Text
        className={`${
          isSelected ? "text-white" : "text-black"
        } text-sm font-medium`}
      >
        {title} {isPremium && "✨"}
      </Text>
      {isLocked && <Text className="ml-1.5 text-sm">🔒</Text>}
    </TouchableOpacity>
  );
};

export default ModifierButton;
