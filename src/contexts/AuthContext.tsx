import React, { createContext, useState, useContext, useEffect } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import Purchases from "react-native-purchases";
import { getFirestore } from "firebase/firestore";
import { doc, setDoc, getDoc } from "firebase/firestore";
import app from "../firebase/config";

interface User {
  id: string;
  email: string | null;
  fullName: string | null;
  isPremium: boolean;
  lastLogoutAt?: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  checkPremiumStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const db = getFirestore(app);

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
          const updatedUser = { ...user, isPremium };
          setUser(updatedUser);
          await updateUserInFirestore(updatedUser);
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

  const updateUserInFirestore = async (userData: User) => {
    try {
      const userRef = doc(db, "users", userData.id);
      await setDoc(
        userRef,
        {
          email: userData.email,
          fullName: userData.fullName,
          isPremium: userData.isPremium,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating user in Firestore:", error);
    }
  };

  const createUserInFirestore = async (userData: User) => {
    try {
      const userRef = doc(db, "users", userData.id);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userRef, {
          email: userData.email,
          fullName: userData.fullName,
          isPremium: userData.isPremium,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Update existing user's login time
        await updateUserInFirestore(userData);
      }
    } catch (error) {
      console.error("Error creating user in Firestore:", error);
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

      // Log successful Apple authentication
      console.log("Apple authentication successful", credential.user);

      // Try to get existing user data from Firestore
      const userRef = doc(db, "users", credential.user);
      try {
        const userDoc = await getDoc(userRef);
        console.log("Firestore read successful", userDoc.exists());

        let fullName = null;
        if (userDoc.exists()) {
          // If user exists, preserve their existing fullName
          fullName = userDoc.data().fullName;
        } else if (credential.fullName) {
          // Only use credential.fullName for new users
          fullName = `${credential.fullName.givenName} ${credential.fullName.familyName}`;
        }

        const newUser = {
          id: credential.user,
          email:
            credential.email ||
            (userDoc.exists() ? userDoc.data().email : null),
          fullName,
          isPremium: false,
        };

        // Log in to RevenueCat with the user ID
        try {
          await Purchases.logIn(credential.user);
          console.log("RevenueCat login successful");

          // Check premium status
          newUser.isPremium = await checkPremiumStatus();

          // Create/update user in Firestore
          await createUserInFirestore(newUser);
          console.log("User created/updated in Firestore");

          setUser(newUser);
        } catch (revenueCatError) {
          console.error("RevenueCat error:", revenueCatError);
          throw revenueCatError;
        }
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        throw firestoreError;
      }
    } catch (error) {
      if (error.code === "ERR_CANCELED") {
        console.log("User cancelled Apple sign in");
        return;
      }
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        await updateUserInFirestore({
          ...user,
          lastLogoutAt: new Date(),
        });
      }
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
