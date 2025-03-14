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
import { useNavigation } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { suggestEmojis, popularEmojis } from '../../utils/emojiUtils';
import { getCurrentUser, createEvent } from '../../services/firebase';

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
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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
const frequentEmojis = ["📅", "🎉", "👥", "🛠️", "🎵", "🏆", "🎮", "🍽️", "💼", "🎓", "🎬", "🎭", "✈️", "🏖️", "📚", "🧘", "💪", "🩺", "🏥"];

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

export const CreateLocalEventScreen = () => {
  const navigation = useNavigation() as any;
  
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📅');
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

  const generateCalendarDays = (baseDate: Date): Date[] => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: Date[] = [];
    
    // Add days from previous month
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const goToPreviousMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1));
  };

  const goToCurrentMonth = () => {
    setCalendarViewDate(new Date());
  };

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

  const applyTimeToDate = (): Date => {
    const date = new Date(selectedDate);
    let hours = timeHour;
    if (timeAmPm === 'PM' && hours !== 12) hours += 12;
    if (timeAmPm === 'AM' && hours === 12) hours = 0;
    date.setHours(hours, timeMinute, 0, 0);
    return date;
  };

  const validateForm = (): boolean => {
    if (!eventName.trim()) {
      Alert.alert('Error', 'Please enter an event name');
      return false;
    }
    return true;
  };

  const handleCreateEvent = async (): Promise<void> => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
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
        endDate: eventDateTime.toISOString(), // You might want to add end date picker
        description: eventDescription.trim() || undefined,
        isActive: true,
        emoji: selectedEmoji
      };

      await createEvent(newEventData, currentUser.uid);
      
      Alert.alert(
        'Success',
        `Event "${newEventData.name}" created successfully!`,
        [
          { 
            text: 'Return to Home', 
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Local Event</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
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
                    placeholder="Enter event location (optional)"
                    value={eventLocation}
                    onChangeText={setEventLocation}
                    returnKeyType="next"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>
            </View>

            {/* Date & Time Field */}
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Date & Time <Text style={styles.requiredStar}>*</Text></Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={styles.dateTimeButtonContent}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.dateTimeButtonText}>
                      {formatDate(selectedDate)} at {formatTime(applyTimeToDate())}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
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
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.black,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formWrapper: {
    padding: SIZES.padding,
  },
  formSection: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  requiredStar: {
    color: COLORS.danger,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    ...SHADOWS.light,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    ...SHADOWS.light,
  },
  dateTimeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 16,
    marginTop: 20,
    ...SHADOWS.medium,
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
    marginTop: 20,
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
    height: '90%',
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
    marginBottom: 0,
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
    paddingVertical: 0,
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
}); 