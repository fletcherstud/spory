import { Text } from "react-native";
import React from "react";

interface FactsLeftTextProps {
  remainingFacts: number;
  isPremium?: boolean;
}

const FactsLeftText = ({ remainingFacts, isPremium }: FactsLeftTextProps) => {
  if (isPremium) {
    return <Text className="text-xs text-gray-500">Pro</Text>;
  }

  return (
    <Text
      className={`text-xs ${
        remainingFacts === 0 ? "text-red-500" : "text-gray-500"
      }`}
    >
      {remainingFacts} facts left today
    </Text>
  );
};

export default FactsLeftText;
