import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import RevenueCatUI from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';
import { Alert, AppState } from 'react-native';

const DAILY_FACT_LIMIT = 5;
const FACT_COUNT_KEY = '@fact_count';
const LAST_RESET_KEY = '@last_reset_date';

export const useFactLimit = () => {
  const { user, signInWithApple } = useAuth();
  const [factCount, setFactCount] = useState(0);

  // Check and update fact count when app becomes active
  useEffect(() => {
    const checkAndUpdateFactCount = async () => {
      await loadFactCount();
    };

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        await checkAndUpdateFactCount();
      }
    });

    // Initial check
    checkAndUpdateFactCount();

    return () => {
      subscription.remove();
    };
  }, []);

  const loadFactCount = async () => {
    try {
      const lastResetStr = await AsyncStorage.getItem(LAST_RESET_KEY);
      const lastReset = lastResetStr ? new Date(lastResetStr) : null;
      const today = new Date();

      // Reset count if it's a new day or no last reset
      if (!lastReset || !isSameDay(lastReset, today)) {
        await AsyncStorage.setItem(FACT_COUNT_KEY, '0');
        await AsyncStorage.setItem(LAST_RESET_KEY, today.toISOString());
        setFactCount(0);
      } else {
        const count = await AsyncStorage.getItem(FACT_COUNT_KEY);
        setFactCount(count ? parseInt(count) : 0);
      }
    } catch (error) {
      console.error('Error loading fact count:', error);
    }
  };

  const incrementFactCount = async () => {
    try {
      // Don't increment count for premium users
      if (user?.isPremium) {
        return;
      }

      const newCount = factCount + 1;
      await AsyncStorage.setItem(FACT_COUNT_KEY, newCount.toString());
      setFactCount(newCount);
    } catch (error) {
      console.error('Error incrementing fact count:', error);
    }
  };

  const canGetFact = async (): Promise<boolean> => {
    // Premium users have unlimited facts
    if (user?.isPremium) {
      return true;
    }

    await loadFactCount(); // Refresh count and check for day reset

    // Free users are limited
    if (factCount >= DAILY_FACT_LIMIT) {
      if (!user) {
        // If not signed in, prompt for sign in
        Alert.alert(
          "Sign In & Pro Required",
          "Sign in with Apple to get more facts!",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Sign In",
              onPress: signInWithApple,
            },
          ]
        );
        return false;
      }

      // If signed in but not premium, show paywall
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current?.availablePackages.length) {
          await RevenueCatUI.presentPaywall();
        }
      } catch (error) {
        console.error('Error showing paywall:', error);
      }
      return false;
    }

    return true;
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  return {
    factCount,
    canGetFact,
    incrementFactCount,
    remainingFacts: Math.max(0, DAILY_FACT_LIMIT - factCount),
  };
}; 