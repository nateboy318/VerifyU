import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  TextInput, 
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Easing,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
  Animated,
  RefreshControl
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Student } from '../../types';
import { useEvents } from '../../context/EventContext';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Configure layout animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const AttendanceListScreen = () => {
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const eventId = route.params?.eventId;
  
  const { 
    getEventById, 
    getAttendanceForEvent, 
    removeStudentFromEvent, 
    clearAttendanceForEvent,
    loading 
  } = useEvents();
  
  const event = eventId ? getEventById(eventId) : undefined;
  const students = eventId ? getAttendanceForEvent(eventId) : [];
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const searchInputAnim = useRef(new Animated.Value(0)).current;
  
  // Run entrance animation when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  // Handle search focus animation
  const animateSearchBar = (focused: boolean) => {
    Animated.timing(searchInputAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const formattedDate = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formattedDateFull = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }) + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleRemoveStudent = (studentId: string, name: string) => {
    if (!eventId) return;
    
    Alert.alert(
      'Remove Student',
      `Are you sure you want to remove ${name} from the attendance list?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            await removeStudentFromEvent(eventId, studentId);
          },
        },
      ]
    );
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    // In a real app with server data, you would refetch here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleClearList = () => {
    if (!eventId) return;
    
    Alert.alert(
      'Clear Attendance List',
      'Are you sure you want to clear the entire attendance list? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAttendanceForEvent(eventId);
          },
        },
      ]
    );
  };

  const filteredStudents = students.filter((student: { name: string; id: string; }) => {
    const searchLower = searchText.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchLower) ||
      student.id.toLowerCase().includes(searchLower)
    );
  });

  const exportAttendance = () => {
    Alert.alert('Export Attendance', 'Attendance data will be exported (feature to be implemented)');
  };

  // If no event ID was provided or event doesn't exist
  if (!eventId || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Attendance</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Event Selected</Text>
          <Text style={styles.emptyText}>Please select an event to view its attendance.</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.buttonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.primary }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {event.name}
            </Text>
            {event.location && (
              <Text style={styles.headerSubtitle}>
                {event.location}
              </Text>
            )}
          </View>
          
          {students.length > 0 && (
            <TouchableOpacity 
              style={styles.exportButton}
              onPress={exportAttendance}
            >
              <Ionicons name="share-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Search and Stats */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
            opacity: fadeAnim,
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.searchInputContainer,
            {
              transform: [
                {
                  scale: searchInputAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.02]
                  })
                },
              ],
              shadowOpacity: searchInputAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.3]
              })
            }
          ]}
        >
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID"
            placeholderTextColor={COLORS.textLight}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => animateSearchBar(true)}
            onBlur={() => animateSearchBar(false)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchText('')}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>
      
      {/* Student List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyText}>
            Loading student data...
          </Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={COLORS.primary} style={{ opacity: 0.5 }} />
          <Text style={styles.emptyTitle}>No Students</Text>
          <Text style={styles.emptyText}>
            No students have been added to this event's attendance list yet.
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('IDScanner', { eventId: eventId })}
          >
            <Text style={styles.buttonText}>Scan Student ID</Text>
          </TouchableOpacity>
        </View>
      ) : filteredStudents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={COLORS.primary} style={{ opacity: 0.5 }} />
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>
            No students match your search. Try a different name or ID.
          </Text>
          <Button
            title="Clear Search"
            onPress={() => setSearchText('')}
            type="outline"
            style={{ marginTop: 20 }}
          />
        </View>
      ) : (
        <Animated.View
          style={[
            styles.listContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.studentCard}>
                <View style={styles.studentInfo}>
                  {item.imagePath ? (
                    <View style={styles.idImageContainer}>
                      <Image 
                        source={{ uri: item.imagePath }} 
                        style={styles.idImage} 
                        resizeMode="cover"
                      />
                    </View>
                  ) : (
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.studentDetails}>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <Text style={styles.studentId}>{item.id}</Text>
                    <Text style={styles.studentTime}>
                      {formattedDateFull(item.timestamp)}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => handleRemoveStudent(item.id, item.name)}
                  >
                    <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        </Animated.View>
      )}
      
      {/* Footer Action Button */}
      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 15,

  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    height: 45,
    ...SHADOWS.light,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: COLORS.text,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 100, // Extra space at bottom for footer button
  },
  studentCard: {
    marginVertical: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,

    ...SHADOWS.light,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  studentId: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  studentTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray,
    ...SHADOWS.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
  },
  emptyTitle: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: '80%',
  },
  button: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    ...SHADOWS.medium,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  idImageContainer: {
    borderWidth: 2,
    borderColor: COLORS.neutral,
    borderRadius: 10,
    padding: 2,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 16,
  },
  idImage: {
    width: 100,
    height: 63,
    borderRadius: 8,
    backgroundColor: COLORS.grayLight,
  },
});