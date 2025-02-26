import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define types for theme constants (these should match your theme file)
const COLORS = {
  primary: '#2E5BFF',
  secondary: '#4C4C66',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#e0e0e0',
  grayDark: '#8B8B9E',
  border: '#E5E5E5',
  success: '#33DE7A',
  danger: '#FF495C',
  text: '#2D2D2D',
  textLight: '#8B8B9E',
};

const SIZES = {
  radius: 12,
  padding: 16,
  h1: 28,
  h2: 22,
  h3: 18,
  h4: 16,
  body1: 16,
  body2: 14,
  small: 12,
};

export interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  type?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
}

const Button = ({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false, 
  style, 
  textStyle,
  type = 'primary',
  size = 'medium',
  icon
}: ButtonProps) => {
  
  // Get button style based on type
  const getButtonStyle = () => {
    switch (type) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'danger':
        return styles.dangerButton;
      default:
        return styles.primaryButton;
    }
  };
  
  // Get text style based on type
  const getTextStyle = () => {
    switch (type) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'danger':
        return styles.dangerText;
      default:
        return styles.primaryText;
    }
  };
  
  // Get button height based on size
  const getButtonHeight = () => {
    switch (size) {
      case 'small':
        return 36;
      case 'medium':
        return 48;
      case 'large':
        return 56;
      default:
        return 48;
    }
  };
  
  // Get text size based on button size
  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'medium':
        return 16;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        { height: getButtonHeight() },
        disabled && styles.disabledButton,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={type === 'outline' ? COLORS.primary : COLORS.white} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && (
            <Ionicons 
              name={icon as any} 
              size={getTextSize() + 2} 
              color={type === 'outline' ? COLORS.primary : COLORS.white} 
              style={styles.icon} 
            />
          )}
          <Text 
            style={[
              getTextStyle(), 
              { fontSize: getTextSize() },
              disabled && styles.disabledText,
              textStyle
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dangerButton: {
    backgroundColor: COLORS.danger,
  },
  primaryText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  secondaryText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  outlineText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dangerText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.8,
  },
});

export default Button;