import React from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import providers
import { EventProvider } from './context/EventContext';
import { AttendanceProvider } from './context/AttendanceContext';

// Import screens directly
import { HomeScreen } from './screens/HomeScreen';
import { IDScannerScreen } from './screens/IDScanner/IDScannerScreen';
import { AttendanceListScreen } from './screens/AttendanceList/AttendanceListScreen';
import { EventListScreen } from './screens/EventList/EventListScreen';
import { CreateEventScreen } from './screens/CreateEvent/CreateEventScreen';

// Ignore specific harmless warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:'
]);

// Create stack navigator without typing constraints
const Stack = createNativeStackNavigator();

// Simple App component with minimal wrapping
const App = () => {
  return (
    <EventProvider>
      <AttendanceProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Home"
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: 'white' }
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="IDScanner" component={IDScannerScreen} />
            <Stack.Screen name="AttendanceList" component={AttendanceListScreen} />
            <Stack.Screen name="EventList" component={EventListScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AttendanceProvider>
    </EventProvider>
  );
};

export default App; 