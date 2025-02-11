import { db } from '../config';
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  getDocs, 
  addDoc,
  serverTimestamp,
  limit 
} from 'firebase/firestore';

export interface User {
  id: string;
  email: string | null;
  fullName?: string;
  isPremium: boolean;
  appleUserId: string;
  createdAt: Date;
}

export const userService = {
  // Create or update user profile
  async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    await setDoc(doc(db, 'users', userId), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  // Get user profile by Apple User ID
  async getUserByAppleId(appleUserId: string): Promise<User | null> {
    const q = query(
      collection(db, 'users'),
      where('appleUserId', '==', appleUserId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  },

  // Create initial user profile after Apple sign in
  async createUserFromAppleSignIn(
    appleUserId: string, 
    email: string | null, 
    fullName?: string
  ): Promise<User> {
    const userData = {
      appleUserId,
      email,
      fullName,
      isPremium: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'users'), userData);

    return {
      id: docRef.id,
      ...userData
    } as User;
  }
}; 