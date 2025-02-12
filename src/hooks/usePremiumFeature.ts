import { useAuth } from "../contexts/AuthContext";
import { Alert } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";

export const usePremiumFeature = () => {
  const { user, signInWithApple } = useAuth();

  const attemptPremiumFeature = async (
    onSuccess: () => void | Promise<void>
  ): Promise<void> => {
    // If user is not signed in, prompt for sign in
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Sign in with Apple to access premium features!",
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
                // After sign in, check if they're premium
                const customerInfo = await Purchases.getCustomerInfo();
                const isPremium = customerInfo.entitlements.active["Pro"]?.isActive;

                if (!isPremium) {
                  // If not premium, show paywall
                  const offerings = await Purchases.getOfferings();
                  if (offerings.current?.availablePackages.length) {
                    await RevenueCatUI.presentPaywall();
                  }
                } else {
                  // If premium, proceed with the action
                  await onSuccess();
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

    // If user is signed in but not premium, show paywall
    if (!user.isPremium) {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current?.availablePackages.length) {
          await RevenueCatUI.presentPaywall();
        }
      } catch (e: any) {
        console.error("Error showing paywall:", e?.message || e);
        Alert.alert(
          "Uh Oh!",
          "We had trouble showing the paywall. Please try again later.",
          [
            {
              text: "OK",
              onPress: () => {},
            },
          ]
        );
      }
      return;
    }

    // If user is signed in and premium, proceed with the action
    await onSuccess();
  };

  const canAccessPremiumFeature = (): boolean => {
    return user?.isPremium ?? false;
  };

  return { attemptPremiumFeature, canAccessPremiumFeature };
}; 