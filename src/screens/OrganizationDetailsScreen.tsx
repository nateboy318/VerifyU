import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Event, Organization } from '../types/organization';
import { getCurrentUser, getOrganizationEvents } from '../services/firebase';
import { format } from 'date-fns';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const OrganizationDetailsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { organization } = route.params as { organization: Organization };
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();
  const isAdmin = organization.admins.includes(currentUser?.uid || '');

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const orgEvents = await getOrganizationEvents(organization.id);
        setEvents(orgEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [organization.id]);

  const renderEventItem = ({ item }: { item: Event }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventCardContent}>
        <View style={styles.eventCardHeader}>
          <View style={styles.eventNameContainer}>
            <View style={styles.emojiContainer}>
              <Text style={styles.emojiText}>📅</Text>
            </View>
            <Text style={styles.eventName}>{item.name}</Text>
          </View>
          <Text style={styles.eventDate}>
            {format(new Date(item.startDate), 'MMM d, yyyy h:mm a')}
          </Text>
        </View>
        
        <View style={styles.eventCardStats}>
          <View style={styles.eventStat}>
            <Ionicons name="people-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.eventStatText}>
              {item.attendanceCount || 0} attendees
            </Text>
          </View>
          {item.location && (
            <View style={styles.eventStat}>
              <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.eventStatText}>{item.location}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => navigation.navigate('AttendanceList', { eventId: item.id })}
        >
          <Ionicons name="accessibility" size={20} color={COLORS.primary} />
          <Text style={[styles.actionButtonText, styles.viewButtonText]}>Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.scanButton]} 
          onPress={() => navigation.navigate('IDScanner', { eventId: item.id })}
        >
          <Ionicons name="scan-outline" size={20} color={COLORS.primary} />
          <Text style={[styles.actionButtonText, styles.scanButtonText]}>Scan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{organization.name}</Text>
        {isAdmin && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate('CreateEvent', { organization: organization })}
          >
            <Ionicons name="add-circle" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.eventsList}
        refreshing={loading}
        onRefresh={() => {
          setLoading(true);
          getOrganizationEvents(organization.id)
            .then(setEvents)
            .finally(() => setLoading(false));
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={80} color={COLORS.grayLight} />
            <Text style={styles.emptyTitle}>No Events Found</Text>
            <Text style={styles.emptyText}>
              This organization hasn't created any events yet.
            </Text>
            {isAdmin && (
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateEvent', { organization: organization })}
              >
                <Text style={styles.createButtonText}>Create New Event</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    ...SHADOWS.medium,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  eventsList: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  eventCardContent: {
    padding: 16,
  },
  eventCardHeader: {
    marginBottom: 12,
  },
  eventNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiText: {
    fontSize: 20,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  eventDate: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  eventCardStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },
  eventStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  eventStatText: {
    marginLeft: 6,
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 12,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  viewButton: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
  },
  viewButtonText: {
    color: COLORS.primary,
  },
  scanButton: {
  },
  scanButtonText: {
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 32,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    ...SHADOWS.medium,
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default OrganizationDetailsScreen; 