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
import { Attendance, Organization } from '../../types/organization';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getEventDetails, getEventAttendance, markAttendance, getOrganizationById } from '../../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure layout animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const AttendanceListScreen = () => {
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const eventId = route.params?.eventId;
  
  const [event, setEvent] = useState<any>(null);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const searchInputAnim = useRef(new Animated.Value(0)).current;
  
  // Load event details and attendance
  useEffect(() => {
    loadEventData();
  }, [eventId]);

  useEffect(() => {
    // Only check for organization if this is an organization event
    if (event && event.organizationId) {
      if (route.params?.organization) {
        setOrganization(route.params.organization);
      } else {
        // Instead of showing an error, try to fetch the organization data
        const fetchOrganization = async () => {
          try {
            // Assuming you have a function to get organization by ID
            const orgData = await getOrganizationById(event.organizationId);
            if (orgData) {
              setOrganization(orgData);
            }
          } catch (error) {
            console.error('Error fetching organization:', error);
            // Only show error if we really need the organization data
            // For now, let's just log it and continue
          }
        };
        
        fetchOrganization();
      }
    }
    // If it's a local event or doesn't have an organizationId, we don't need organization data
  }, [route.params?.organization, event]);

  const loadEventData = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      
      // Check if this is a local event
      const localEvents = await AsyncStorage.getItem('localEvents');
      if (localEvents) {
        const events = JSON.parse(localEvents);
        const localEvent = events.find((e: any) => e.id === eventId);
        if (localEvent) {
          setEvent(localEvent);
          setAttendanceList(localEvent.attendance || []);
          setLoading(false);
          return;
        }
      }

      // If not a local event, load from Firebase
      const { event: eventData, attendance } = await getEventDetails(eventId);
      setEvent(eventData);
      setAttendanceList(attendance);
    } catch (error) {
      console.error('Error loading event data:', error);
      Alert.alert('Error', 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };
  
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

  const formattedDate = (date: Date | number | null | undefined) => {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formattedDateFull = (date: Date | number | null | undefined) => {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }) + ' ' + dateObj.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEventData();
    setRefreshing(false);
  };

  const filteredAttendance = attendanceList.filter((record) => {
    const searchLower = searchText.toLowerCase();
    return (
      record.userId.toLowerCase().includes(searchLower)
    );
  });

  const saveLocalEvent = async (eventData: any) => {
    const newEvent = {
      id: Date.now().toString(),
      ...eventData,
      isLocal: true,
      createdAt: Date.now(),
      attendanceCount: 0
    };
    const existingEvents = await AsyncStorage.getItem('localEvents');
    const events = existingEvents ? JSON.parse(existingEvents) : [];
    events.push(newEvent);
    await AsyncStorage.setItem('localEvents', JSON.stringify(events));
  };

  const handleLocalAttendance = async (
    eventId: string,
    userId: string,
    checkedInBy: string,
    status: 'present' | 'absent' | 'late',
    notes?: string,
    imagePath?: string
  ) => {
    try {
      if (event.isLocal) {
        // Handle local event attendance
        const localEvents = await AsyncStorage.getItem('localEvents');
        if (localEvents) {
          const events = JSON.parse(localEvents);
          const eventIndex = events.findIndex((e: any) => e.id === eventId);
          
          if (eventIndex !== -1) {
            const attendance = {
              id: Date.now().toString(),
              eventId,
              userId,
              timestamp: Date.now(),
              status,
              notes,
              checkedInBy,
              imagePath
            };

            // Initialize attendance array if it doesn't exist
            if (!events[eventIndex].attendance) {
              events[eventIndex].attendance = [];
            }

            // Add new attendance record
            events[eventIndex].attendance.push(attendance);
            events[eventIndex].attendanceCount = events[eventIndex].attendance.length;

            // Save back to AsyncStorage
            await AsyncStorage.setItem('localEvents', JSON.stringify(events));
            
            // Update local state
            setAttendanceList(events[eventIndex].attendance);
            setEvent(events[eventIndex]);
          }
        }
      } else {
        // Handle organization event attendance
        await markAttendance(eventId, userId, checkedInBy, status, notes, imagePath);
        await loadEventData(); // Reload attendance data
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  // If no event ID was provided or event doesn't exist
  if (!eventId || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance</Text>
          <View style={{ width: 40 }} />
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
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={{ width: 40 }} />
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
            placeholder="Search by ID"
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
            Loading attendance data...
          </Text>
        </View>
      ) : attendanceList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={COLORS.primary} style={{ opacity: 0.5 }} />
          <Text style={styles.emptyTitle}>No Attendance Records</Text>
          <Text style={styles.emptyText}>
            No attendance records have been added to this event yet.
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('IDScanner', { 
              eventId: eventId,
              isLocal: event.isLocal 
            })}
          >
            <Text style={styles.buttonText}>Scan Student ID</Text>
          </TouchableOpacity>
        </View>
      ) : filteredAttendance.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={COLORS.primary} style={{ opacity: 0.5 }} />
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>
            No records match your search. Try a different ID.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setSearchText('')}
          >
            <Text style={styles.buttonText}>Clear Search</Text>
          </TouchableOpacity>
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
            data={filteredAttendance}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
              />
            }
            renderItem={({ item }) => {
              console.log('Attendance item:', {
                id: item.id,
                imagePath: item.imagePath,
                notes: item.notes
              });
              
              return (
                <View style={styles.studentCard}>
                  <View style={styles.studentInfo}>
                    {item.imagePath ? (
                      <Image 
                        source={{ uri: item.imagePath }}
                        style={styles.idImage}
                        resizeMode="contain"
                        onError={(error) => console.error('Image loading error:', error.nativeEvent.error)}
                        onLoad={() => console.log('Image loaded successfully:', item.imagePath)}
                      />
                    ) : (
                      <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{item.userId.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.studentDetails}>
                      <Text style={styles.studentName}>{item.notes?.split('Name: ')[1] || 'Unknown Student'}</Text>
                      <Text style={styles.studentId}>Student ID: {item.userId}</Text>
                      <Text style={styles.studentTime}>
                        {formattedDateFull(item.timestamp)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.black,
    borderRadius: 20,
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
    paddingBottom: 100,
  },
  studentCard: {
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    ...SHADOWS.light,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idImage: {
    width: 120,
    height: 75,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: COLORS.background,
  },
  avatarContainer: {
    width: 120,
    height: 75,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  studentDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  studentId: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 2,
  },
  studentTime: {
    fontSize: 14,
    color: COLORS.textLight,
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
});