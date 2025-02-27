import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '../context/EventContext';
import { getEventEmoji } from '../utils/emojiUtils';
import { useNoGoList } from '../context/NoGoListContext';

// Helper function to format dates to mm/dd/yy x:xxpm/am
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'No date specified';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Format date as mm/dd/yy
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(2);
    
    // Format time as x:xxpm/am
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    
    // Convert hours to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    return `${month}/${day}/${year} ${hours}:${minutes}${ampm}`;
  } catch (error) {
    return 'Invalid date';
  }
};

// Define interfaces for props
interface StatBoxProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  color: string;
}

interface EventCardProps {
  title: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  event: any;
}

// New interface for horizontal scrolling event cards
interface HorizontalEventCardProps {
  title: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  event: any;
}

interface SpecialistBoxProps {
  title: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

// Stats box component for the top section
const StatBox = ({ icon, title, value, color }: StatBoxProps) => (
  <View style={[styles.statBox, { backgroundColor: color }]}>
    <View style={styles.statIconContainer}>
      <Ionicons name={icon} size={20} color={COLORS.white} />
    </View>
    <View style={styles.statTextContainer}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  </View>
);

// Event card component with emoji support
const EventCard = ({ title, time, icon, color, onPress, event }: EventCardProps) => {
  const eventEmoji = getEventEmoji(event);
  
  return (
    <TouchableOpacity style={styles.eventCard} onPress={onPress}>
      <View style={[styles.eventIconContainer, { backgroundColor: color }]}>
        <Text style={styles.eventIconEmoji}>{eventEmoji}</Text>
      </View>
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle}>{title}</Text>
        <Text style={styles.eventTime}>{time}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.grayDark} />
    </TouchableOpacity>
  );
};

// Horizontal event card component for past events with emoji support
const HorizontalEventCard = ({ title, time, icon, color, onPress, event }: HorizontalEventCardProps) => {
  const eventEmoji = getEventEmoji(event);
  
  return (
    <TouchableOpacity style={styles.horizontalEventCard} onPress={onPress}>
      <View style={[styles.horizontalEventIconContainer, { backgroundColor: color }]}>
        <Text style={styles.horizontalEventIconEmoji}>{eventEmoji}</Text>
      </View>
      <Text style={styles.horizontalEventTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.horizontalEventTime} numberOfLines={1}>{time}</Text>
    </TouchableOpacity>
  );
};

// Specialist card component
const SpecialistBox = ({ title, count, icon, color, onPress }: SpecialistBoxProps) => (
  <TouchableOpacity style={styles.specialistBox} onPress={onPress}>
    <View style={styles.specialistContent}>
      <View style={{ flex: 1 }}>
        <Text style={styles.specialistCount}>{count} {count === 1 ? 'event' : 'events'}</Text>
        <Text style={styles.specialistTitle}>{title}</Text>
      </View>
      <View style={[styles.specialistIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color={COLORS.white} />
      </View>
    </View>
  </TouchableOpacity>
);

export const HomeScreen = () => {
  const navigation = useNavigation() as any;
  
  // Use the events context directly
  const { events, loading, error, getAttendanceCountForToday } = useEvents();
  
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [userName, setUserName] = useState('User');
  
  // Get current date for greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

  // Ensure navigation is ready before using it
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      setIsNavigationReady(true);
    });
    
    // Set it to true after a short delay as a fallback
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 300);
    
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [navigation]);

  // Add a refresh state and useEffect to ensure scanned count updates
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Function to calculate today's scan count
  const getTodaysScanCount = useCallback(() => {
    return getAttendanceCountForToday();
  }, [getAttendanceCountForToday, refreshKey]);
  
  // Set up a refresh interval
  useEffect(() => {
    // Update the scanned count every minute
    const intervalId = setInterval(() => {
      setRefreshKey(prevKey => prevKey + 1);
    }, 60000); // 1 minute refresh
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Also refresh when focusing the screen
  useFocusEffect(
    useCallback(() => {
      // Trigger refresh when screen comes into focus
      setRefreshKey(prevKey => prevKey + 1);
      return () => {};
    }, [])
  );
  
  // When displaying the scanned today count, use:
  const scannedToday = getTodaysScanCount();

  // Handler for when "Scan IDs" is pressed
  const handleScanPress = () => {
    if (!isNavigationReady) return;
    
    if (events.length === 0) {
      // No events exist, prompt to create one first
      Alert.alert(
        'No Events Found',
        'You need to create an event before scanning IDs. Would you like to create an event now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Event', 
            onPress: () => navigation.navigate('CreateEvent')
          }
        ]
      );
    } else if (events.length === 1) {
      // Only one event exists, use it automatically
      navigation.navigate('IDScanner', { eventId: events[0].id });
    } else {
      // Multiple events exist, show event list for selection
      navigation.navigate('EventList');
    }
  };

  const { importNoGoList } = useNoGoList();

  if (loading) {
    return (
      <View style={[styles.container]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container]}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.primary} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>
          We're having trouble loading your dashboard. Please try again later.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get the most recent event
  const latestEvent = events.length > 0 ? events[0] : null;

  // Separate events into upcoming and past events
  const now = new Date();
  const upcomingEvents = events.filter(event => {
    if (!event.date) return true; // Events without dates go to upcoming for now
    return new Date(event.date) >= now;
  });
  
  const pastEvents = events.filter(event => {
    if (!event.date) return false; // Events without dates don't go to past
    return new Date(event.date) < now;
  });
  
  // Get the next upcoming event (or current active event)
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  return (
    <>
      <StatusBar 
        barStyle="dark-content"
        backgroundColor={COLORS.white}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.greeting}>VerifyU</Text>
                <Text style={styles.subGreeting}>Closed Beta</Text>
              </View>
              <TouchableOpacity style={styles.profileButton}>
                <Ionicons name="person-circle" size={40} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content */}
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Stats Section */}
            {/* <View style={styles.statsGrid}>
              <StatBox 
                icon="scan-outline" 
                title="Scanned Today" 
                value={scannedToday.toString()} 
                color={COLORS.primary} 
              />
              <StatBox 
                icon="time-outline" 
                title="Active Events" 
                value={events.length.toString()} 
                color={COLORS.secondary} 
              />
            </View> */}
            
            {/* Next Up Event Section */}
            <View style={styles.sectionContainer}>
              
              
              {nextEvent ? (
                <View style={styles.nextEventContainer}>
                  <View style={styles.nextEventHeader}>
                    <View style={[styles.nextEventBadge, { backgroundColor: COLORS.primary }]}>
                      <Text style={styles.nextEventBadgeText}>NEXT EVENT</Text>
                    </View>
                    <Text style={styles.nextEventDate}>{formatDate(nextEvent.date)}</Text>
                  </View>
                  <View style={styles.nextEventInfo}>
                    <Text style={styles.nextEventEmoji}>{getEventEmoji(nextEvent)}</Text>
                    <View>
                      <Text style={styles.nextEventTitle}>{nextEvent.name}</Text>
                      <Text style={styles.nextEventDescription}>{nextEvent.location}</Text>
                      </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.nextEventButton}
                    onPress={() => isNavigationReady && navigation.navigate('AttendanceList', { eventId: nextEvent.id })}
                  >
                    <Text style={styles.nextEventButtonText}>View Attendance</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyNextEventContainer}>
                  <Ionicons name="calendar-outline" size={40} color={COLORS.grayDark} />
                  <Text style={styles.emptyEventsText}>No upcoming events</Text>
                  <TouchableOpacity 
                    style={styles.createEventButton}
                    onPress={() => isNavigationReady && navigation.navigate('CreateEvent')}
                  >
                    <Text style={styles.createEventButtonText}>Create Event</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Actions</Text>

              </View>
              
              <View style={styles.specialistsGrid}>
                <SpecialistBox 
                  title="Scan IDs"
                  count={events.length}
                  icon="scan-outline"
                  color={COLORS.secondary}
                  onPress={handleScanPress}
                />
                <SpecialistBox 
                  title="Create Event"
                  count={events.length}
                  icon="add-circle-outline"
                  color={COLORS.secondary}
                  onPress={() => isNavigationReady && navigation.navigate('CreateEvent')}
                />
                <SpecialistBox 
                  title="View Events"
                  count={events.length}
                  icon="calendar-outline"
                  color={COLORS.secondary}
                  onPress={() => isNavigationReady && navigation.navigate('EventList')}
                />
                <SpecialistBox 
                  title="No-Go List"
                  count={0}
                  icon="list-outline"
                  color={COLORS.primary}
                  onPress={() => {
                    importNoGoList();
                  }}
                />
              </View>
            </View>
            
            {/* Scheduled Events Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Scheduled Events</Text>
                <TouchableOpacity onPress={() => isNavigationReady && navigation.navigate('EventList')}>
                  <Text style={styles.seeAllText}>See all <Ionicons name="chevron-forward" size={12} /></Text>
                </TouchableOpacity>
              </View>
              
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 2).map((event) => (
                  <EventCard 
                    key={event.id}
                    title={event.name}
                    time={formatDate(event.date)}
                    icon="calendar-outline"
                    color={COLORS.tertiary}
                    onPress={() => isNavigationReady && navigation.navigate('AttendanceList', { eventId: event.id })}
                    event={event}
                  />
                ))
              ) : (
                <View style={styles.emptyEventsContainer}>
                  <Text style={styles.emptyEventsText}>No events scheduled</Text>
                </View>
              )}
            </View>
            
            {/* Past Events Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Past Events</Text>
                <TouchableOpacity onPress={() => isNavigationReady && navigation.navigate('EventList', { filter: 'past' })}>
                  <Text style={styles.seeAllText}>See all <Ionicons name="chevron-forward" size={12} /></Text>
                </TouchableOpacity>
              </View>
              
              {pastEvents.length > 0 ? (
                <ScrollView 
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContainer}
                >
                  {pastEvents.slice(0, 5).map((event) => (
                    <HorizontalEventCard 
                      key={event.id}
                      title={event.name}
                      time={formatDate(event.date)}
                      icon="time-outline"
                      color={COLORS.grayDark}
                      onPress={() => isNavigationReady && navigation.navigate('AttendanceList', { eventId: event.id })}
                      event={event}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyPastEventsContainer}>
                  <Text style={styles.emptyEventsText}>No past events</Text>
                </View>
              )}
            </View>
          </ScrollView>
          
          {/* Floating Action Button */}
          <TouchableOpacity 
            style={styles.fab}
            onPress={handleScanPress}
          >
            <Ionicons name="scan" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingTop: 0,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subGreeting: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: SIZES.padding,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    width: '48%',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 4,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.medium,
     borderWidth: 0,
    borderColor: COLORS.primary,
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventTime: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  emptyEventsContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    ...SHADOWS.medium,
  },
  emptyEventsText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
    marginBottom: 16,
  },
  createEventButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createEventButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  specialistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  specialistBox: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    ...SHADOWS.medium,
    marginBottom: 0,
  },
  specialistContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specialistCount: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  specialistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  specialistIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  errorTitle: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  nextEventContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.medium,
    borderWidth: 0,
    borderColor: COLORS.primary,
  },
  nextEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextEventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextEventBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  nextEventDate: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  nextEventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 0,
  },
  nextEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  nextEventButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginRight: 8,
  },
  nextEventDescription: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 0,
  },
  emptyNextEventContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    ...SHADOWS.medium,
    borderWidth: 0,
    borderColor: COLORS.primary,
  },
  horizontalScrollContainer: {
    paddingVertical: 4,
    paddingRight: 16,
  },
  horizontalEventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 150,
    ...SHADOWS.medium,
  },
  horizontalEventIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  horizontalEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  horizontalEventTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  emptyPastEventsContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
  },
  eventIconEmoji: {
    fontSize: 22, 
    color: COLORS.white
  },
  horizontalEventIconEmoji: {
    fontSize: 18,
    color: COLORS.white
  },
  nextEventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextEventEmoji: {
    backgroundColor: COLORS.tertiary,
    borderRadius: 100,
    padding: 10,
    fontSize: 28,
    marginRight: 12,
  },
  eventEmoji: {
    fontSize: 24,
  },
}); 