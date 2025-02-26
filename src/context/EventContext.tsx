import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event, Student } from '../types';

// Storage keys
const EVENTS_STORAGE_KEY = 'cardinalscanner_events';
const ATTENDANCE_STORAGE_KEY = 'cardinalscanner_attendance';

// Attendance record structure
interface AttendanceRecord {
  eventId: string;
  students: Student[];
}

// Context types
interface EventContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  createEvent: (event: Omit<Event, 'id' | 'createdAt' | 'attendanceCount'>) => Promise<Event>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  getEventById: (eventId: string) => Event | undefined;
  // Added attendance-related methods
  addStudentToEvent: (eventId: string, student: Student) => Promise<void>;
  getAttendanceForEvent: (eventId: string) => Student[];
  removeStudentFromEvent: (eventId: string, studentId: string) => Promise<void>;
  clearAttendanceForEvent: (eventId: string) => Promise<void>;
  getAttendanceCountForToday: () => number;
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
      attendanceCount: 0,
      createdAt: new Date().toISOString()
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
  // Default implementations for new attendance functions
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
  }
};

// Create context with default safe values
const EventContext = createContext<EventContextType>(defaultEventContext);

// Provider props
interface EventProviderProps {
  children: ReactNode;
}

// Provider component
export const EventProvider = ({ children }: EventProviderProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('EventProvider mounted');
    return () => console.log('EventProvider unmounted');
  }, []);

  // Load events and attendance from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading events and attendance from storage');
        setLoading(true);
        
        // Load events
        const storedEvents = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
        if (storedEvents) {
          console.log('Found stored events:', storedEvents);
          setEvents(JSON.parse(storedEvents));
        } else {
          console.log('No stored events found');
        }
        
        // Load attendance
        const storedAttendance = await AsyncStorage.getItem(ATTENDANCE_STORAGE_KEY);
        if (storedAttendance) {
          console.log('Found stored attendance');
          const parsedAttendance = JSON.parse(storedAttendance);
          
          // Convert string timestamps back to Date objects
          const rehydratedAttendance = parsedAttendance.map((record: AttendanceRecord) => ({
            ...record,
            students: record.students.map(student => ({
              ...student,
              timestamp: student.timestamp ? new Date(student.timestamp) : new Date()
            }))
          }));
          
          setAttendance(rehydratedAttendance);
        } else {
          console.log('No stored attendance found');
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
        console.log('Finished loading data');
      }
    };

    loadData();
  }, []);

  // Save events to storage whenever they change
  useEffect(() => {
    const saveEvents = async () => {
      try {
        await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
        console.log('Saved events to storage:', events.length);
      } catch (err) {
        console.error('Failed to save events:', err);
        setError('Failed to save events');
      }
    };

    // Skip saving on initial load when events are empty
    if (!loading) {
      saveEvents();
    }
  }, [events, loading]);

  // Save attendance to storage whenever it changes
  useEffect(() => {
    const saveAttendance = async () => {
      try {
        await AsyncStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendance));
        console.log('Saved attendance to storage');
      } catch (err) {
        console.error('Failed to save attendance:', err);
        setError('Failed to save attendance');
      }
    };

    // Skip saving on initial load
    if (!loading) {
      saveAttendance();
    }
  }, [attendance, loading]);

  // Generate a unique ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // Create a new event
  const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'attendanceCount'>): Promise<Event> => {
    console.log('Creating new event:', eventData);
    const newEvent: Event = {
      id: generateId(),
      ...eventData,
      attendanceCount: 0,
      createdAt: new Date().toISOString(),
    };

    setEvents((prevEvents) => [...prevEvents, newEvent]);
    return newEvent;
  };

  // Update an existing event
  const updateEvent = async (updatedEvent: Event): Promise<void> => {
    console.log('Updating event:', updatedEvent.id);
    setEvents((prevEvents) => 
      prevEvents.map((event) => 
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
  };

  // Delete an event
  const deleteEvent = async (eventId: string): Promise<void> => {
    console.log('Deleting event:', eventId);
    setEvents((prevEvents) => prevEvents.filter((event) => event.id !== eventId));
    
    // Also clear attendance for this event
    await clearAttendanceForEvent(eventId);
  };

  // Get an event by ID
  const getEventById = (eventId: string): Event | undefined => {
    return events.find((event) => event.id === eventId);
  };

  // Add a student to an event's attendance
  const addStudentToEvent = async (eventId: string, student: Student): Promise<void> => {
    console.log('Adding student to event:', eventId, student);
    
    setAttendance((prevAttendance) => {
      // Find if there's an existing attendance record for this event
      const existingRecordIndex = prevAttendance.findIndex(record => record.eventId === eventId);
      
      if (existingRecordIndex >= 0) {
        // Update existing attendance record
        const updatedAttendance = [...prevAttendance];
        updatedAttendance[existingRecordIndex] = {
          ...updatedAttendance[existingRecordIndex],
          students: [...updatedAttendance[existingRecordIndex].students, student]
        };
        return updatedAttendance;
      } else {
        // Create new attendance record
        return [...prevAttendance, {
          eventId,
          students: [student]
        }];
      }
    });
    
    // Update event attendance count
    setEvents((prevEvents) => 
      prevEvents.map((event) => 
        event.id === eventId 
          ? { ...event, attendanceCount: event.attendanceCount + 1 } 
          : event
      )
    );
  };

  // Get attendance for a specific event
  const getAttendanceForEvent = (eventId: string): Student[] => {
    const record = attendance.find(record => record.eventId === eventId);
    return record ? record.students : [];
  };

  // Remove a student from an event's attendance
  const removeStudentFromEvent = async (eventId: string, studentId: string): Promise<void> => {
    console.log('Removing student from event:', eventId, studentId);
    
    setAttendance((prevAttendance) => {
      // Find the event attendance record
      const existingRecordIndex = prevAttendance.findIndex(record => record.eventId === eventId);
      
      if (existingRecordIndex >= 0) {
        const updatedAttendance = [...prevAttendance];
        // Filter out the student
        updatedAttendance[existingRecordIndex] = {
          ...updatedAttendance[existingRecordIndex],
          students: updatedAttendance[existingRecordIndex].students.filter(
            student => student.id !== studentId
          )
        };
        return updatedAttendance;
      }
      
      return prevAttendance;
    });
    
    // Update event attendance count
    setEvents((prevEvents) => 
      prevEvents.map((event) => 
        event.id === eventId 
          ? { ...event, attendanceCount: Math.max(0, event.attendanceCount - 1) } 
          : event
      )
    );
  };

  // Clear all attendance for an event
  const clearAttendanceForEvent = async (eventId: string): Promise<void> => {
    console.log('Clearing attendance for event:', eventId);
    
    setAttendance((prevAttendance) => 
      prevAttendance.filter(record => record.eventId !== eventId)
    );
    
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
        event.attendees.forEach(attendee => {
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

  const contextValue = {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    addStudentToEvent,
    getAttendanceForEvent,
    removeStudentFromEvent,
    clearAttendanceForEvent,
    getAttendanceCountForToday,
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
  // Now we return the context which always has a default value
  return context;
}; 