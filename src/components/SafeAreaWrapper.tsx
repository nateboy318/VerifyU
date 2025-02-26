import React, { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

interface SafeAreaWrapperProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

const SafeAreaWrapper = ({ 
  children, 
  style, 
  backgroundColor = COLORS.background 
}: SafeAreaWrapperProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right
        },
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeAreaWrapper;