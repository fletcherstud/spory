import React, { createContext, useState, useContext, useEffect } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import Purchases from "react-native-purchases";
import { 
  getFirestore, 
  Timestamp, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter, 
  deleteDoc, 
  doc,
  getDoc,
  setDoc 
} from "firebase/firestore";
import {
  signInWithCredential,
  OAuthProvider,
  signOut as firebaseSignOut,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import app from "../firebase/config";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Alert } from "react-native";
import { HistoryItem } from "../types/user";

interface User {
  id: string;
  email: string | null;
  fullName: string | null;
  isPremium: boolean;
  lastLogoutAt?: Timestamp;
  history?: HistoryItem[];
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  isSigningIn: boolean;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  checkPremiumStatus: () => Promise<boolean>;
  setIsSigningIn: (value: boolean) => void;
  syncPurchases: () => Promise<boolean>;
  loadMoreHistory: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
  const [hasAttemptedRestore, setHasAttemptedRestore] = useState(false);
  const HISTORY_BATCH_SIZE = 2;
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);

  // Function to update user's premium status
  const updatePremiumStatus = async () => {
    if (user) {
      const isPremium = await checkPremiumStatus();

      if (isPremium !== user.isPremium) {
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

  // Remove the separate restore effect and combine with onAuthStateChanged
  useEffect(() => {
    setIsSigningIn(true);
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isPremium = await checkPremiumStatus();

            // Only load history for premium users
            let historyItems: HistoryItem[] = [];
            if (isPremium) {
              const historyRef = collection(db, 'users', firebaseUser.uid, 'history');
              const q = query(
                historyRef,
                orderBy('timestamp', 'desc'),
                limit(HISTORY_BATCH_SIZE)
              );
              
              const snapshot = await getDocs(q);
              historyItems = snapshot.docs.map(doc => doc.data() as HistoryItem);
            }
            
            setUser({
              id: firebaseUser.uid,
              email: userData.email,
              fullName: userData.fullName,
              isPremium,
              history: historyItems
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error restoring user session:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
        setIsSigningIn(false);
      }
    });

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
      
      // If user exists, preserve their history
      if (userDoc.exists()) {
        const existingData = userDoc.data();
        await setDoc(
          userRef,
          {
            email: userData.email || null,
            fullName: userData.fullName || null,
            isPremium: userData.isPremium,
            lastLoginAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            // Don't overwrite history if it exists
            ...(existingData.history && { history: existingData.history }),
          },
          { merge: true }
        );
      } else {
        // New user
        await setDoc(userRef, {
          email: userData.email || null,
          fullName: userData.fullName || null,
          isPremium: userData.isPremium,
          createdAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error("Error creating/updating user in Firestore:", error);
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

      // Log in to RevenueCat and sync purchases
      await Purchases.logIn(firebaseUser.uid);
      await Purchases.setAttributes({
        email: newUser.email,
        name: newUser.fullName,
      });
      await Purchases.syncPurchases();

      newUser.isPremium = await checkPremiumStatus();
      await createUserInFirestore(newUser);

      // Only load history for premium users
      let historyItems: HistoryItem[] = [];
      if (newUser.isPremium) {
        const historyRef = collection(db, 'users', firebaseUser.uid, 'history');
        const q = query(
          historyRef,
          orderBy('timestamp', 'desc'),
          limit(HISTORY_BATCH_SIZE)
        );
        
        const snapshot = await getDocs(q);
        historyItems = snapshot.docs.map(doc => doc.data() as HistoryItem);
      }

      // Set user with history
      setUser({
        ...newUser,
        history: historyItems
      });
      } catch (error) {
      if (error.code === "ERR_CANCELED") {
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

      setHasAttemptedRestore(false);
      
      await Purchases.logOut();

      await firebaseSignOut(auth);

      setLastVisibleDoc(null);
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
      // Only try to sync if we haven't already attempted
      if (!hasAttemptedRestore) {
        try {
          await Purchases.syncPurchases();
          setHasAttemptedRestore(true);
        } catch (error) {
          console.log("Failed to sync purchases:", error);
          // Don't throw here, continue to check customer info
        }
      }

      // Get customer info without forcing a sync
      const customerInfo = await Purchases.getCustomerInfo();

      if (customerInfo.entitlements.active["Pro"] !== undefined) {
        const proEntitlement = customerInfo.entitlements.active["Pro"];
        return proEntitlement.isActive;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Update the syncPurchases function
  const syncPurchases = async () => {
    try {
      // First ensure user is properly identified in RevenueCat
      if (user) {
        const currentUser = await Purchases.getCustomerInfo();
        // If the current RevenueCat user doesn't match our user, log them in again
        if (currentUser.originalAppUserId !== user.id) {
          await Purchases.logIn(user.id);
          await Purchases.logIn(user.id);
          await Purchases.setAttributes({
            email: user.email,
            name: user.fullName,
          });
        }
      }

      // Only try to sync if we haven't already attempted
      if (!hasAttemptedRestore) {
        try {
          await Purchases.syncPurchases();
          setHasAttemptedRestore(true);
        } catch (error) {
          console.log("Failed to sync purchases:", error);
          // Continue to get customer info
        }
      }
      // Update premium status
      const wasUpdated = await updatePremiumStatus();

      return wasUpdated;
    } catch (error) {
      console.error("Error during purchase sync:", error);
      return false;
    }
  };

  const loadMoreHistory = async () => {
    if (!user || !user.isPremium) return;

    try {
      const historyRef = collection(db, 'users', user.id, 'history');
      let q = query(
        historyRef,
        orderBy('timestamp', 'desc'),
        limit(HISTORY_BATCH_SIZE)
      );

      // If we have a last document, start after it
      if (lastVisibleDoc) {
        q = query(
          historyRef,
          orderBy('timestamp', 'desc'),
          startAfter(lastVisibleDoc),
          limit(HISTORY_BATCH_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      
      // If no more documents, return
      if (snapshot.empty) return;

      // Save the last visible document for next query
      setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);

      const newHistoryItems = snapshot.docs.map(doc => doc.data() as HistoryItem);

      setUser(prev => ({
        ...prev!,
        history: lastVisibleDoc 
          ? [...(prev?.history || []), ...newHistoryItems]
          : newHistoryItems
      }));
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) return;

      await setDoc(doc(db, 'deleted_accounts', user.id), {
        userId: user.id,
        isPremium: user.isPremium,
        deletedAt: Timestamp.now(),
      });

      // Rest of deletion logic
      await deleteDoc(doc(db, 'users', user.id));
      const historyRef = collection(db, 'users', user.id, 'history');
      const snapshot = await getDocs(historyRef);
      await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));

      await Purchases.logOut();
      await auth.currentUser?.delete();
      setUser(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        isSigningIn,
        signInWithApple,
        signOut,
        checkPremiumStatus,
        setIsSigningIn,
        syncPurchases,
        loadMoreHistory,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

