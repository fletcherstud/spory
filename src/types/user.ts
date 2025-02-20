export interface HistoryItem {
  response: string;      // cleaned response for display
  thumbnail: string | null;
  timestamp: FirebaseFirestore.Timestamp;
  location?: string;
  modifier?: string;
}

export interface User {
  id: string;
  email: string | null;
  fullName: string | null;
  isPremium: boolean;
  lastLogoutAt?: FirebaseFirestore.Timestamp;
  history?: HistoryItem[];
} 