import { NavigatorScreenParams } from '@react-navigation/native';

export interface Student {
  id: string;
  name: string;
  timestamp: Date;
  imagePath?: string;
}

export interface Event {
  id: string;
  name: string;
  location?: string;
  date?: string;
  description?: string;
  attendanceCount: number;
  createdAt: string;
  emoji?: string;
}

// Define RootStackParamList for type-safe navigation
export interface RootStackParamList {
  Home: undefined;
  IDScanner: { eventId?: string };
  AttendanceList: { eventId?: string };
  EventList: undefined;
  CreateEvent: undefined;
  [key: string]: undefined | { eventId?: string };
}