import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    User as FirebaseUser,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    signInWithCredential,
    OAuthProvider,
} from 'firebase/auth';

import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    orderBy,
    arrayUnion,
    onSnapshot,
    DocumentData,
    QuerySnapshot,
    CollectionReference,
    enableIndexedDbPersistence,
    getDoc,
    increment,
    addDoc,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { Organization, Event, Attendance, User, JoinCodeResponse } from '../types/organization';
import { COLORS } from '../constants/theme';
import * as AppleAuthentication from 'expo-apple-authentication';

// Initialize Firebase - you'll need to replace these with your Firebase config
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Debug Firebase config
console.log('Firebase Config:', {
    apiKey: firebaseConfig.apiKey ? '✓ present' : '✗ missing',
    authDomain: firebaseConfig.authDomain ? '✓ present' : '✗ missing',
    projectId: firebaseConfig.projectId ? '✓ present' : '✗ missing',
    storageBucket: firebaseConfig.storageBucket ? '✓ present' : '✗ missing',
    messagingSenderId: firebaseConfig.messagingSenderId ? '✓ present' : '✗ missing',
    appId: firebaseConfig.appId ? '✓ present' : '✗ missing',
});

// Initialize Firebase
if (!firebaseConfig.apiKey) {
    console.error('Firebase configuration is missing. Please check your .env file and ensure all values are set correctly.');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable Firestore persistence
enableIndexedDbPersistence(db)
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.warn('The current browser does not support persistence.');
        }
    });

// Collection references
export const organizationsRef = collection(db, 'organizations');
export const usersRef = collection(db, 'users');
export const eventsRef = collection(db, 'events');
export const attendanceRef = collection(db, 'attendance');

export const generateJoinCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createOrganization = async (
    name: string,
    description: string,
    userId: string,
    color: string = COLORS.primary
): Promise<Organization> => {
    const joinCode = generateJoinCode();
    
    // Log the input color to verify it's coming through
    console.log('Creating organization with color:', color);
    
    // Create organization object with explicit color property
    const organization: Organization = {
        id: uuidv4(),
        name,
        description,
        color, // Ensure color is included
        joinCode,
        createdAt: Date.now(),
        createdBy: userId,
        members: [userId],
        admins: [userId],
        events: [],
    };

    // Log the full organization object before saving
    console.log('Organization object to save:', JSON.stringify(organization));

    const orgRef = doc(organizationsRef, organization.id);
    const userRef = doc(usersRef, userId);

    // Use explicit spread to ensure all fields are included
    await setDoc(orgRef, {...organization});
    
    // Verify the document was written with the color field
    const savedDoc = await getDoc(orgRef);
    console.log('Saved organization data:', savedDoc.data());
    
    await updateDoc(userRef, {
        organizations: arrayUnion(organization.id),
    });

    return organization;
};

export const joinOrganization = async (joinCode: string, userId: string): Promise<Organization | null> => {
  try {
    console.log('Attempting to join organization with code:', joinCode);
    
    // Find the organization with this join code
    const orgsQuery = query(
      organizationsRef,
      where('joinCode', '==', joinCode)
    );
    
    const snapshot = await getDocs(orgsQuery);
    
    if (snapshot.empty) {
      console.log('No organization found with join code:', joinCode);
      return null; // No organization found with this code
    }
    
    const orgDoc = snapshot.docs[0];
    const organization = { ...orgDoc.data(), id: orgDoc.id } as Organization;
    
    console.log('Found organization:', organization.name);
    
    // Check if user is already a member
    if (organization.members && organization.members.includes(userId)) {
      console.log('User is already a member of this organization');
      return organization; // User is already a member
    }
    
    // Update organization members
    const orgRef = doc(organizationsRef, organization.id);
    await updateDoc(orgRef, {
      members: arrayUnion(userId)
    });
    console.log('Added user to organization members');
    
    // Update user's organizations array - FIXED VERSION
    try {
      const userRef = doc(usersRef, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          organizations: arrayUnion(organization.id)
        });
        console.log('Added organization to user document');
      } else {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          id: userId,
          organizations: [organization.id]
        });
        console.log('Created new user document with organization');
      }
    } catch (userError) {
      console.error('Error updating user document:', userError);
      // Continue anyway since the user is already added to org
    }
    
    console.log('Successfully joined organization');
    return organization;
  } catch (error) {
    console.error('Error joining organization:', error);
    throw error;
  }
};

export const createEvent = async (eventData: any, userId: string, organizationId?: string) => {
  try {
    const eventsCollection = collection(db, 'events');
    
    // Remove undefined values from eventData
    const cleanEventData = Object.fromEntries(
      Object.entries(eventData).filter(([_, value]) => value !== undefined)
    );
    
    const newEvent = {
      // Default values for required fields
      name: '',
      startDate: '',
      endDate: '',
      isActive: true,
      // Override with cleaned data
      ...cleanEventData,
      // Add additional fields
      createdBy: userId,
      createdAt: new Date().toISOString(),
      date: eventData.startDate || '',
      organizationId: organizationId || null,
      attendanceCount: 0,
      emoji: eventData.emoji || '📅'
    };
    
    console.log('Saving event with emoji:', newEvent.emoji);
    
    const docRef = await addDoc(eventsCollection, newEvent);
    return {
      id: docRef.id,
      ...newEvent
    };
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

export const markAttendance = async (
    eventId: string,
    userId: string,
    checkedInBy: string,
    status: 'present' | 'absent' | 'late',
    notes?: string,
    imagePath?: string
): Promise<Attendance> => {
    const attendance: Attendance = {
        id: uuidv4(),
        eventId,
        userId,
        timestamp: Date.now(),
        status,
        notes,
        checkedInBy,
        imagePath
    };

    try {
        // Add attendance record to the event's attendance subcollection
        const eventAttendanceRef = collection(db, `events/${eventId}/attendance`);
        await setDoc(doc(eventAttendanceRef, attendance.id), attendance);

        // Get the metadata document
        const metadataRef = doc(eventAttendanceRef, 'metadata');
        const metadataDoc = await getDoc(metadataRef);

        // Create or update metadata
        if (!metadataDoc.exists()) {
            // Create new metadata document if it doesn't exist
            await setDoc(metadataRef, {
                totalAttendees: 1,
                lastUpdated: Date.now()
            });
        } else {
            // Update existing metadata
            await updateDoc(metadataRef, {
                totalAttendees: increment(1),
                lastUpdated: Date.now()
            });
        }

        // Add to main attendance collection for global queries
        const mainAttendanceRef = doc(attendanceRef, attendance.id);
        await setDoc(mainAttendanceRef, attendance);

        return attendance;
    } catch (error) {
        console.error('Error marking attendance:', error);
        throw error;
    }
};

export const getOrganizationById = async (organizationId: string): Promise<Organization | null> => {
    try {
      const orgRef = doc(db, 'organizations', organizationId);
      const orgDoc = await getDoc(orgRef);
      
      if (orgDoc.exists()) {
        return {
          id: orgDoc.id,
          ...orgDoc.data()
        } as Organization;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  };

export const getEventDetails = async (eventId: string): Promise<{ event: Event; attendance: Attendance[] }> => {
    // Get event details
    const eventRef = doc(eventsRef, eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
        throw new Error('Event not found');
    }

    const event = eventDoc.data() as Event;

    // Get attendance records for this event
    const eventAttendanceRef = collection(db, `events/${eventId}/attendance`);
    const attendanceQuery = query(
        eventAttendanceRef,
        orderBy('timestamp', 'desc')
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);
    const attendance = attendanceSnapshot.docs
        .filter(doc => doc.id !== 'metadata')
        .map(doc => ({
            ...doc.data(),
            id: doc.id
        } as Attendance));

    return { event, attendance };
};

export const getOrganizationEvents = async (organizationId: string): Promise<Event[]> => {
  try {
    console.log('Fetching events for organization:', organizationId);
    
    // Query all events for this organization
    const eventsQuery = query(
      eventsRef,
      where('organizationId', '==', organizationId),
      orderBy('startDate', 'desc')
    );
    
    const eventsSnapshot = await getDocs(eventsQuery);
    console.log('Found events:', eventsSnapshot.size);
    
    // Map the events data
    const events = eventsSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Event));
    
    // Get attendance counts for each event
    const eventsWithAttendance = await Promise.all(events.map(async (event) => {
      try {
        const metadataRef = doc(db, `events/${event.id}/attendance/metadata`);
        const metadataDoc = await getDoc(metadataRef);
        const metadata = metadataDoc.data() || { totalAttendees: 0 };
        
        return {
          ...event,
          attendanceCount: metadata.totalAttendees || 0
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
  } catch (error) {
    console.error('Error in getOrganizationEvents:', error);
    throw error;
  }
};

export const getEventAttendance = async (eventId: string): Promise<Attendance[]> => {
    const eventAttendanceRef = collection(db, `events/${eventId}/attendance`);
    const attendanceQuery = query(
        eventAttendanceRef,
        orderBy('timestamp', 'desc')
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);
    return attendanceSnapshot.docs
        .filter(doc => doc.id !== 'metadata')
        .map(doc => ({
            ...doc.data(),
            id: doc.id
        } as Attendance));
};

export const getUserEvents = async (userId: string): Promise<Event[]> => {
    try {
        console.log('getUserEvents - Starting fetch for user:', userId);

        // Get user's organizations first
        const userDoc = await getDoc(doc(usersRef, userId));
        const userData = userDoc.data() as User;
        const userOrganizations = userData?.organizations || [];
        
        console.log('User organizations:', userOrganizations);

        // Get all events created by the user
        const createdEventsQuery = query(
            eventsRef,
            where('createdBy', '==', userId)
        );

        let createdEvents: Event[] = [];
        try {
            const createdEventsSnapshot = await getDocs(createdEventsQuery);
            createdEvents = createdEventsSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            } as Event));
        } catch (error) {
            console.error('Error fetching created events:', error);
        }

        // Get ALL organization events for organizations the user is a member of
        let orgEvents: Event[] = [];
        if (userOrganizations.length > 0) {
            try {
                const organizationEventsQuery = query(
                    eventsRef,
                    where('organizationId', 'in', userOrganizations),
                    orderBy('startDate', 'desc')
                );

                const orgEventsSnapshot = await getDocs(organizationEventsQuery);
                orgEvents = orgEventsSnapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                } as Event));
            } catch (error) {
                console.error('Error fetching organization events:', error);
            }
        }

        // Remove duplicates (events that might be in both queries)
        const createdEventIds = new Set(createdEvents.map(e => e.id));
        const uniqueOrgEvents = orgEvents.filter(event => !createdEventIds.has(event.id));

        // Combine and sort all events
        const allEvents = [...createdEvents, ...uniqueOrgEvents].sort((a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );

        // Get attendance counts
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
                console.error(`Error getting attendance for event ${event.id}:`, error);
                return {
                    ...event,
                    attendanceCount: 0
                };
            }
        }));

        console.log('getUserEvents - Final results:', {
            createdEventsCount: createdEvents.length,
            orgEventsCount: orgEvents.length,
            uniqueOrgEventsCount: uniqueOrgEvents.length,
            totalEventsCount: eventsWithAttendance.length
        });

        return eventsWithAttendance;
    } catch (error) {
        console.error('Error in getUserEvents:', error);
        throw error;
    }
};

// Get current user
export const getCurrentUser = (): FirebaseUser | null => {
    return auth.currentUser;
};

// Create user document in Firestore
export const createUserDocument = async (user: FirebaseUser): Promise<void> => {
    if (!user.email) return;

    try {
        // First check if user document already exists
        const userRef = doc(usersRef, user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // User exists - only update fields that might have changed
            // without touching the organizations array
            await updateDoc(userRef, {
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
            });
            console.log('Updated existing user document, preserving organizations');
        } else {
            // New user - create complete document with empty organizations
            const userDoc = {
                id: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                organizations: [],
            };
            await setDoc(userRef, userDoc);
            console.log('Created new user document with empty organizations');
        }
    } catch (error) {
        console.error('Error in createUserDocument:', error);
    }
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, (user) => {
        console.log('Firebase auth state changed:', user?.uid);
        callback(user);
    });
};

// Authentication functions
export const signUp = async (email: string, password: string): Promise<FirebaseUser> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await createUserDocument(userCredential.user);
    return userCredential.user;
};

export const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
};

export const logOut = async (): Promise<void> => {
    await signOut(auth);
};

export const signInWithApple = async (): Promise<FirebaseUser> => {
  try {
    // First, perform Apple authentication
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Create an OAuthProvider credential
    const provider = new OAuthProvider('apple.com');
    const authCredential = provider.credential({
      idToken: appleCredential.identityToken || '',
    });

    // Sign in to Firebase with the Apple OAuth credential
    const userCredential = await signInWithCredential(auth, authCredential);
    
    // If this is a new user, create their document
    await createUserDocument(userCredential.user);
    
    // Check if we need to update the name (Apple only provides it on first sign in)
    if (appleCredential.fullName && 
        (appleCredential.fullName.givenName || appleCredential.fullName.familyName)) {
      const displayName = [
        appleCredential.fullName.givenName,
        appleCredential.fullName.familyName
      ].filter(Boolean).join(' ');
      
      if (displayName) {
        const userRef = doc(usersRef, userCredential.user.uid);
        await updateDoc(userRef, { displayName });
      }
    }
    
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in with Apple:', error);
    throw error;
  }
};

export { auth, db };

// Add this function to debug events
export const debugOrganizationEvents = async (organizationId: string): Promise<void> => {
  try {
    console.log(`Debugging events for organization: ${organizationId}`);
    
    // Get the organization
    const orgDoc = await getDoc(doc(organizationsRef, organizationId));
    if (!orgDoc.exists()) {
      console.log('Organization not found');
      return;
    }
    
    const organization = { ...orgDoc.data(), id: orgDoc.id } as Organization;
    console.log('Organization:', {
      id: organization.id,
      name: organization.name,
      members: organization.members.length,
      events: organization.events?.length || 0
    });
    
    // Check events in the organization's events array
    if (organization.events && organization.events.length > 0) {
      console.log(`Organization has ${organization.events.length} events in its events array`);
      
      for (const eventId of organization.events) {
        const eventDoc = await getDoc(doc(eventsRef, eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          console.log(`Event ${eventId}:`, {
            name: eventData.name,
            organizationId: eventData.organizationId,
            hasCorrectOrgId: eventData.organizationId === organizationId
          });
          
          // Fix the event if organizationId is missing or incorrect
          if (eventData.organizationId !== organizationId) {
            console.log(`Fixing organizationId for event ${eventId}`);
            await updateDoc(doc(eventsRef, eventId), {
              organizationId: organizationId
            });
          }
        } else {
          console.log(`Event ${eventId} not found`);
        }
      }
    } else {
      console.log('Organization has no events');
    }
    
    // Check events with organizationId field
    const eventsQuery = query(
      eventsRef,
      where('organizationId', '==', organizationId)
    );
    
    const eventsSnapshot = await getDocs(eventsQuery);
    console.log(`Found ${eventsSnapshot.size} events with organizationId field set to this organization`);
    
    eventsSnapshot.docs.forEach(docSnapshot => {
      const eventData = docSnapshot.data();
      console.log(`Event ${docSnapshot.id}:`, {
        name: eventData.name,
        inOrgEventsArray: organization.events?.includes(docSnapshot.id) || false
      });
      
      // Add event to organization's events array if missing
      if (organization.events && !organization.events.includes(docSnapshot.id)) {
        console.log(`Adding event ${docSnapshot.id} to organization's events array`);
        (async () => {
          await updateDoc(doc(organizationsRef, organizationId), {
            events: arrayUnion(docSnapshot.id)
          });
        })();
      }
    });
  } catch (error) {
    console.error('Error debugging organization events:', error);
  }
};

export const fixAllOrganizationEvents = async (): Promise<void> => {
  try {
    console.log('Starting organization events fix');
    
    // 1. Get all events with organizationId field
    const eventsWithOrgQuery = query(
      eventsRef,
      where('organizationId', '!=', null)
    );
    
    let eventsWithOrg: Event[] = [];
    try {
      const eventsSnapshot = await getDocs(eventsWithOrgQuery);
      eventsWithOrg = eventsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Event));
      console.log(`Found ${eventsWithOrg.length} events with organizationId`);
    } catch (error) {
      console.error('Error querying events with organizationId:', error);
      // If the != null query fails, try a different approach
      const allEventsSnapshot = await getDocs(eventsRef);
      eventsWithOrg = allEventsSnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Event))
        .filter(event => event.organizationId);
      console.log(`Found ${eventsWithOrg.length} events with organizationId (alternative method)`);
    }
    
    // 2. Group events by organizationId
    const eventsByOrg: Record<string, Event[]> = {};
    for (const event of eventsWithOrg) {
      if (!event.organizationId) continue;
      
      if (!eventsByOrg[event.organizationId]) {
        eventsByOrg[event.organizationId] = [];
      }
      eventsByOrg[event.organizationId].push(event);
    }
    
    // 3. Process each organization
    for (const [orgId, orgEvents] of Object.entries(eventsByOrg)) {
      console.log(`Processing organization ${orgId} with ${orgEvents.length} events`);
      
      // Get the organization
      const orgDoc = await getDoc(doc(organizationsRef, orgId));
      if (!orgDoc.exists()) {
        console.log(`Organization ${orgId} not found, creating it`);
        // Create a placeholder organization if it doesn't exist
        await setDoc(doc(organizationsRef, orgId), {
          id: orgId,
          name: 'Auto-created Organization',
          members: [],
          admins: [],
          events: [],
          createdAt: new Date().toISOString()
        });
      }
      
      // Update organization's events array
      const eventIds = orgEvents.map(e => e.id);
      await updateDoc(doc(organizationsRef, orgId), {
        events: eventIds
      });
      
      // Get all members of this organization
      const orgData = orgDoc.exists() ? orgDoc.data() : { members: [] };
      const members = orgData.members || [];
      
      // Update each member's organizations array
      for (const memberId of members) {
        const userRef = doc(usersRef, memberId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          console.log(`Updating user ${memberId} with organization ${orgId}`);
          await updateDoc(userRef, {
            organizations: arrayUnion(orgId)
          });
        }
      }
    }
    
    // 4. Fix all users' organizations arrays
    const usersSnapshot = await getDocs(usersRef);
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Find all organizations where this user is a member
      const userOrgsQuery = query(
        organizationsRef,
        where('members', 'array-contains', userId)
      );
      
      const userOrgsSnapshot = await getDocs(userOrgsQuery);
      const userOrgIds = userOrgsSnapshot.docs.map(doc => doc.id);
      
      if (userOrgIds.length > 0) {
        console.log(`User ${userId} belongs to ${userOrgIds.length} organizations`);
        await updateDoc(doc(usersRef, userId), {
          organizations: userOrgIds
        });
      }
    }
    
    console.log('Organization events fix completed');
  } catch (error) {
    console.error('Error fixing organization events:', error);
  }
}; 