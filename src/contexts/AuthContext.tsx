import React, { createContext, useState, useContext, useEffect } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import Purchases from "react-native-purchases";
import { getFirestore, Timestamp } from "firebase/firestore";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  getAuth,
  signInWithCredential,
  OAuthProvider,
  signOut as firebaseSignOut,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import app from "../firebase/config";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  email: string | null;
  fullName: string | null;
  isPremium: boolean;
  lastLogoutAt?: Timestamp;
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
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

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
          email: userData.email || null,
          fullName: userData.fullName || null,
          isPremium: userData.isPremium,
          lastLoginAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
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
          email: userData.email || null,
          fullName: userData.fullName || null,
          isPremium: userData.isPremium,
          createdAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
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
      // 1. Sign in with Apple
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // 2. Create a Firebase OAuth provider and credential
      const provider = new OAuthProvider("apple.com");
      const firebaseCredential = provider.credential({
        idToken: credential.identityToken!,
      });

      // 3. Sign in to Firebase with the Apple credential
      const firebaseUserCredential = await signInWithCredential(
        auth,
        firebaseCredential
      );
      const firebaseUser = firebaseUserCredential.user;

      console.log("Firebase authentication successful", firebaseUser.uid);

      // Try to get existing user data from Firestore
      const userRef = doc(db, "users", firebaseUser.uid);
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
          id: firebaseUser.uid, // Use Firebase UID instead of Apple user ID
          email: firebaseUser.email || credential.email || null,
          fullName,
          isPremium: false,
        };

        // Log in to RevenueCat with the Firebase UID
        try {
          await Purchases.logIn(firebaseUser.uid);
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
          lastLogoutAt: Timestamp.now(),
        });
      }
      await Purchases.logOut();
      await firebaseSignOut(auth);
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
