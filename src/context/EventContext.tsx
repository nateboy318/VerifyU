import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Student } from '../types';
import { Event } from '../types/organization';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db, eventsRef, usersRef } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getCurrentUser, onAuthStateChange, createEvent as createFirebaseEvent } from '../services/firebase';
import { User } from '../types/organization';

// Context types
export interface EventContextType {
  events: Event[];
  loading: boolean;
  error: Error | null;
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

// Create a default implementation that doesn't throw errors
const defaultEventContext: EventContextType = {
  events: [],
  loading: false,
  error: null,
  createEvent: async () => {
    console.warn('createEvent called outside of EventProvider');
    return {
      id: '0',
      name: 'Default Event',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      date: new Date().toISOString(),
      attendanceCount: 0,
      createdAt: new Date().toISOString(),
      attendees: []
    };
  },
  updateEvent: async () => {
    console.warn('updateEvent called outside of EventProvider');
  },
  deleteEvent: async () => {
    console.warn('deleteEvent called outside of EventProvider');
  },
  getEventById: () => {
    console.warn('getEventById called outside of EventProvider');
    return undefined;
  },
  addStudentToEvent: async () => {
    console.warn('addStudentToEvent called outside of EventProvider');
  },
  getAttendanceForEvent: () => {
    console.warn('getAttendanceForEvent called outside of EventProvider');
    return [];
  },
  removeStudentFromEvent: async () => {
    console.warn('removeStudentFromEvent called outside of EventProvider');
  },
  clearAttendanceForEvent: async () => {
    console.warn('clearAttendanceForEvent called outside of EventProvider');
  },
  getAttendanceCountForToday: () => {
    console.warn('getAttendanceCountForToday called outside of EventProvider');
    return 0;
  },
  exportAttendanceToCSV: () => {
    console.warn('exportAttendanceToCSV called outside of EventProvider');
    return '';
  },
  downloadCSV: async () => {
    console.warn('downloadCSV called outside of EventProvider');
  },
  createLocalEvent: async () => {
    console.warn('createLocalEvent called outside of EventProvider');
  }
};

// Create context with default safe values
export const EventContext = createContext<EventContextType>(defaultEventContext);

// Provider props
interface EventProviderProps {
  children: ReactNode;
}

// Provider component
export const EventProvider = ({ children }: EventProviderProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  useEffect(() => {
    console.log('EventProvider mounted');
    
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      console.log('Auth state changed - User:', user?.uid);
      setCurrentUser(user);
    });

    return () => {
      console.log('EventProvider unmounted');
      unsubscribe();
    };
  }, []);

  // Set up real-time listeners for events when user changes
  useEffect(() => {
    if (!currentUser) {
      console.log('No authenticated user, clearing events');
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('Setting up event listeners for user:', currentUser.uid);

    // Create queries
    const createdEventsQuery = query(
      collection(db, 'events'),
      where('createdBy', '==', currentUser.uid)
    );

    let unsubscribeCreated: () => void;
    let unsubscribeOrg: () => void;
    let unsubscribeUser: () => void;

    // Function to update events with attendance data
    const updateEventsWithAttendance = async (rawEvents: Event[]) => {
      const eventsWithAttendance = await Promise.all(rawEvents.map(async (event) => {
        try {
          const metadataRef = doc(db, `events/${event.id}/attendance/metadata`);
          const metadataDoc = await getDoc(metadataRef);
          const metadata = metadataDoc.data() || { totalAttendees: 0 };

          return {
            ...event,
            attendanceCount: metadata.totalAttendees
          };
        } catch (error) {
          console.error(`Error getting attendance for event ${event.id}:`, error);
          return {
            ...event,
            attendanceCount: 0
          };
        }
      }));

      return eventsWithAttendance;
    };

    // Set up listener for created events
    unsubscribeCreated = onSnapshot(createdEventsQuery, async (snapshot) => {
      console.log('Created events updated:', snapshot.size);
      const createdEvents = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Event));

      // Get user's organizations
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      const userOrganizations = userData?.organizations || [];

      // If user has organizations, set up listener for org events
      if (userOrganizations.length > 0) {
        const orgEventsQuery = query(
          collection(db, 'events'),
          where('organizationId', 'in', userOrganizations),
          where('createdBy', '!=', currentUser.uid),
          orderBy('createdBy'),
          orderBy('startDate', 'desc')
        );

        unsubscribeOrg = onSnapshot(orgEventsQuery, async (orgSnapshot) => {
          console.log('Organization events updated:', orgSnapshot.size);
          const orgEvents = orgSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          } as Event));

          // Combine and update all events
          const allEvents = [...createdEvents, ...orgEvents].sort((a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );

          const eventsWithAttendance = await updateEventsWithAttendance(allEvents);
          setEvents(eventsWithAttendance);
          setLoading(false);
        });
      } else {
        // If no organizations, just update with created events
        const eventsWithAttendance = await updateEventsWithAttendance(createdEvents);
        setEvents(eventsWithAttendance);
        setLoading(false);
      }
    });

    // Set up listener for user document to detect organization changes
    unsubscribeUser = onSnapshot(doc(db, 'users', currentUser.uid), (userDoc) => {
      console.log('User document updated');
      // This will trigger a re-render and update the organization events
    });

    return () => {
      console.log('Cleaning up event listeners');
      unsubscribeCreated?.();
      unsubscribeOrg?.();
      unsubscribeUser?.();
    };
  }, [currentUser]);

  // Create a new event
  const createEvent = async (eventData: Partial<Event>, userId: string, organizationId?: string): Promise<Event> => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    try {
      return await createFirebaseEvent(eventData, currentUser.uid, organizationId);
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  };

  // Update an existing event
  const updateEvent = async (event: Event): Promise<void> => {
    // No need to manually update events array - snapshot listener will handle it
    // Just update the document in Firestore
    const eventRef = doc(eventsRef, event.id);
    const { id, ...eventWithoutId } = event;
    await updateDoc(eventRef, eventWithoutId);
  };

  // Delete an event
  const deleteEvent = async (eventId: string): Promise<void> => {
    // No need to manually update events array - snapshot listener will handle it
    // Just delete the document from Firestore
    const eventRef = doc(eventsRef, eventId);
    await deleteDoc(eventRef);
  };

  // Get an event by ID
  const getEventById = (eventId: string): Event | undefined => {
    return events.find((event) => event.id === eventId);
  };

  // Add a student to an event's attendance
  const addStudentToEvent = async (eventId: string, student: Student): Promise<void> => {
    console.log('Adding student to event:', eventId, student);
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
    const event = events.find(event => event.id === eventId);
    return event?.attendees || [];
  };

  // Remove a student from an event's attendance
  const removeStudentFromEvent = async (eventId: string, studentId: string): Promise<void> => {
    console.log('Removing student from event:', eventId, studentId);
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
    console.log('Clearing attendance for event:', eventId);
    // Reset event attendance count
    setEvents((prevEvents) => 
      prevEvents.map((event) => 
        event.id === eventId 
          ? { ...event, attendanceCount: 0 } 
          : event
      )
    );
  };

  // Add a function to get today's attendance count
  const getAttendanceCountForToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayCount = 0;
    
    // Go through all events and count attendees scanned today
    events.forEach(event => {
      if (event.attendees) {
        event.attendees.forEach((attendee: { scanTimestamp: string | number | Date; }) => {
          if (attendee.scanTimestamp) {
            const scanDate = new Date(attendee.scanTimestamp);
            scanDate.setHours(0, 0, 0, 0);
            
            if (scanDate.getTime() === today.getTime()) {
              todayCount++;
            }
          }
        });
      }
    });
    
    return todayCount;
  }, [events]);

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

  const downloadCSV = async (eventId: string) => {
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

  const createLocalEvent = async (eventData: { 
    name: string; 
    location?: string; 
    startDate: string;
    endDate: string;
  }) => {
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

  const contextValue = {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById: useCallback((eventId: string) => events.find(event => event.id === eventId), [events]),
    addStudentToEvent,
    getAttendanceForEvent,
    removeStudentFromEvent,
    clearAttendanceForEvent,
    getAttendanceCountForToday,
    exportAttendanceToCSV,
    downloadCSV,
    createLocalEvent,
  };

  console.log('EventProvider rendering with events:', events.length);

  return (
    <EventContext.Provider value={contextValue}>
      {children}
    </EventContext.Provider>
  );
};

// Custom hook to use the event context
export const useEvents = (): EventContextType => {
  const context = useContext(EventContext);
  return context;
}; 