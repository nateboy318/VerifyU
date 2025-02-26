import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, Platform } from 'react-native';
import { RootStackParamList } from './src/types';
import { HomeScreen } from './src/screens/HomeScreen';
import { IDScannerScreen } from './src/screens/IDScanner/IDScannerScreen';
import { AttendanceListScreen } from './src/screens/AttendanceList/AttendanceListScreen';
import { EventListScreen } from './src/screens/EventList/EventListScreen';
import { CreateEventScreen } from './src/screens/CreateEvent/CreateEventScreen';
import { AttendanceProvider } from './src/context/AttendanceContext';
import { EventProvider } from './src/context/EventContext';
import { COLORS } from './src/constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Simple fallback component in case the camera causes issues
  const CameraSafeFallback = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <Text style={{ fontSize: 18, color: COLORS.primary, textAlign: 'center', margin: 20 }}>
        The camera feature would be enabled on a real device.
        {'\n\n'}
        For this demo, IDs will be generated using sample data.
      </Text>
    </View>
  );

  return (
    <SafeAreaProvider>
      <EventProvider>
        <AttendanceProvider>
          <NavigationContainer>
            <StatusBar style="light" backgroundColor={COLORS.primary} />
            <Stack.Navigator 
              initialRouteName="Home"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.background },
                animation: 'fade_from_bottom',
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen 
                name="IDScanner" 
                component={Platform.OS === 'web' ? CameraSafeFallback : IDScannerScreen} 
              />
              <Stack.Screen name="AttendanceList" component={AttendanceListScreen} />
              <Stack.Screen name="EventList" component={EventListScreen} />
              <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AttendanceProvider>
      </EventProvider>
    </SafeAreaProvider>
  );
}
