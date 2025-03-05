import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    User as FirebaseUser,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
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
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { Organization, Event, Attendance, User, JoinCodeResponse } from '../types/organization';

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
    userId: string
): Promise<Organization> => {
    const joinCode = generateJoinCode();
    const organization: Organization = {
        id: uuidv4(),
        name,
        description,
        joinCode,
        createdAt: Date.now(),
        createdBy: userId,
        members: [userId],
        admins: [userId],
        events: [],
    };

    const orgRef = doc(organizationsRef, organization.id);
    const userRef = doc(usersRef, userId);

    await setDoc(orgRef, organization);
    await updateDoc(userRef, {
        organizations: arrayUnion(organization.id),
    });

    return organization;
};

export const joinOrganization = async (
    joinCode: string,
    userId: string
): Promise<JoinCodeResponse> => {
    const q = query(
        organizationsRef,
        where('joinCode', '==', joinCode)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { success: false, error: 'Invalid join code' };
    }

    const organization = snapshot.docs[0].data() as Organization;

    if (organization.members.includes(userId)) {
        return { success: false, error: 'Already a member of this organization' };
    }

    const orgRef = doc(organizationsRef, organization.id);
    const userRef = doc(usersRef, userId);

    await updateDoc(orgRef, {
        members: arrayUnion(userId),
    });

    await updateDoc(userRef, {
        organizations: arrayUnion(organization.id),
    });

    return { success: true, organization };
};

export const createEvent = async (
    eventData: Partial<Event>,
    userId: string,
    organizationId?: string
): Promise<Event> => {
    console.log('Creating event with data:', { eventData, userId, organizationId });

    // Create the event object with all required fields
    const event: Event = {
        id: uuidv4(),
        name: eventData.name || '',
        startDate: eventData.startDate || new Date().toISOString(),
        endDate: eventData.endDate || eventData.startDate || new Date().toISOString(),
        date: eventData.startDate || new Date().toISOString(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
        isActive: true,
        attendanceCount: 0,
        // Optional fields
        description: eventData.description || undefined,
        location: eventData.location || undefined,
        organizationId: organizationId || null // Changed undefined to null to match query
    };

    // Remove any undefined values before saving to Firestore
    const cleanEvent = Object.fromEntries(
        Object.entries(event).filter(([_, value]) => value !== undefined)
    );

    console.log('Event to be created:', {
        ...cleanEvent,
        path: `events/${event.id}`,
        hasOrganizationId: cleanEvent.organizationId !== undefined,
        organizationId: cleanEvent.organizationId
    });

    try {
        // Create the event document
        const eventRef = doc(eventsRef, event.id);
        await setDoc(eventRef, cleanEvent);
        console.log('Event document created successfully:', event.id);

        // Verify the event was created
        const createdEventDoc = await getDoc(eventRef);
        console.log('Verification - Event exists:', createdEventDoc.exists());
        console.log('Verification - Event data:', createdEventDoc.data());

        // If this is an organization event, update the organization's events array
        if (organizationId) {
            const orgRef = doc(organizationsRef, organizationId);
            await updateDoc(orgRef, {
                events: arrayUnion(event.id)
            });
            console.log('Organization events array updated for:', organizationId);
        }

        // Create an empty attendance collection for this event with metadata
        const eventAttendanceRef = collection(db, `events/${event.id}/attendance`);
        const metadataRef = doc(eventAttendanceRef, 'metadata');
        await setDoc(metadataRef, {
            totalAttendees: 0,
            lastUpdated: Date.now()
        });
        console.log('Event attendance metadata created');

        return cleanEvent as Event;
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
    const q = query(
        eventsRef,
        where('organizationId', '==', organizationId),
        orderBy('startDate', 'desc')
    );

    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => doc.data() as Event);

    // For each event, get its attendance metadata
    const eventsWithAttendance = await Promise.all(events.map(async (event) => {
        const metadataRef = doc(db, `events/${event.id}/attendance/metadata`);
        const metadataDoc = await getDoc(metadataRef);
        const metadata = metadataDoc.data() || { totalAttendees: 0 };

        return {
            ...event,
            attendanceCount: metadata.totalAttendees
        };
    }));

    return eventsWithAttendance;
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

        // Get ALL events where user is the creator (both local and org events)
        const createdEventsQuery = query(
            eventsRef,
            where('createdBy', '==', userId)
        );

        console.log('getUserEvents - Created events query parameters:', {
            collection: 'events',
            filters: [
                { field: 'createdBy', operator: '==', value: userId }
            ]
        });

        // Get user's organizations first
        const userDoc = await getDoc(doc(usersRef, userId));
        console.log('getUserEvents - User document:', userDoc.exists() ? 'exists' : 'does not exist');
        const userData = userDoc.data() as User;
        console.log('getUserEvents - User data:', userData);
        const userOrganizations = userData?.organizations || [];

        // Get events created by the user
        console.log('getUserEvents - Fetching created events');
        let createdEvents: Event[] = [];
        try {
            const createdEventsSnapshot = await getDocs(createdEventsQuery);
            console.log('getUserEvents - Created events snapshot:', {
                empty: createdEventsSnapshot.empty,
                size: createdEventsSnapshot.size,
                docs: createdEventsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    exists: doc.exists(),
                    data: doc.data()
                }))
            });

            createdEvents = createdEventsSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            } as Event));
        } catch (error) {
            console.error('Error fetching created events:', error);
        }

        // Get events from organizations (excluding ones already fetched)
        let orgEvents: Event[] = [];
        if (userOrganizations.length > 0) {
            try {
                const organizationEventsQuery = query(
                    eventsRef,
                    where('organizationId', 'in', userOrganizations),
                    where('createdBy', '!=', userId), // Exclude events we already have
                    orderBy('createdBy'), // Required for != query
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

        // Combine and sort all events
        const allEvents = [...createdEvents, ...orgEvents].sort((a, b) =>
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
            totalEventsCount: eventsWithAttendance.length,
            events: eventsWithAttendance.map(e => ({
                id: e.id,
                name: e.name,
                createdBy: e.createdBy,
                organizationId: e.organizationId,
                startDate: e.startDate
            }))
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

    const userDoc = {
        id: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        organizations: [],
    };

    await setDoc(doc(usersRef, user.uid), userDoc);
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

export { auth, db }; 