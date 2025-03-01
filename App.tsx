import React from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import providers
import { EventProvider } from './src/context/EventContext';
import { AttendanceProvider } from './src/context/AttendanceContext';
import { NoGoListProvider } from './src/context/NoGoListContext';

// Import screens directly
import { HomeScreen } from './src/screens/HomeScreen';
import { IDScannerScreen } from './src/screens/IDScanner/IDScannerScreen';
import { AttendanceListScreen } from './src/screens/AttendanceList/AttendanceListScreen';
import { EventListScreen } from './src/screens/EventList/EventListScreen';
import { CreateEventScreen } from './src/screens/CreateEvent/CreateEventScreen';
import { NoGoListScreen } from './src/screens/NoGoList/NoGoListScreen';

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
    <SafeAreaProvider>
      <NoGoListProvider>
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
                <Stack.Screen name="NoGoList" component={NoGoListScreen} /> 
              </Stack.Navigator>
            </NavigationContainer>
          </AttendanceProvider>
        </EventProvider>
      </NoGoListProvider>
    </SafeAreaProvider>
  );
};

export default App; 