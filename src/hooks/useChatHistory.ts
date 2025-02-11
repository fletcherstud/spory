import { useState, useCallback } from 'react';
import { chatService, ChatEntry } from '../firebase/services/chatService';
import { useAuth } from '../contexts/AuthContext';

export function useChatHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatEntry[]>([]);

  const saveChat = useCallback(async (text: string, keywordsData: string[]) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      await chatService.saveChatEntry(user.id, text, keywordsData);
    } catch (error) {
      console.error('Error saving chat:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const userHistory = await chatService.getUserHistory(user.id);
      setHistory(userHistory);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    history,
    loading,
    saveChat,
    loadHistory
  };
} 