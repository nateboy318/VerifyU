import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNoGoList } from '../../context/NoGoListContext';
import { COLORS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export const NoGoListScreen = () => {
  const navigation = useNavigation();
  const { noGoList, updateNoGoList, clearNoGoList, importNoGoList } = useNoGoList();
  const [searchText, setSearchText] = useState('');
  const [editableList, setEditableList] = useState(noGoList);

  // Update editableList whenever noGoList changes
  useEffect(() => {
    setEditableList(noGoList);
  }, [noGoList]);

  const handleUpdateList = (index: number, newName: string) => {
    const updatedList = [...editableList];
    updatedList[index] = newName;
    setEditableList(updatedList);
  };

  const handleSaveChanges = () => {
    updateNoGoList(editableList);
    Alert.alert('Success', 'No-go list updated successfully');
  };

  const filteredList = editableList.filter(name => 
    name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>No-Go List</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search names..."
          value={searchText}
          onChangeText={setSearchText}
        />

        <FlatList
          data={filteredList}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.itemContainer}>
              <TextInput
                style={styles.itemInput}
                value={item}
                onChangeText={(newName) => handleUpdateList(index, newName)}
              />
            </View>
          )}
        />

        <TouchableOpacity 
          style={styles.importButton} 
          onPress={importNoGoList}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={COLORS.white} />
          <Text style={styles.buttonText}>Change No-Go List</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  backButton: {
    padding: 8,
    backgroundColor: COLORS.black,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchInput: {
    height: 40,
    borderColor: COLORS.gray,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: COLORS.white,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemInput: {
    flex: 1,
    height: 40,
    borderColor: COLORS.gray,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
  },
  importButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 10,
  },
}); 