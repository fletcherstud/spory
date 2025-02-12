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
  isSigningIn: boolean;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  checkPremiumStatus: () => Promise<boolean>;
  setIsSigningIn: (value: boolean) => void;
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
      await Purchases.logIn(firebaseUser.uid);
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
        isSigningIn,
        signInWithApple,
        signOut,
        checkPremiumStatus,
        setIsSigningIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
