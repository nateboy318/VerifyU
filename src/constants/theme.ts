export const COLORS = {
  primary: '#000000', // Nice blue color
  primaryDark: '#171717', // Darker blue
  primaryLight: '#5DADE2', // Lighter blue

  secondary: '#000000', // Dark gray / near black
  secondaryDark: '#1C1C1C', // Darker gray
  secondaryLight: '#555555', // Lighter gray

  tertiary: '#F5F5F5', // Light gray for backgrounds
  tertiaryDark: '#E0E0E0',
  tertiaryLight: '#FAFAFA',

  neutral: '#F8F9FA', // Very light gray/off-white

  success: '#28A745', // Green for success messages
  danger: '#DC3545',  // Red for error messages
  warning: '#FFC107', // Yellow for warnings

  text: '#222831',
  textLight: '#757575',

  background: '#fff', // White as background
  card: '#EEEEEE',
  grayLight: '#F0F0F0',
  gray: '#E0E0E0',
  grayDark: '#ADADAD',

  white: '#fff',
  black: '#000000',

  borderColor: '#E2E2E2',
};

export const FONTS = {
  bold: 'System',
  semiBold: 'System',
  medium: 'System',
  regular: 'System',
};

export const SIZES = {
  // Global sizes
  base: 8,
  font: 14,
  radius: 12,
  padding: 16,
  margin: 16,

  // Font sizes
  largeTitle: 40,
  h1: 28,
  h2: 22,
  h3: 18,
  h4: 16,
  h5: 14,
  body1: 14,
  body2: 13,
  body3: 16,
  body4: 14,
  body5: 12,
  small: 12,
  tiny: 10,

  // Spacing
  buttonHeight: 48,

  // Screen width breakpoints
  screenSmall: 340,
  screenMedium: 768,
};

export const SHADOWS = {
  light: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  dark: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};