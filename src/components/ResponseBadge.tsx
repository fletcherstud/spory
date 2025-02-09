import { View, Text } from "react-native";
import React from "react";

interface ResponseBadgeProps {
  icon: string;
  title: string;
}

const ResponseBadge = ({ icon, title }: ResponseBadgeProps) => {
  return (
    <View className="flex-row items-center bg-gray-100 rounded-full px-3 py-1">
      <Text>{icon}</Text>
      <Text className="ml-1">{title}</Text>
    </View>
  );
};

export default ResponseBadge;
