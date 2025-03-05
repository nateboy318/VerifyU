import { Organization, Event } from './organization';

export type RootStackParamList = {
    Auth: undefined;
    Home: undefined;
    IDScanner: { eventId: string };
    AttendanceList: { eventId: string };
    EventList: { filter?: 'past' | 'upcoming' };
    CreateEvent: {
        organization: Organization;
    };
    CreateLocalEvent: undefined;
    NoGoList: undefined;
    Organizations: undefined;
    OrganizationDetails: { organization: Organization };
    EventDetails: { event: Event };
    Login: undefined;
    SignUp: undefined;
    CreateOrganization: undefined;
}; 