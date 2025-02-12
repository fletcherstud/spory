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
import { AppState, Alert } from "react-native";

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
  isSigningIn: boolean;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  checkPremiumStatus: () => Promise<boolean>;
  setIsSigningIn: (value: boolean) => void;
  syncPurchases: () => Promise<boolean>;
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
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Function to update user's premium status
  const updatePremiumStatus = async () => {
    if (user) {
      console.log("Updating premium status for user:", user.id);

      const isPremium = await checkPremiumStatus();
      console.log(
        "New premium status:",
        isPremium,
        "Current status:",
        user.isPremium
      );

      if (isPremium !== user.isPremium) {
        console.log("Premium status changed, updating user...");
        setUser((prevUser) => ({
          ...prevUser!,
          isPremium,
        }));
        // Update Firestore with new premium status
        await updateUserInFirestore({
          ...user,
          isPremium,
        });
        return true;
      }
    }
    return false;
  };

  // Set up RevenueCat listeners
  useEffect(() => {
    const customerInfoUpdateListener = async (customerInfo: any) => {
      console.log("Purchase status updated:", customerInfo);
      await updatePremiumStatus();
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);

    // Cleanup listener on unmount
    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoUpdateListener);
    };
  }, [user]); // Add user as dependency since updatePremiumStatus uses it

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active") {
          // Update premium status when app becomes active
          await updatePremiumStatus();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [user]);

  useEffect(() => {
    // Start syncing with Firebase
    setIsSigningIn(true);
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isPremium = await checkPremiumStatus();
            setUser({
              id: firebaseUser.uid,
              email: userData.email,
              fullName: userData.fullName,
              isPremium,
            });
          }
        } catch (error) {
          console.error("Error restoring user session:", error);
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setIsLoading(false);
      setIsSigningIn(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

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
      const userDoc = await getDoc(userRef);
      let fullName = null;

      if (userDoc.exists()) {
        fullName = userDoc.data().fullName;
      } else if (credential.fullName) {
        const givenName = credential.fullName.givenName || "";
        const familyName = credential.fullName.familyName || "";
        fullName = [givenName, familyName].filter(Boolean).join(" ");
      }

      if (!fullName) {
        fullName = firebaseUser.email || null;
      }

      const newUser = {
        id: firebaseUser.uid,
        email: firebaseUser.email || credential.email || null,
        fullName,
        isPremium: false,
      };

      // Log in to RevenueCat with the Firebase UID
      console.log("Logging into RevenueCat with user ID:", firebaseUser.uid);
      await Purchases.logIn(firebaseUser.uid);

      await Purchases.setAttributes({
        email: newUser.email,
        name: newUser.fullName,
      });

      // Force a sync after login
      console.log("Forcing initial sync after login...");
      await Purchases.syncPurchases();

      newUser.isPremium = await checkPremiumStatus();
      await createUserInFirestore(newUser);
      console.log("User created/updated in Firestore");

      setUser(newUser);
    } catch (error) {
      if (error.code === "ERR_CANCELED") {
        console.log("User cancelled Apple sign in");
        return;
      }
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        console.log("Signing out user:", user.id);
        await updateUserInFirestore({
          ...user,
          lastLogoutAt: Timestamp.now(),
        });
      }

      // Log out of RevenueCat first
      console.log("Logging out of RevenueCat...");
      await Purchases.logOut();

      // Then sign out of Firebase
      console.log("Signing out of Firebase...");
      await firebaseSignOut(auth);

      setUser(null);
    } catch (error) {
      console.error("Error during sign out:", error);
      Alert.alert(
        "Sign Out Error",
        "There was an error signing out. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const checkPremiumStatus = async () => {
    try {
      // First sync with store to ensure latest status
      await Purchases.syncPurchases();

      // Get fresh customer info after sync
      const customerInfo = await Purchases.getCustomerInfo();
      console.log("Full customer info:", JSON.stringify(customerInfo, null, 2));

      if (customerInfo.entitlements.active["Pro"] !== undefined) {
        const proEntitlement = customerInfo.entitlements.active["Pro"];
        console.log("Pro entitlement details:", {
          isActive: proEntitlement.isActive,
          willRenew: proEntitlement.willRenew,
          periodType: proEntitlement.periodType,
          latestPurchaseDate: proEntitlement.latestPurchaseDate,
          originalPurchaseDate: proEntitlement.originalPurchaseDate,
          expirationDate: proEntitlement.expirationDate,
        });
        return proEntitlement.isActive;
      }
      console.log("No Pro entitlement found in customer info");
      return false;
    } catch (error) {
      console.error("Error checking premium status:", error);
      return false;
    }
  };

  // Add syncPurchases to the context interface
  const syncPurchases = async () => {
    try {
      console.log("Starting purchase sync...");

      // First ensure user is properly identified in RevenueCat
      if (user) {
        console.log("Ensuring user is identified in RevenueCat:", user.id);
        const currentUser = await Purchases.getCustomerInfo();
        console.log("Current RevenueCat user:", currentUser.originalAppUserId);

        // If the current RevenueCat user doesn't match our user, log them in again
        if (currentUser.originalAppUserId !== user.id) {
          console.log("RevenueCat user mismatch, logging in again...");
          await Purchases.logIn(user.id);
          await Purchases.setAttributes({
            email: user.email,
            name: user.fullName,
          });
        }
      }

      // Sync purchases with store
      console.log("Syncing purchases with store...");
      await Purchases.syncPurchases();

      // Get latest customer info
      const customerInfo = await Purchases.getCustomerInfo();
      console.log(
        "Post-sync customer info:",
        JSON.stringify(customerInfo, null, 2)
      );

      // Update premium status
      const wasUpdated = await updatePremiumStatus();
      console.log("Premium status updated:", wasUpdated);

      return wasUpdated;
    } catch (error) {
      console.error("Error during purchase sync:", error);
      Alert.alert(
        "Sync Error",
        "There was an error syncing your purchases. Please try again.",
        [{ text: "OK" }]
      );
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSigningIn,
        signInWithApple,
        signOut,
        checkPremiumStatus,
        setIsSigningIn,
        syncPurchases,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
