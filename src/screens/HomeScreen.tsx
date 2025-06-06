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
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '../context/EventContext';
import { getEventEmoji } from '../utils/emojiUtils';
import { useNoGoList } from '../context/NoGoListContext';
import { db, auth, getCurrentUser } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Organization, Event } from '../types/organization';
import { useAuth } from '../context/AuthContext';


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
  isLocal: boolean;
}

// New interface for horizontal scrolling event cards
interface HorizontalEventCardProps {
  title: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  event: any;
  isLocal: boolean;
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
const EventCard = ({ title, time, icon, color, onPress, event, isLocal }: EventCardProps) => {
  const eventEmoji = getEventEmoji(event);
  // Use organization color for badge, or COLORS.localbadge for personal events
  const badgeColor = isLocal ? COLORS.localbadge : (event.color || COLORS.text);
  
  // Truncate title to 15 characters
  const truncatedTitle = title.length > 15 ? `${title.substring(0, 15)}...` : title;
  
  return (
    <TouchableOpacity style={styles.eventCard} onPress={onPress}>
      <View style={[styles.eventIconContainer, { backgroundColor: color }]}>
        <Text style={styles.eventIconEmoji}>{eventEmoji}</Text>
      </View>
      <View style={styles.eventDetails}>
        <View style={styles.eventTitleContainer}>
          <Text style={styles.eventTitle}>{truncatedTitle}</Text>
          <View style={[styles.eventTypeBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.eventTypeText}>
              {isLocal ? 'Personal' : event.organizationName && event.organizationName.length > 15 
                ? `${event.organizationName.substring(0, 12)}...` 
                : event.organizationName || 'Organization'}
            </Text>
          </View>
        </View>
        <Text style={styles.eventTime}>{time}</Text>
      </View>
      
    </TouchableOpacity>
  );
};

// Updated HorizontalEventCard component
const HorizontalEventCard = ({ title, time, icon, color, onPress, event, isLocal }: HorizontalEventCardProps) => {
  const eventEmoji = getEventEmoji(event);
  // Use organization color for badge, or COLORS.localbadge for personal events
  const badgeColor = isLocal ? COLORS.localbadge : (event.color || COLORS.text);
  
  // Truncate title to 15 characters
  const truncatedTitle = title.length > 15 ? `${title.substring(0, 15)}...` : title;
  
  return (
    <TouchableOpacity style={styles.horizontalEventCard} onPress={onPress}>
      <View style={styles.horizontalEventHeader}>
        <View style={[styles.horizontalEventIconContainer, { backgroundColor: color }]}>
          <Text style={styles.horizontalEventIconEmoji}>{eventEmoji}</Text>
        </View>
        <View style={styles.horizontalEventContent}>
          <View style={styles.horizontalEventTitleRow}>
            <Text style={styles.horizontalEventTitle} numberOfLines={1}>{truncatedTitle}</Text>
            <View style={[styles.horizontalEventTypeBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.horizontalEventTypeText}>
                {isLocal ? 'Personal' : event.organizationName && event.organizationName.length > 15 
                  ? `${event.organizationName.substring(0, 12)}...` 
                  : event.organizationName || 'Organization'}
              </Text>
            </View>
          </View>
          <Text style={styles.horizontalEventTime} numberOfLines={1}>{time}</Text>
          <View style={styles.horizontalEventStats}>
            <Ionicons name="people-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.horizontalEventAttendees}>
              {event.attendanceCount || 0} attendees
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Specialist card component
const SpecialistBox = ({ title, count, icon, color, onPress }: SpecialistBoxProps) => (
  <TouchableOpacity style={styles.specialistBox} onPress={onPress}>
    <View style={styles.specialistContent}>
      <Text style={styles.specialistCount}>
        {count} {title === "Organizations" ? (count === 1 ? 'organization' : 'organizations') : (count === 1 ? 'event' : 'events')}
      </Text>
      <Text style={styles.specialistTitle}>{title}</Text>
    </View>
    <View style={[styles.specialistIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={20} color={COLORS.white} />
    </View>
  </TouchableOpacity>
);

export const HomeScreen = () => {
  const navigation = useNavigation() as any;
  const { events, loading, error, refreshEvents } = useEvents();
  const { user } = useAuth();
  
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [organizationCount, setOrganizationCount] = useState(0);
  const [organizationNames, setOrganizationNames] = useState<{[key: string]: string}>({});
  const [organizationColors, setOrganizationColors] = useState<{[key: string]: string}>({});
  const [refreshing, setRefreshing] = useState(false);
  
  // Get current date for greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshEvents();
    } finally {
      setRefreshing(false);
    }
  }, [refreshEvents]);

  // Get user's organizations count
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'organizations'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrganizationCount(snapshot.docs.length);
    });

    return () => unsubscribe();
  }, [user?.uid]);

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

  // Fetch organization names and colors for all events with organizationId
  useEffect(() => {
    if (!events.length) return;
    
    const orgIds = events
      .filter(event => event.organizationId)
      .map(event => event.organizationId);
    
    // Remove duplicates
    const uniqueOrgIds = [...new Set(orgIds)];
    
    const fetchOrgData = async () => {
      const names: {[key: string]: string} = {};
      const colors: {[key: string]: string} = {};
      
      for (const orgId of uniqueOrgIds) {
        if (orgId) {
          try {
            const orgDoc = await getDoc(doc(db, 'organizations', orgId));
            if (orgDoc.exists()) {
              names[orgId] = orgDoc.data().name || 'Unknown Organization';
              colors[orgId] = orgDoc.data().color || COLORS.text;
            }
          } catch (error) {
            console.error('Error fetching organization:', error);
          }
        }
      }
      
      setOrganizationNames(names);
      setOrganizationColors(colors);
    };
    
    fetchOrgData();
  }, [events]);

  // When displaying the scanned today count, use:
  const scannedToday = events.length > 0 ? events.length : 0;

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
            onPress: () => navigation.navigate('CreateLocalEvent')
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

  console.log('HomeScreen - Events from context:', events.length);
  console.log('HomeScreen - Local events:', events.filter(e => !e.organizationId).length);
  console.log('HomeScreen - Organization events:', events.filter(e => e.organizationId).length);

  // Log organization IDs to verify they match user's organizations
  console.log('Organization events details:', events.filter(e => e.organizationId).map(e => ({
    id: e.id,
    name: e.name,
    organizationId: e.organizationId
  })));

  useEffect(() => {
    if (events.length > 0) {
      console.log('HomeScreen - Events breakdown:');
      console.log('Total events:', events.length);
      
      // Group events by organizationId
      const eventsByOrg = events.reduce((acc, event) => {
        const orgId = event.organizationId || 'personal';
        if (!acc[orgId]) acc[orgId] = [];
        acc[orgId].push(event);
        return acc;
      }, {} as Record<string, Event[]>);
      
      // Log counts by organization
      Object.entries(eventsByOrg).forEach(([orgId, orgEvents]) => {
        console.log(`${orgId === 'personal' ? 'Personal' : `Organization ${orgId}`} events: ${orgEvents.length}`);
      });
    }
  }, [events]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
          onPress={onRefresh}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get the most recent event
  const now = new Date();
  const upcomingEvents = events.filter(event => {
    if (!event.startDate) return false;
    return new Date(event.startDate) >= now;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  
  const pastEvents = events.filter(event => {
    if (!event.startDate) return false;
    return new Date(event.startDate) < now;
  }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Get the next upcoming event (or current active event)
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  // Separate events into local and organization events
  const localEvents = events.filter(event => !event.organizationId);
  const organizationEvents = events.filter(event => event.organizationId);

  // Update the EventCard component to use the organization names
  const renderEventCard = (event: any, isLocal: boolean) => {
    // Get organization name and color if it exists
    const orgName = event.organizationId ? organizationNames[event.organizationId] : null;
    const orgColor = event.organizationId ? organizationColors[event.organizationId] : null;
    
    return (
      <EventCard 
        key={event.id}
        title={event.name}
        time={formatDate(event.startDate)}
        icon="calendar-outline"
        color={COLORS.tertiary}
        onPress={() => isNavigationReady && navigation.navigate('AttendanceList', { eventId: event.id })}
        event={{...event, organizationName: orgName, color: orgColor}}
        isLocal={isLocal}
      />
    );
  };

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
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.subGreeting}>Closed Beta</Text>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
              <Image source={require('../../assets/icon.png')} style={styles.logo} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content */}
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          >
            {/* Next Up Event Section */}
            <View style={styles.sectionContainer}>
            <View >
              <Text style={styles.nextEventText}>Next Event</Text>
            </View>
              {nextEvent ? (
                <View style={styles.nextEventContainer}>
                  <View style={styles.nextEventHeader}>
                    <View style={styles.nextEventBadgeContainer}>
                      
                      {nextEvent.organizationId && (
                        <View style={[
                          styles.nextEventOrgBadge, 
                          { backgroundColor: organizationColors[nextEvent.organizationId] || COLORS.text }
                        ]}>
                          <Text style={styles.nextEventOrgBadgeText}>
                            {organizationNames[nextEvent.organizationId] || 'Organization'}
                          </Text>
                        </View>
                      )}
                      {!nextEvent.organizationId && (
                        <View style={[styles.nextEventOrgBadge, { backgroundColor: COLORS.localbadge }]}>
                          <Text style={styles.nextEventOrgBadgeText}>Personal</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.nextEventDate}>{formatDate(nextEvent.startDate)}</Text>
                  </View>
                  <View style={styles.nextEventInfo}>
                    <Text style={styles.nextEventEmoji}>{getEventEmoji(nextEvent)}</Text>
                    <View>
                      <Text style={styles.nextEventTitle}>
                        {nextEvent.name.length > 15 ? `${nextEvent.name.substring(0, 15)}...` : nextEvent.name}
                      </Text>
                      <Text style={styles.nextEventDescription}>{nextEvent.location}</Text>
                    </View>
                  </View>
                  <View style={styles.nextEventButtons}>
                    <TouchableOpacity 
                      style={styles.nextEventButton}
                      onPress={() => isNavigationReady && navigation.navigate('AttendanceList', { eventId: nextEvent.id })}
                    >
                      <Text style={styles.nextEventButtonText}>View Attendance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.nextEventButton}
                      onPress={handleScanPress}
                    >
                      <Text style={styles.nextEventButtonText}>Scan IDs</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyNextEventContainer}>
                  <Ionicons name="calendar-outline" size={40} color={COLORS.grayDark} />
                  <Text style={styles.emptyEventsText}>No upcoming events</Text>
                  <TouchableOpacity 
                    style={styles.createEventButton}
                    onPress={() => isNavigationReady && navigation.navigate('CreateLocalEvent')}
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
                  color={COLORS.red}
                  onPress={handleScanPress}
                />
                <SpecialistBox 
                  title="Organizations"
                  count={organizationCount}
                  icon="people"
                  color={COLORS.blue}
                  onPress={() => navigation.navigate('Organizations')}
                />
                <SpecialistBox 
                  title="Create Event"
                  count={events.length}
                  icon="add-circle-outline"
                  color={COLORS.green}
                  onPress={() => isNavigationReady && navigation.navigate('CreateLocalEvent')}
                />
                <SpecialistBox 
                  title="View Events"
                  count={events.length}
                  icon="calendar-outline"
                  color={COLORS.purple}
                  onPress={() => isNavigationReady && navigation.navigate('EventList')}
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
                <>
                  {/* Local Events */}
                  {localEvents.length > 0 && localEvents.some(event => new Date(event.startDate) >= now) && (
                    <View style={styles.eventCategoryContainer}>
                      <Text style={styles.eventCategoryTitle}>Personal Events</Text>
                      {localEvents
                        .filter(event => new Date(event.startDate) >= now)
                        .slice(0, 2)
                        .map((event) => renderEventCard(event, true))}
                    </View>
                  )}

                  {/* Organization Events */}
                  {organizationEvents.length > 0 && (
                    <View style={styles.eventCategoryContainer}>
                      <Text style={styles.eventCategoryTitle}>Organization Events</Text>
                      {organizationEvents
                        .filter(event => new Date(event.startDate) >= now)
                        .slice(0, 2)
                        .map((event) => renderEventCard(event, false))}
                    </View>
                  )}
                </>
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
                  {pastEvents.slice(0, 5).map((event) => {
                    const orgName = event.organizationId ? organizationNames[event.organizationId] : null;
                    const orgColor = event.organizationId ? organizationColors[event.organizationId] : null;
                    
                    return (
                      <HorizontalEventCard 
                        key={event.id}
                        title={event.name}
                        time={formatDate(event.startDate)}
                        icon="time-outline"
                        color={!event.organizationId ? COLORS.tertiary : COLORS.tertiary}
                        onPress={() => isNavigationReady && navigation.navigate('AttendanceList', { eventId: event.id })}
                        event={{...event, organizationName: orgName, color: orgColor}}
                        isLocal={!event.organizationId}
                      />
                    );
                  })}
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
    marginTop: 8,
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
    position: 'relative',
    height: 140,
  },
  specialistContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
  },
  specialistCount: {
    fontSize: 12,
    fontWeight: 'semibold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  specialistTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    zIndex: 2,
  },
  specialistIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 1,
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
  nextEventBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextEventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextEventText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  nextEventDate: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  nextEventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 0,
  },
  nextEventButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  nextEventButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
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
    paddingVertical: 12,
    paddingRight: 16,
    paddingLeft: 0,
    
    
  },
  horizontalEventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 250,
    ...SHADOWS.medium,
  },
  horizontalEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalEventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  horizontalEventContent: {
    flex: 1,
  },
  horizontalEventTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  horizontalEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 4,
    marginBottom: 4,
  },
  horizontalEventTime: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  horizontalEventIconEmoji: {
    fontSize: 18,
    color: COLORS.white
  },
  horizontalEventTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  horizontalEventTypeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  horizontalEventStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  horizontalEventAttendees: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
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
  nextEventButtons: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOWS.medium,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  eventCategoryContainer: {
    marginBottom: 16,

  },
  eventCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
    marginLeft: 4,
  },
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTypeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  nextEventOrgBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nextEventOrgBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  logo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
}); 