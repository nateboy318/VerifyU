import React from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/types/navigation';
import { enableScreens } from 'react-native-screens';

// Import providers
import { EventProvider } from './src/context/EventContext';
import { AttendanceProvider } from './src/context/AttendanceContext';
import { NoGoListProvider } from './src/context/NoGoListContext';
import { AuthProvider } from './src/context/AuthContext';

// Import screens
import { HomeScreen } from './src/screens/HomeScreen';
import { IDScannerScreen } from './src/screens/IDScanner/IDScannerScreen';
import { AttendanceListScreen } from './src/screens/AttendanceList/AttendanceListScreen';
import { EventListScreen } from './src/screens/EventList/EventListScreen';
import { CreateEventScreen } from './src/screens/CreateEvent/CreateEventScreen';
import { CreateLocalEventScreen } from './src/screens/CreateLocalEvent/CreateLocalEventScreen';
import { NoGoListScreen } from './src/screens/NoGoList/NoGoListScreen';
import OrganizationScreen from './src/screens/OrganizationScreen';
import OrganizationDetailsScreen from './src/screens/OrganizationDetailsScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { useAuth } from './src/context/AuthContext';

// Ignore specific harmless warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:'
]);

const Stack = createNativeStackNavigator<RootStackParamList>();

// Navigation component that handles auth state
const Navigation = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'white' }
        }}
      >
        {!user ? (
          // Auth stack
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          // App stack
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="IDScanner" component={IDScannerScreen} />
            <Stack.Screen name="AttendanceList" component={AttendanceListScreen} />
            <Stack.Screen name="EventList" component={EventListScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
            <Stack.Screen name="CreateLocalEvent" component={CreateLocalEventScreen} />
            <Stack.Screen name="NoGoList" component={NoGoListScreen} />
            <Stack.Screen
              name="Organizations"
              component={OrganizationScreen}
              options={{ title: 'My Organizations' }}
            />
            <Stack.Screen
              name="OrganizationDetails"
              component={OrganizationDetailsScreen}
              options={({ route }) => ({
                title: route.params.organization.name || 'Organization Details',
              })}
            />
            <Stack.Screen
              name="EventDetails"
              component={EventDetailsScreen}
              options={({ route }) => ({
                title: route.params.event.name || 'Event Details',
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// App component with providers
const App = () => {
  enableScreens();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NoGoListProvider>
          <EventProvider>
            <AttendanceProvider>
              <Navigation />
            </AttendanceProvider>
          </EventProvider>
        </NoGoListProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App; 