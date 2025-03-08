export interface User {
    id: string;
    email: string;
    displayName: string;
    organizations: string[]; // Array of organization IDs the user belongs to
}

export interface Organization {
    id: string;
    name: string;
    joinCode: string;
    description?: string;
    createdAt: number;
    createdBy: string; // User ID
    members: string[]; // Array of user IDs
    admins: string[]; // Array of user IDs with admin privileges
    events: string[]; // Array of event IDs
}

export interface Event {
    id: string;
    name: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate: string;
    date: string;
    createdBy: string;
    createdAt: string;
    organizationId: string | null;  // Updated to allow null
    isActive: boolean;
    attendanceCount: number;
    attendees?: any[];
    noGoList?: string[]; // Add this new property
    emoji?: string; // Add this field
}

export interface Attendance {
    id: string;
    eventId: string;
    userId: string;
    timestamp: number;
    status: 'present' | 'absent' | 'late';
    notes?: string;
    checkedInBy: string;
    imagePath?: string;
}

export type OrganizationRole = 'admin' | 'member';

export interface JoinCodeResponse {
    success: boolean;
    organization?: Organization;
    error?: string;
} 