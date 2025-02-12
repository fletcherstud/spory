import { View, Text, TouchableOpacity, Dimensions, Alert } from "react-native";
import React, { useState } from "react";
import ModifierButton from "./ModifierButton";
import Animated, { FadeIn } from "react-native-reanimated";
import { useAuth } from "../contexts/AuthContext";
import { ScrollView } from "react-native-gesture-handler";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";

interface Modifier {
  icon: string;
  title: string;
  premium?: boolean;
}

const freeModifiers: Modifier[] = [
  { icon: "😄", title: "Funny Fact", premium: false },
  { icon: "🎲", title: "Random Fact", premium: false },
  { icon: "💡", title: "Interesting Fact", premium: false },
];

const premiumModifiers: Modifier[] = [
  { icon: "🤯", title: "Crazy Fact", premium: true },
  { icon: "🔮", title: "Mysterious Fact", premium: true },
  { icon: "👻", title: "Spooky Fact", premium: true },
  { icon: "🌳", title: "Nature Fact", premium: true },
];

const { width } = Dimensions.get("window");

interface SearchComponentProps {
  getLocationAndHistory: (modifier: Modifier | null) => void;
  isLoading: boolean;
  buttonTitle: string;
}

const SearchComponent = ({
  getLocationAndHistory,
  isLoading,
  buttonTitle,
}: SearchComponentProps) => {
  const [selectedModifier, setSelectedModifier] = useState<Modifier | null>(
    null
  );
  const { user, signInWithApple } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);

  const handleScroll = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  const handleModifierPress = async (modifier: Modifier) => {
    if (modifier.premium) {
      if (!user) {
        Alert.alert(
          "Sign In Required",
          "Please sign in with Apple to access premium features.",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Sign In",
              onPress: async () => {
                try {
                  await signInWithApple();
                  // After successful sign in, show the paywall if user is not premium
                  if (!user?.isPremium) {
                    const offerings = await Purchases.getOfferings();
                    if (offerings.current?.availablePackages.length) {
                      await RevenueCatUI.presentPaywall();
                    }
                  }
                } catch (error) {
                  console.error("Error during sign in:", error);
                }
              },
            },
          ]
        );
        return;
      }

      if (!user.isPremium) {
        try {
          const offerings = await Purchases.getOfferings();
          if (offerings.current?.availablePackages.length) {
            await RevenueCatUI.presentPaywall();
          }
        } catch (e: any) {
          console.error("Error showing paywall:", e?.message || e);
        }
        return;
      }
    }

    setSelectedModifier(modifier);
  };

  return (
    <View>
      <View className="px-4">
        <Text className="text-lg font-semibold mb-2">Try another version:</Text>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View
            style={{ width: width - 32 }}
            className="flex-row flex-wrap gap-2"
          >
            {freeModifiers.map((modifier) => (
              <ModifierButton
                key={modifier.title}
                icon={modifier.icon}
                title={modifier.title}
                isSelected={selectedModifier?.title === modifier.title}
                onPress={() => handleModifierPress(modifier)}
              />
            ))}
          </View>
          <View
            style={{ width: width - 32 }}
            className="flex-row flex-wrap gap-2"
          >
            {premiumModifiers.map((modifier) => (
              <ModifierButton
                key={modifier.title}
                icon={modifier.icon}
                title={modifier.title}
                isSelected={selectedModifier?.title === modifier.title}
                onPress={() => handleModifierPress(modifier)}
                isPremium={true}
                isLocked={!user?.isPremium}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* <View className="absolute bottom-8 left-0 right-0 flex-row justify-center">
        <View className="flex-row gap-1">
          <View
            className={`h-1.5 w-1.5 rounded-full ${
              currentPage === 0 ? "bg-black" : "bg-gray-300"
            }`}
          />
          <View
            className={`h-1.5 w-1.5 rounded-full ${
              currentPage === 1 ? "bg-black" : "bg-gray-300"
            }`}
          />
        </View>
      </View> */}
      <View className="items-center">
        <TouchableOpacity
          className="px-8 py-4 mt-5 rounded-full text-center items-center bg-black border mb-8 w-11/12"
          onPress={() => getLocationAndHistory(selectedModifier)}
          disabled={isLoading}
        >
          <Text className="text-white font-bold text-lg">
            {selectedModifier ? `Get a ${selectedModifier.title}` : buttonTitle}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SearchComponent;
