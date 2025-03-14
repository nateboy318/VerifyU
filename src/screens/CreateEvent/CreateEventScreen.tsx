import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { suggestEmojis, popularEmojis } from '../../utils/emojiUtils';
import { Organization } from '../../types/organization';
import { getCurrentUser, createEvent } from '../../services/firebase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Helper functions for date formatting
const formatDate = (date: Date): string => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (date: Date): string => {
  if (!date) return '';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Define emoji categories for the picker
const emojiCategories = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙"]
  },
  {
    name: "People",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "👍", "👎"]
  },
  {
    name: "Animals",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦆"]
  },
  {
    name: "Food & Drink",
    emojis: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑"]
  },
  {
    name: "Activities",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣"]
  },
  {
    name: "Travel",
    emojis: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🛵", "🏍️", "🛺", "🚲", "🛴", "🚉"]
  },
  {
    name: "Objects",
    emojis: ["⌚", "📱", "💻", "⌨️", "🖥️", "🖱️", "🖨️", "🖲️", "🕹️", "🗜️", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️"]
  },
  {
    name: "Symbols",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️"]
  }
];

// Add more frequently used emojis
const frequentEmojis = ["📅", "🎉", "👥", "��", "🛠️", "🎵", "🏆", "🎮", "🍽️", "💼", "🎓", "🎬", "🎭", "✈️", "🏖️", "📚", "🧘", "💪", "🩺", "🏥"];

const getCurrentTimeRoundedToFiveMinutes = () => {
  const now = new Date();
  const minutes = Math.round(now.getMinutes() / 5) * 5;
  now.setMinutes(minutes);
  return now;
};

const initialTime = getCurrentTimeRoundedToFiveMinutes();
const initialHour = initialTime.getHours() % 12 || 12; // Convert to 12-hour format
const initialMinute = initialTime.getMinutes();
const initialAmPm = initialTime.getHours() >= 12 ? 'PM' : 'AM';

export const CreateEventScreen = () => {
  const navigation = useNavigation() as any;
  const route = useRoute();
  const { organization } = route.params as { organization: Organization };
  
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📅');
  const [maxAttendees, setMaxAttendees] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [suggestedEmojis, setSuggestedEmojis] = useState<string[]>([]);

  // Date selection states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeHour, setTimeHour] = useState(initialHour);
  const [timeMinute, setTimeMinute] = useState(initialMinute);
  const [timeAmPm, setTimeAmPm] = useState(initialAmPm);
  
  // Calendar view state
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  
  // Emoji picker state
  const [currentEmojiCategory, setCurrentEmojiCategory] = useState("Frequent");
  
  // No-go list state
  const [noGoList, setNoGoList] = useState<string[]>([]);
  const [noGoListFileName, setNoGoListFileName] = useState<string | null>(null);
  
  // Update suggested emojis when event name changes
  useEffect(() => {
    if (eventName.trim()) {
      setSuggestedEmojis(suggestEmojis(eventName));
    } else {
      setSuggestedEmojis(popularEmojis);
    }
  }, [eventName]);
  
  // Generate calendar days for the current month view
  useEffect(() => {
    const days = generateCalendarDays(calendarViewDate);
    setCalendarDays(days);
  }, [calendarViewDate]);
  
  // Generate calendar days for the selected month
  const generateCalendarDays = (baseDate: Date): Date[] => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    const days: Date[] = [];
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push(date);
    }
    
    return days;
  };
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newDate = new Date(calendarViewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCalendarViewDate(newDate);
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = new Date(calendarViewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCalendarViewDate(newDate);
  };
  
  // Go to current month
  const goToCurrentMonth = () => {
    const today = new Date();
    setCalendarViewDate(today);
  };
  
  // Handle time adjustment
  const handleHourChange = (increment: number): void => {
    let newHour = timeHour + increment;
    if (newHour > 12) newHour = 1;
    if (newHour < 1) newHour = 12;
    setTimeHour(newHour);
  };
  
  const handleMinuteChange = (increment: number): void => {
    let newMinute = timeMinute + increment;
    if (newMinute >= 60) newMinute = 0;
    if (newMinute < 0) newMinute = 55;
    setTimeMinute(newMinute);
  };
  
  const toggleAmPm = (): void => {
    setTimeAmPm(timeAmPm === 'AM' ? 'PM' : 'AM');
  };
  
  // Apply the selected time to the date
  const applyTimeToDate = (): Date => {
    const newDate = new Date(selectedDate);
    let hours = timeHour;
    
    // Convert to 24-hour format
    if (timeAmPm === 'PM' && hours < 12) {
      hours += 12;
    } else if (timeAmPm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    newDate.setHours(hours, timeMinute, 0);
    return newDate;
  };

  const validateForm = (): boolean => {
    if (!eventName.trim()) {
      Alert.alert('Error', 'Please enter an event name');
      return false;
    }
    return true;
  };

  const importNoGoList = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const names = fileContent.split('\n').map(name => name.trim()).filter(name => name.length > 0);
      
      setNoGoList(names);
      setNoGoListFileName(fileName);
      
      Alert.alert('Success', `Imported ${names.length} names to the event no-go list`);
    } catch (error) {
      console.error('Error importing event no-go list:', error);
      Alert.alert('Error', 'Failed to import no-go list');
    }
  };

  const handleCreateEvent = async (): Promise<void> => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to create an event');
        return;
      }

      const eventDateTime = applyTimeToDate();
      
      const newEventData = {
        name: eventName.trim(),
        location: eventLocation.trim() || undefined,
        startDate: eventDateTime.toISOString(),
        endDate: eventDateTime.toISOString(),
        description: eventDescription.trim() || undefined,
        isActive: true,
        emoji: selectedEmoji,
        noGoList: noGoList.length > 0 ? noGoList : undefined
      };

      const createdEvent = await createEvent(newEventData, currentUser.uid, organization.id);
      
      Alert.alert(
        'Success',
        `Event "${createdEvent.name}" created successfully!`,
        [
          { 
            text: 'Start Scanning', 
            onPress: () => {
              navigation.replace('IDScanner', { eventId: createdEvent.id });
            }
          },
          { 
            text: 'Return to Organization', 
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    setShowEmojiPicker(false);
  };
  
  // Render emoji category tabs
  const renderEmojiCategoryTabs = () => {
    const allCategories = ["Frequent", ...emojiCategories.map(cat => cat.name)];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.emojiCategoryTabsContainer}
      >
        {allCategories.map((category, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.emojiCategoryTab,
              currentEmojiCategory === category && styles.emojiCategoryTabSelected
            ]}
            onPress={() => setCurrentEmojiCategory(category)}
          >
            <Text style={[
              styles.emojiCategoryTabText,
              currentEmojiCategory === category && styles.emojiCategoryTabTextSelected
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };
  
  // Render emoji grid for the current category
  const renderEmojiGrid = () => {
    let emojisToShow = [];
    
    if (currentEmojiCategory === "Frequent") {
      emojisToShow = frequentEmojis;
    } else {
      const category = emojiCategories.find(cat => cat.name === currentEmojiCategory);
      emojisToShow = category ? category.emojis : [];
    }
    
    return (
      <FlatList
        data={emojisToShow}
        keyExtractor={(item, index) => `${item}-${index}`}
        numColumns={8}
        style={styles.emojiGridContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.emojiItem}
            onPress={() => handleEmojiSelect(item)}
          >
            <Text style={styles.emojiText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Create New Event</Text>
          
          <View style={{ width: 40 }} />
        </View>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.formContainer}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formWrapper}>
            {/* Event Emoji Selector */}
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Event Icon</Text>
                <TouchableOpacity 
                  style={styles.emojiSelectorButton}
                  onPress={() => setShowEmojiPicker(true)}
                >
                  <View style={styles.selectedEmojiContainer}>
                    <Text style={styles.selectedEmojiText}>{selectedEmoji}</Text>
                  </View>
                  <View style={styles.emojiSelectorTextContainer}>
                    <Text style={styles.emojiSelectorText}>Select an emoji for your event</Text>
                    <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Event Name Field */}
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Event Name <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter event name"
                    value={eventName}
                    onChangeText={setEventName}
                    returnKeyType="next"
                    autoCapitalize="words"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>
            </View>
            
            {/* Location Field */}
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Location</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter location (optional)"
                    value={eventLocation}
                    onChangeText={setEventLocation}
                    returnKeyType="next"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>
            </View>
            
            {/* Date Selection */}
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Date & Time</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color={COLORS.primary} />
                  <Text style={styles.datePickerText}>
                    {formatDate(selectedDate)} at {formatTime(applyTimeToDate())}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Description Field */}
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description</Text>
                <View style={styles.inputWrapper}>
                  
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter event description (optional)"
                    value={eventDescription}
                    onChangeText={setEventDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>
            </View>
            
            {/* No-Go List */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>No-Go List (Optional)</Text>
              <View style={styles.noGoListContainer}>
                {noGoListFileName ? (
                  <View style={styles.fileInfoContainer}>
                    <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
                    <Text style={styles.fileNameText}>{noGoListFileName}</Text>
                    <Text style={styles.fileCountText}>({noGoList.length} names)</Text>
                    <TouchableOpacity 
                      style={styles.removeFileButton}
                      onPress={() => {
                        setNoGoList([]);
                        setNoGoListFileName(null);
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.importButton}
                    onPress={importNoGoList}
                  >
                    <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} />
                    <Text style={styles.importButtonText}>Import CSV No-Go List</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.selectedEmojiDisplay}>{selectedEmoji}</Text>
                <Text style={styles.summaryTitle}>Event Summary</Text>
              </View>
              
              <View style={styles.summaryContent}>
                <View >
                  <Text style={styles.summaryValue}>{eventName || 'Not specified'}</Text>
                </View>
                
                <Text style={styles.summaryLabel}>When:</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(selectedDate)} at {formatTime(applyTimeToDate())}
                </Text>
                
                <Text style={styles.summaryLabel}>Where:</Text>
                <Text style={styles.summaryValue}>{eventLocation || 'Not specified'}</Text>
              </View>
            </View>
            
            {/* Create Button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                (!eventName || isSubmitting) && styles.disabledButton
              ]}
              onPress={handleCreateEvent}
              disabled={!eventName || isSubmitting}
            >
              {isSubmitting ? (
                <Text style={styles.createButtonText}>Creating...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.white} style={styles.buttonIcon} />
                  <Text style={styles.createButtonText}>Create Event</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date & Time</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {/* Month Navigation */}
            <View style={styles.monthNavigation}>
              <TouchableOpacity 
                style={styles.monthNavigationButton} 
                onPress={goToPreviousMonth}
              >
                <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.currentMonthButton}
                onPress={goToCurrentMonth}
              >
                <Text style={styles.currentMonthText}>
                  {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.monthNavigationButton} 
                onPress={goToNextMonth}
              >
                <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Calendar View */}
            <Text style={styles.datePickerSectionTitle}>Date</Text>
            <View style={styles.calendarGrid}>
              {/* Day headers */}
              <View style={styles.calendarWeekDays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <Text key={index} style={styles.weekDayLabel}>{day}</Text>
                ))}
              </View>
              
              {/* Calendar days grid */}
              <View style={styles.calendarDaysGrid}>
                {calendarDays.map((date, index) => {
                  const dayNumber = date.getDate();
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                  
                  return (
                    <TouchableOpacity 
                      key={index}
                      style={[
                        styles.calendarGridDay,
                        isSelected && styles.calendarGridDaySelected
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[
                        styles.calendarGridDayText,
                        isSelected && styles.calendarGridDaySelectedText
                      ]}>
                        {dayNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            {/* Time Picker */}
            <Text style={styles.datePickerSectionTitle}>Time</Text>
            <View style={styles.timePickerContainer}>
              {/* Hour */}
              <View style={styles.timePickerColumn}>
                <TouchableOpacity 
                  style={styles.timePickerButton}
                  onPress={() => handleHourChange(1)}
                >
                  <Ionicons name="chevron-up" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.timePickerValue}>
                  {timeHour.toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity 
                  style={styles.timePickerButton}
                  onPress={() => handleHourChange(-1)}
                >
                  <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.timePickerSeparator}>:</Text>
              
              {/* Minute */}
              <View style={styles.timePickerColumn}>
                <TouchableOpacity 
                  style={styles.timePickerButton}
                  onPress={() => handleMinuteChange(5)}
                >
                  <Ionicons name="chevron-up" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.timePickerValue}>
                  {timeMinute.toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity 
                  style={styles.timePickerButton}
                  onPress={() => handleMinuteChange(-5)}
                >
                  <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              {/* AM/PM */}
              <TouchableOpacity 
                style={styles.amPmButton}
                onPress={toggleAmPm}
              >
                <Text style={styles.amPmText}>{timeAmPm}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Apply Button */}
            <TouchableOpacity 
              style={styles.applyDateButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.applyDateButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>Select Emoji</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {/* Emoji search bar could be added here */}
            
            {/* Emoji category tabs */}
            {renderEmojiCategoryTabs()}
            
            {/* Emoji grid */}
            {renderEmojiGrid()}
            
            {/* Apply button */}
            <TouchableOpacity 
              style={styles.applyEmojiButton}
              onPress={() => setShowEmojiPicker(false)}
            >
              <Text style={styles.applyEmojiButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  header: {
    color: COLORS.black,

    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.black,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formWrapper: {
    padding: 16,
  },
  formSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  requiredStar: {
    color: COLORS.danger,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    marginLeft: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...SHADOWS.light,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  summaryContent: {
    paddingHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  disabledButton: {
    backgroundColor: COLORS.grayDark,
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    ...SHADOWS.dark,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  datePickerSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 12,
  },
  calendarGrid: {
    marginBottom: 16,
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 12,
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarGridDay: {
    width: '14.28%', // 7 days per row = 100% / 7
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarGridDaySelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  calendarGridDayText: {
    fontSize: 14,
    color: COLORS.text,
  },
  calendarGridDaySelectedText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // Time picker
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  timePickerColumn: {
    alignItems: 'center',
    width: 60,
  },
  timePickerButton: {
    padding: 8,
  },
  timePickerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: 8,
  },
  timePickerSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginHorizontal: 8,
  },
  amPmButton: {
    marginLeft: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  amPmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  
  // Month navigation styles
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  monthNavigationButton: {
    padding: 8,
    borderRadius: 20,
  },
  currentMonthButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  currentMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  applyDateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  applyDateButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Emoji selector
  emojiSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  selectedEmojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedEmojiText: {
    fontSize: 24,
  },
  emojiSelectorTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emojiSelectorText: {
    fontSize: 16,
    color: COLORS.text,
  },
  selectedEmojiDisplay: {
    fontSize: 24,
    marginRight: 8,
  },
  
  // Emoji picker modal
  emojiPickerContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
    ...SHADOWS.dark,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  emojiPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emojiCategoryTabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  emojiCategoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  emojiCategoryTabSelected: {
    backgroundColor: COLORS.primary,
  },
  emojiCategoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  emojiCategoryTabTextSelected: {
    color: COLORS.white,
  },
  emojiGridContainer: {
    maxHeight: 300,
  },
  emojiItem: {
    width: '12.5%', // 8 emojis per row
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  emojiText: {
    fontSize: 24,
  },
  applyEmojiButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  applyEmojiButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  noGoListContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 8,
    padding: 12,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  importButtonText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontSize: 16,
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileNameText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  fileCountText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginRight: 8,
  },
  removeFileButton: {
    padding: 4,
  },
}); 