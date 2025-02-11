import { db } from '../config';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  getDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';

export interface ChatEntry {
  id: string;
  text: string;
  keywordsData: string[];
  timestamp: Date;
  userId: string;
}

export const chatService = {
  // Save a new chat entry
  async saveChatEntry(userId: string, text: string, keywordsData: string[]): Promise<string> {
    const chatRef = await addDoc(collection(db, 'chatHistory'), {
      userId,
      text,
      keywordsData,
      timestamp: serverTimestamp(),
    });
    
    return chatRef.id;
  },

  // Get user's chat history
  async getUserHistory(userId: string): Promise<ChatEntry[]> {
    const q = query(
      collection(db, 'chatHistory'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatEntry));
  },

  // Get specific chat entry
  async getChatEntry(entryId: string): Promise<ChatEntry | null> {
    const docRef = doc(db, 'chatHistory', entryId);
    const docSnap = await getDoc(docRef);
    
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ChatEntry : null;
  }
}; 