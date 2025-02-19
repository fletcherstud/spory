import React from 'react';
import { View, Text, Modal, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isVisible, onClose }: SettingsModalProps) => {
  const { signOut, deleteAccount } = useAuth();

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              onClose();
            } catch (error) {
              Alert.alert("Error", "Failed to delete account. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            onClose();
          }
        }
      ]
    );
  };

  return (
    <Modal
    visible={isVisible}
    animationType="slide"
    presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.link}
            onPress={() => Linking.openURL('https://sites.google.com/view/spory-ai/terms-of-service')}
          >
            <Text style={styles.linkText}>Terms of Use</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.link}
            onPress={() => Linking.openURL('https://sites.google.com/view/spory-ai/privacy-policy')}
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  link: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
  },
  deleteButton: {
    marginTop: 32,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
  },
  deleteButtonText: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  signOutButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
}); 