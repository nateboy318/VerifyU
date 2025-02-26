import { Event } from '../types';

// Map of common event categories to emojis for suggestion
export const categoryEmojis: Record<string, string> = {
    'meeting': '👥',
    'conference': '🎤',
    'workshop': '🛠️',
    'party': '🎉',
    'birthday': '🎂',
    'wedding': '💍',
    'concert': '🎵',
    'sports': '🏆',
    'game': '🎮',
    'dinner': '🍽️',
    'lunch': '🥪',
    'breakfast': '☕',
    'coffee': '☕',
    'interview': '💼',
    'appointment': '📅',
    'doctor': '🩺',
    'dentist': '🦷',
    'gym': '💪',
    'yoga': '🧘',
    'class': '📚',
    'lecture': '🎓',
    'exam': '📝',
    'trip': '✈️',
    'vacation': '🏖️',
    'holiday': '🎄',
    'festival': '🎪',
    'movie': '🎬',
    'theater': '🎭',
    'show': '🎬',
    'presentation': '📊',
    'call': '📞',
};

// Default emojis based on first letter
export const defaultEmojis: Record<string, string> = {
    'a': '🅰️', 'b': '🅱️', 'c': '©️', 'd': '🌊', 'e': '📧',
    'f': '🎏', 'g': '🦒', 'h': '🏠', 'i': '📊', 'j': '🎮',
    'k': '🔑', 'l': '🦁', 'm': '〽️', 'n': '🎵', 'o': '⭕',
    'p': '🅿️', 'q': '🔍', 'r': '®️', 's': '💲', 't': '🌴',
    'u': '⛎', 'v': '✅', 'w': '〰️', 'x': '❌', 'y': '💹', 'z': '💤'
};

// Popular emojis for quick selection
export const popularEmojis = [
    '📅', '🎉', '🎓', '🏆', '💼', '📊', '🎭', '🎤',
    '📚', '✈️', '🏖️', '💰', '🎂', '🍽️', '🏀', '⚽',
    '🎸', '🎨', '🏫', '🧠', '🧪', '💻', '📱', '🔬',
];

// Function to get emoji based on event name or return custom emoji if set
export const getEventEmoji = (event: any): string => {
    // If event has a custom emoji, use it
    if (event.emoji) {
        return event.emoji;
    }

    // Otherwise generate one based on name
    const eventName = event.name || '';

    // Check if event name contains any of the categories
    const lowerEventName = eventName.toLowerCase();
    for (const [category, emoji] of Object.entries(categoryEmojis)) {
        if (lowerEventName.includes(category)) {
            return emoji;
        }
    }

    // If no match, use a default emoji based on first letter
    const firstLetter = eventName.charAt(0).toLowerCase();
    return defaultEmojis[firstLetter] || '📅'; // Calendar emoji as fallback
};

// Function to suggest emojis based on event name
export const suggestEmojis = (eventName: string): string[] => {
    const suggestions: string[] = [];
    const lowerEventName = eventName.toLowerCase();

    // Add category matches
    for (const [category, emoji] of Object.entries(categoryEmojis)) {
        if (lowerEventName.includes(category)) {
            suggestions.push(emoji);
        }
    }

    // Add first letter match
    const firstLetter = eventName.charAt(0).toLowerCase();
    if (defaultEmojis[firstLetter]) {
        suggestions.push(defaultEmojis[firstLetter]);
    }

    // Add calendar emoji as fallback
    suggestions.push('📅');

    // Add some popular emojis
    suggestions.push(...popularEmojis.slice(0, 10));

    // Return unique emojis
    return [...new Set(suggestions)].slice(0, 20);
}; 