import React, { createContext, useState, useContext, useEffect } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import Purchases from "react-native-purchases";

interface User {
  id: string;
  email: string | null;
  fullName: string | null;
  isPremium: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  checkPremiumStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth state on app launch
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const credentialState = await AppleAuthentication.getCredentialStateAsync(
        user?.id || ""
      );

      if (
        credentialState ===
        AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED
      ) {
        // User is still authenticated
        const isPremium = await checkPremiumStatus();
        if (user) {
          setUser({ ...user, isPremium });
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log(credential);

      // Create a new user object
      const newUser = {
        id: credential.user,
        email: credential.email,
        fullName: credential.fullName
          ? `${credential.fullName.givenName} ${credential.fullName.familyName}`
          : null,
        isPremium: false,
      };

      // Log in to RevenueCat with the user ID
      await Purchases.logIn(credential.user);

      // Check premium status
      newUser.isPremium = await checkPremiumStatus();

      setUser(newUser);
    } catch (error) {
      if (error.code === "ERR_CANCELED") {
        // Handle user cancellation
        return;
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await Purchases.logOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.entitlements.active["premium"] !== undefined;
    } catch (error) {
      console.error("Error checking premium status:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signInWithApple,
        signOut,
        checkPremiumStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
