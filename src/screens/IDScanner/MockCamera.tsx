import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAttendance } from '../../context/AttendanceContext';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import Header from '../../components/Header';

export default function MockCamera() {
  const navigation = useNavigation();
  const { addStudent } = useAttendance();
  const [scanning, setScanning] = useState(false);
  const [showFocusAnimation, setShowFocusAnimation] = useState(false);

  const mockScan = () => {
    // Start scanning animation
    setScanning(true);
    setShowFocusAnimation(true);
    
    // Simulate processing time
    setTimeout(() => {
      setShowFocusAnimation(false);
      
      // Mock a successful scan for demonstration purposes
      setTimeout(() => {
        const student = {
          id: String(Math.floor(10000000 + Math.random() * 90000000)),
          name: 'John Doe',
          timestamp: new Date()
        };
        
        addStudent(student);
        setScanning(false);
        
        Alert.alert(
          'Success!',
          `Added student: ${student.name}`,
          [
            { text: 'View Attendance', onPress: () => navigation.navigate('AttendanceList') },
            { text: 'Scan Another', onPress: () => console.log('Ready to scan again') }
          ]
        );
      }, 1000);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.cameraView}>
        {/* Custom Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Scan ID</Text>
          
          <TouchableOpacity
            style={styles.flashButton}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.flashButtonText}>💡</Text>
          </TouchableOpacity>
        </View>
        
        {/* Scan Guide */}
        <View style={styles.scanGuide}>
          <View style={[
            styles.idFrame, 
            showFocusAnimation && styles.idFrameFocused
          ]} />
          
          {scanning ? (
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="large" color={COLORS.white} />
              <Text style={styles.scanningText}>Scanning ID...</Text>
            </View>
          ) : (
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionText}>
                Center the student ID in the box
              </Text>
              <Text style={styles.instructionSubtext}>
                Make sure the ID is well lit and clearly visible
              </Text>
            </View>
          )}
        </View>
        
        {/* Camera Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={mockScan}
            disabled={scanning}
          >
            <View style={[
              styles.captureInner,
              scanning && styles.capturingInner
            ]} />
          </TouchableOpacity>
          
          {/* Help Text */}
          <Text style={styles.helpText}>
            Tap the button to capture
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraView: {
    flex: 1,
    backgroundColor: '#222', // Dark gray to simulate camera view
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 10 : StatusBar.currentHeight + 10,
    paddingHorizontal: SIZES.padding,
    paddingBottom: 20,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.h2,
    fontWeight: 'bold',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  flashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButtonText: {
    fontSize: 20,
  },
  scanGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  idFrame: {
    borderWidth: 2.5,
    borderColor: COLORS.white,
    width: '85%',
    height: 220,
    borderRadius: 16,
    opacity: 0.8,
    marginBottom: 20,
  },
  idFrameFocused: {
    borderColor: COLORS.primary,
    borderWidth: 3,
    opacity: 1,
    ...SHADOWS.medium,
  },
  instructionContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    maxWidth: '90%',
    alignItems: 'center',
  },
  instructionText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionSubtext: {
    color: COLORS.grayLight,
    fontSize: 14,
    textAlign: 'center',
  },
  scanningContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 16,
  },
  scanningText: {
    color: COLORS.white,
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  captureInner: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  capturingInner: {
    backgroundColor: 'rgba(196, 30, 58, 0.5)', // Faded red
  },
  helpText: {
    color: COLORS.grayLight,
    fontSize: 14,
  },
});