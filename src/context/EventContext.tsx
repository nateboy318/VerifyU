import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Student } from '../types';
import { Event } from '../types/organization';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db, eventsRef, usersRef } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { getCurrentUser, onAuthStateChange, createEvent as createFirebaseEvent } from '../services/firebase';
import { User } from '../types/organization';

// Context types
export interface EventContextType {
  events: Event[];
  loading: boolean;
  error: Error | null;
  refreshEvents: () => Promise<void>;
  createEvent: (eventData: Partial<Event>, userId: string, organizationId?: string) => Promise<Event>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  getEventById: (eventId: string) => Event | undefined;
  addStudentToEvent: (eventId: string, student: Student) => Promise<void>;
  getAttendanceForEvent: (eventId: string) => Student[];
  removeStudentFromEvent: (eventId: string, studentId: string) => Promise<void>;
  clearAttendanceForEvent: (eventId: string) => Promise<void>;
  getAttendanceCountForToday: () => number;
  exportAttendanceToCSV: (eventId: string) => string;
  downloadCSV: (eventId: string) => Promise<void>;
  createLocalEvent: (eventData: { 
    name: string; 
    location?: string; 
    startDate: string;
    endDate: string;
  }) => Promise<void>;
}

// Create context with default values
export const EventContext = createContext<EventContextType>({
  events: [],
  loading: true,
  error: null,
  refreshEvents: async () => {},
  createEvent: async () => ({ id: '', name: '', startDate: '', endDate: '', date: '', createdBy: '', createdAt: '', organizationId: null, isActive: true, attendanceCount: 0 }),
  updateEvent: async () => {},
  deleteEvent: async () => {},
  getEventById: () => undefined,
  addStudentToEvent: async () => {},
  getAttendanceForEvent: () => [],
  removeStudentFromEvent: async () => {},
  clearAttendanceForEvent: async () => {},
  getAttendanceCountForToday: () => 0,
  exportAttendanceToCSV: () => '',
  downloadCSV: async () => {},
  createLocalEvent: async () => {},
});

// Hook for using the context
export const useEvents = () => useContext(EventContext);

// Provider component
export const EventProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  // Function to fetch all events for the current user
  const fetchEvents = useCallback(async () => {
    if (!currentUser?.uid) {
      setEvents([]);
      return;
    }

    try {
      // 1. Get personal events (created by the user)
      const personalEventsQuery = query(
        collection(db, 'events'),
        where('createdBy', '==', currentUser.uid)
      );
      
      const personalEventsSnapshot = await getDocs(personalEventsQuery);
      const personalEvents = personalEventsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Event));
      
      // 2. Get user document to check for organizations
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      const userOrganizations = userData?.organizations || [];
      
      let allEvents: Event[] = [...personalEvents];
      
      // 3. Get organization events if user has organizations
      if (userOrganizations && userOrganizations.length > 0) {
        for (const orgId of userOrganizations) {
          try {
            const orgEventsQuery = query(
              collection(db, 'events'),
              where('organizationId', '==', orgId)
            );
            
            const orgEventsSnapshot = await getDocs(orgEventsQuery);
            const orgEvents = orgEventsSnapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id
            } as Event));
            
            // Add to all events, avoiding duplicates
            for (const event of orgEvents) {
              if (!allEvents.some(e => e.id === event.id)) {
                allEvents.push(event);
              }
            }
          } catch (error) {
            console.error(`Error fetching events for organization ${orgId}:`, error);
          }
        }
      }
      
      // 4. Sort events by date
      allEvents.sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      
      // 5. Add attendance data
      const eventsWithAttendance = await Promise.all(allEvents.map(async (event) => {
        try {
          const metadataRef = doc(db, `events/${event.id}/attendance/metadata`);
          const metadataDoc = await getDoc(metadataRef);
          const metadata = metadataDoc.data() || { totalAttendees: 0 };

          return {
            ...event,
            attendanceCount: metadata.totalAttendees
          };
        } catch (error) {
          return {
            ...event,
            attendanceCount: 0
          };
        }
      }));
      
      return eventsWithAttendance;
    } catch (error) {
      throw error;
    }
  }, [currentUser?.uid]);

  // Function to refresh events (can be called from components)
  const refreshEvents = useCallback(async () => {
    if (!currentUser?.uid) {
      setEvents([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const refreshedEvents = await fetchEvents();
      if (refreshedEvents) {
        setEvents(refreshedEvents);
      }
    } catch (error) {
      console.error('Error refreshing events:', error);
      setError(error instanceof Error ? error : new Error('Unknown error refreshing events'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, fetchEvents]);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Initial load of events when user changes
  useEffect(() => {
    refreshEvents();
  }, [currentUser?.uid, refreshEvents]);

  // Create a new event
  const createEvent = async (eventData: Partial<Event>, userId: string, organizationId?: string): Promise<Event> => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    try {
      const newEvent = await createFirebaseEvent(eventData, currentUser.uid, organizationId);
      // Refresh events after creating a new one
      refreshEvents();
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  };

  // Update an existing event
  const updateEvent = async (event: Event): Promise<void> => {
    const eventRef = doc(eventsRef, event.id);
    const { id, ...eventWithoutId } = event;
    await updateDoc(eventRef, eventWithoutId);
    // Refresh events after updating
    refreshEvents();
  };

  // Delete an event
  const deleteEvent = async (eventId: string): Promise<void> => {
    const eventRef = doc(eventsRef, eventId);
    await deleteDoc(eventRef);
    // Refresh events after deleting
    refreshEvents();
  };

  // Get an event by ID
  const getEventById = (eventId: string): Event | undefined => {
    return events.find((event) => event.id === eventId);
  };

  // Add a student to an event's attendance
  const addStudentToEvent = async (eventId: string, student: Student): Promise<void> => {
    // Update event attendance count
    setEvents((prevEvents) => 
      prevEvents.map((event) => 
        event.id === eventId 
          ? { ...event, attendanceCount: (event.attendanceCount || 0) + 1 } 
          : event
      )
    );
  };

  // Get attendance for a specific event
  const getAttendanceForEvent = (eventId: string): Student[] => {
    const event = events.find((e) => e.id === eventId);
    return event?.attendees || [];
  };

  // Remove a student from an event's attendance
  const removeStudentFromEvent = async (eventId: string, studentId: string): Promise<void> => {
    // Update event attendance count
    setEvents((prevEvents) => 
      prevEvents.map((event) => 
        event.id === eventId 
          ? { ...event, attendanceCount: Math.max(0, (event.attendanceCount || 0) - 1) } 
          : event
      )
    );
  };

  // Clear all attendance for an event
  const clearAttendanceForEvent = async (eventId: string): Promise<void> => {
    // Update event attendance count
    setEvents((prevEvents) => 
      prevEvents.map((event) => 
        event.id === eventId 
          ? { ...event, attendanceCount: 0 } 
          : event
      )
    );
  };

  // Get attendance count for today
  const getAttendanceCountForToday = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Count all attendees from today's events
    let count = 0;
    events.forEach(event => {
      const eventDate = new Date(event.startDate);
      eventDate.setHours(0, 0, 0, 0);
      
      if (eventDate.getTime() === today.getTime()) {
        count += event.attendanceCount || 0;
      }
    });
    
    return count;
  };

  // Export attendance to CSV
  const exportAttendanceToCSV = (eventId: string): string => {
    const event = events.find(event => event.id === eventId);
    if (!event?.attendees) {
      return '';
    }

    const csvRows = [
      ['ID', 'Name', 'Timestamp'], // Header row
      ...event.attendees.map(student => [student.id, student.name, student.timestamp.toISOString()]) // Data rows
    ];

    return csvRows.map(row => row.join(',')).join('\n');
  };

  // Download CSV
  const downloadCSV = async (eventId: string): Promise<void> => {
    const csvData = exportAttendanceToCSV(eventId);
    if (csvData) {
      const fileUri = FileSystem.documentDirectory + `attendance_${eventId}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvData, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file using Expo's Sharing API
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert('No attendance data found for this event.');
    }
  };

  // Create a local event
  const createLocalEvent = async (eventData: { 
    name: string; 
    location?: string; 
    startDate: string;
    endDate: string;
  }): Promise<void> => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const newEvent = await createEvent(eventData, currentUser.uid);
      setEvents(prevEvents => [...prevEvents, newEvent]);
    } catch (error) {
      console.error('Error creating local event:', error);
      throw error;
    }
  };

  return (
    <EventContext.Provider
      value={{
        events,
        loading,
        error,
        refreshEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        getEventById,
        addStudentToEvent,
        getAttendanceForEvent,
        removeStudentFromEvent,
        clearAttendanceForEvent,
        getAttendanceCountForToday,
        exportAttendanceToCSV,
        downloadCSV,
        createLocalEvent,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}; 