import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Organization } from '../types/organization';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import {
  createOrganization,
  joinOrganization,
  db,
} from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OrganizationScreen() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS.primary);
  
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const colorOptions = [
    '#E23838', // Red
    '#F78200', // Orange
    '#FFB900', // Yellow
    '#5EBD3E', // Green
    '#009CDF', // Blue
    '#973999', // Purple
    '#ff6ec7', // Pink
    
    
  ];

  useEffect(() => {
    if (!user?.uid) {
      console.log('No user found, returning early');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Setting up Firestore query for organizations');
      const q = query(
        collection(db, 'organizations'),
        where('members', 'array-contains', user.uid)
      );

      console.log('Subscribing to organization updates');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Received organization snapshot, docs count:', snapshot.docs.length);
        const orgs = snapshot.docs.map((doc) => {
          console.log('Processing doc:', doc.id);
          return doc.data() as Organization;
        });
        setOrganizations(orgs);
        setLoading(false);
      }, (error) => {
        console.error('Firestore subscription error:', error);
        setLoading(false);
      });

      return () => {
        console.log('Cleaning up organization subscription');
        unsubscribe();
      };
    } catch (error) {
      console.error('Error in organizations useEffect:', error);
      setLoading(false);
    }
  }, [user?.uid]);

  const handleJoinOrganization = async () => {
    if (!user?.uid) return;
    
    try {
      const result = await joinOrganization(joinCode.toUpperCase(), user.uid);
      if (result) {
        Alert.alert('Success', 'Successfully joined organization!');
        setJoinCode('');
        setShowJoinModal(false);
      } else {
        Alert.alert('Error', 'Failed to join organization');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join organization');
    }
  };

  const handleCreateOrganization = async () => {
    if (!user?.uid) return;
    
    try {
      await createOrganization(newOrgName, newOrgDescription, user.uid, selectedColor);
      setNewOrgName('');
      setNewOrgDescription('');
      setSelectedColor(COLORS.primary);
      setShowCreateModal(false);
      Alert.alert('Success', 'Organization created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create organization');
    }
  };

  const handleShareCode = async (code: string, name: string) => {
    try {
      const message = `🎉 You have been invited to join the ${name} community on AttendIt! \n\n 🔑 To get started Download AttendIt, create an account, and use join code: ${code}`;
      console.log('Attempting to share:', message);
      const result = await Share.share({
        message,
      });

      if (result.action === Share.sharedAction) {
        console.log('Share successful');
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing code:', error);
      Alert.alert('Error', 'Failed to share the code');
    }
  };

  const renderOrganization = ({ item }: { item: Organization }) => (
    <TouchableOpacity
      style={styles.organizationCard}
      onPress={() => navigation.navigate('OrganizationDetails', { organization: item })}
    >
      <View style={styles.organizationContent}>
        <View style={[
          styles.organizationIcon, 
          { backgroundColor: item.color || COLORS.secondary }
        ]}>
          <Ionicons name="people" size={24} color={COLORS.white} />
        </View>
        <View style={styles.organizationInfo}>
          <Text style={styles.organizationName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.organizationDescription}>{item.description}</Text>
          )}
          <Text style={styles.joinCode}>Join Code: {item.joinCode}</Text>
        </View>
        <TouchableOpacity
          style={styles.shareIconButton}
          onPress={() => handleShareCode(item.joinCode, item.name)}
        >
          <Ionicons name="share-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading organizations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organizations</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
            onPress={() => setShowJoinModal(true)}
          >
            <Ionicons name="enter-outline" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Join</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.secondary }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add-outline" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Organizations List */}
        <FlatList
          data={organizations}
          renderItem={renderOrganization}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={COLORS.grayDark} />
              <Text style={styles.emptyStateTitle}>No Organizations</Text>
              <Text style={styles.emptyStateText}>
                Join an organization or create your own to get started
              </Text>
            </View>
          }
        />

        {/* Join Modal */}
        {showJoinModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Join Organization</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Join Code"
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                placeholderTextColor={COLORS.grayDark}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => setShowJoinModal(false)}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={handleJoinOrganization}
                >
                  <Text style={styles.modalPrimaryButtonText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Organization</Text>
              <TextInput
                style={styles.input}
                placeholder="Organization Name"
                value={newOrgName}
                onChangeText={setNewOrgName}
                placeholderTextColor={COLORS.grayDark}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                value={newOrgDescription}
                onChangeText={setNewOrgDescription}
                multiline
                placeholderTextColor={COLORS.grayDark}
              />
              
              <Text style={styles.colorPickerLabel}>Organization Color</Text>
              <View style={styles.selectedColorDisplay}>
                <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
                <Text style={styles.selectedColorText}>Selected Color</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPickerContainer}>
                {colorOptions.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColorOption
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalPrimaryButton, { backgroundColor: selectedColor }]}
                  onPress={handleCreateOrganization}
                >
                  <Text style={styles.modalPrimaryButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.black,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SIZES.padding,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    ...SHADOWS.medium,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: SIZES.padding,
  },
  organizationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  organizationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  organizationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  organizationInfo: {
    flex: 1,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  organizationDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
    marginBottom: -15,
  },
  joinCode: {
    fontSize: 12,
    color: COLORS.grayDark,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: '85%',
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 18,
  },
  modalPrimaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalPrimaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSecondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalSecondaryButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  colorPickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 8,
  },
  selectedColorDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  selectedColorText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxHeight: 50,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: COLORS.black,
  },
  shareIconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 