import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '../../context/EventContext';
import { getEventEmoji } from '../../utils/emojiUtils';

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

export const EventListScreen = ({ route }: any) => {
  const navigation = useNavigation() as any;
  const { events, deleteEvent, loading } = useEvents();
  
  // Filter for past events if filter parameter is provided
  const filterType = route?.params?.filter;
  const now = new Date();
  
  const filteredEvents = filterType === 'past' 
    ? events.filter(event => {
        if (!event.date) return false;
        return new Date(event.date) < now;
      })
    : events;

  const handleDeleteEvent = (id: string, name: string) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            deleteEvent(id);
            Alert.alert('Success', 'Event deleted successfully');
          }
        }
      ]
    );
  };

  const handleEditEvent = (eventId: string) => {
    navigation.navigate('EditEvent', { eventId });
  };

  const handleViewDetails = (eventId: string) => {
    navigation.navigate('AttendanceList', { eventId });
  };

  const handleScanForEvent = (eventId: string) => {
    navigation.navigate('IDScanner', { eventId });
  };

  const renderEventItem = ({ item }: { item: any }) => {
    const isPast = item.date ? new Date(item.date) < now : false;
    const eventEmoji = getEventEmoji(item);
    
    return (
      <View style={[styles.eventCard, isPast && styles.pastEventCard]}>
        <View style={styles.eventCardContent}>
          <View style={styles.eventCardHeader}>
            <View style={styles.eventNameContainer}>
              <View style={styles.emojiContainer}>
                <Text style={styles.emojiText}>{eventEmoji}</Text>
              </View>
              <Text style={styles.eventName}>{item.name}</Text>
            </View>
            <Text style={styles.eventDate}>{formatDate(item.date)}</Text>
          </View>
          
          <View style={styles.eventCardStats}>
            <View style={styles.eventStat}>
              <Ionicons name="people-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.eventStatText}>
                {item.attendees?.length || 0} attendees
              </Text>
            </View>
            {isPast && (
              <View style={styles.pastEventBadge}>
                <Text style={styles.pastEventText}>Past Event</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]} 
            onPress={() => handleViewDetails(item.id)}
          >
            <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.actionButtonText, styles.viewButtonText]}>View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]} 
            onPress={() => handleEditEvent(item.id)}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.secondary} />
            <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.scanButton]} 
            onPress={() => handleScanForEvent(item.id)}
          >
            <Ionicons name="scan-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.actionButtonText, styles.scanButtonText]}>Scan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => handleDeleteEvent(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.danger || "#F44336"} />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {filterType === 'past' ? 'Past Events' : 'All Events'}
        </Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Events List */}
      {filteredEvents.length > 0 ? (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={80} color={COLORS.grayLight} />
          <Text style={styles.emptyTitle}>
            {filterType === 'past' ? 'No Past Events' : 'No Events Found'}
          </Text>
          <Text style={styles.emptyText}>
            {filterType === 'past' 
              ? 'You have no past events to display.' 
              : 'You haven\'t created any events yet.'}
          </Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <Text style={styles.createButtonText}>Create New Event</Text>
          </TouchableOpacity>
        </View>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    ...SHADOWS.light,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
  pastEventCard: {
    
    opacity: 0.5,
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  pastEventBadge: {
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pastEventText: {
    fontSize: 12,
    color: COLORS.grayDark,
    fontWeight: '600',
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
  editButton: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
  },
  editButtonText: {
    color: COLORS.secondary,
  },
  scanButton: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
  },
  scanButtonText: {
    color: COLORS.primary,
  },
  deleteButton: {
  },
  deleteButtonText: {
    color: COLORS.danger || "#F44336",
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 16,
  },
}); 