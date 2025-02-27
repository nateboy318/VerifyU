import React, { createContext, useContext, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

interface NoGoListContextType {
  noGoList: string[];
  importNoGoList: () => Promise<void>;
  isOnNoGoList: (name: string) => boolean;
  clearNoGoList: () => void;
}

const NoGoListContext = createContext<NoGoListContextType | undefined>(undefined);

export const NoGoListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [noGoList, setNoGoList] = useState<string[]>([]);

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
      
      // Split the CSV content into lines and clean up each name
      const names = fileContent
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      setNoGoList(names);
      
      Alert.alert(
        'Success',
        `Imported ${names.length} names to the no-go list`
      );
    } catch (error) {
      console.error('Error importing no-go list:', error);
      Alert.alert('Error', 'Failed to import no-go list');
    }
  };

  const isOnNoGoList = (name: string): boolean => {
    const normalizedName = name.trim().toLowerCase();
    return noGoList.some(noGoName => 
      noGoName.toLowerCase() === normalizedName
    );
  };

  const clearNoGoList = () => {
    setNoGoList([]);
  };

  return (
    <NoGoListContext.Provider value={{
      noGoList,
      importNoGoList,
      isOnNoGoList,
      clearNoGoList,
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