import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Event } from '../types/organization';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EventDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { event } = route.params as { event: Event };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{event.name}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Event Info */}
      <View style={styles.eventInfo}>
        <Text style={styles.eventDate}>
          {new Date(event.startDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        {event.location && (
          <Text style={styles.eventLocation}>{event.location}</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.scanButton]}
          onPress={() => navigation.navigate('IDScanner', { eventId: event.id })}
        >
          <Ionicons name="scan-outline" size={24} color={COLORS.white} />
          <Text style={styles.buttonText}>Scan IDs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.attendanceButton]}
          onPress={() => navigation.navigate('AttendanceList', { eventId: event.id })}
        >
          <Ionicons name="people-outline" size={24} color={COLORS.white} />
          <Text style={styles.buttonText}>View Attendance</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    ...SHADOWS.medium,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  eventInfo: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    marginTop: SIZES.padding,
    ...SHADOWS.medium,
  },
  eventDate: {
    fontSize: SIZES.body1,
    color: COLORS.text,
    marginBottom: 8,
  },
  eventLocation: {
    fontSize: SIZES.body1,
    color: COLORS.textLight,
  },
  actionButtons: {
    padding: SIZES.padding,
    gap: SIZES.padding,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    ...SHADOWS.medium,
  },
  scanButton: {
    backgroundColor: COLORS.primary,
  },
  attendanceButton: {
    backgroundColor: COLORS.secondary || '#4CAF50',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: SIZES.body1,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 