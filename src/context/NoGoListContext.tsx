import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

interface NoGoListContextType {
  noGoList: string[];
  importNoGoList: () => Promise<void>;
  isOnNoGoList: (name: string) => boolean;
  clearNoGoList: () => void;
  updateNoGoList: (updatedList: string[]) => void;
}

const NoGoListContext = createContext<NoGoListContextType | undefined>(undefined);

export const NoGoListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [noGoList, setNoGoList] = useState<string[]>([]);

  useEffect(() => {
    const loadNoGoList = async () => {
      const storedList = await AsyncStorage.getItem('noGoList');
      if (storedList) {
        setNoGoList(JSON.parse(storedList));
      }
    };
    loadNoGoList();
  }, []);

  const importNoGoList = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const names = fileContent.split('\n').map(name => name.trim()).filter(name => name.length > 0);
      setNoGoList(names);
      await AsyncStorage.setItem('noGoList', JSON.stringify(names));

      Alert.alert('Success', `Imported ${names.length} names to the no-go list`);
    } catch (error) {
      console.error('Error importing no-go list:', error);
      Alert.alert('Error', 'Failed to import no-go list');
    }
  };

  const isOnNoGoList = (name: string): boolean => {
    const normalizedName = name.trim().toLowerCase();
    return noGoList.some(noGoName => noGoName.toLowerCase() === normalizedName);
  };

  const clearNoGoList = async () => {
    setNoGoList([]);
    await AsyncStorage.removeItem('noGoList');
  };

  const updateNoGoList = async (updatedList: string[]) => {
    setNoGoList(updatedList);
    await AsyncStorage.setItem('noGoList', JSON.stringify(updatedList));
  };

  return (
    <NoGoListContext.Provider value={{
      noGoList,
      importNoGoList,
      isOnNoGoList,
      clearNoGoList,
      updateNoGoList,
    }}>
      {children}
    </NoGoListContext.Provider>
  );
};

export const useNoGoList = () => {
  const context = useContext(NoGoListContext);
  if (context === undefined) {
    throw new Error('useNoGoList must be used within a NoGoListProvider');
  }
  return context;
}; 