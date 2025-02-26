import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: 'none' | 'small' | 'medium' | 'large';
}

const Card = ({ 
  children, 
  style, 
  elevation = 'medium' 
}: CardProps) => {
  
  const getElevation = () => {
    switch (elevation) {
      case 'none':
        return {};
      case 'small':
        return SHADOWS.light;
      case 'medium':
        return SHADOWS.medium;
      case 'large':
        return SHADOWS.dark;
      default:
        return SHADOWS.medium;
    }
  };
  
  return (
    <View
      style={[
        styles.card,
        getElevation(),
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginVertical: SIZES.base,
  },
});

export default Card;