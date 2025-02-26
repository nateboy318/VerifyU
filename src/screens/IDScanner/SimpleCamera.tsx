import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useAttendance } from '../../context/AttendanceContext';
import { Student } from '../../types';

export default function SimpleCamera() {
  const [hasPermission, setHasPermission] = useState(null);
  const [camera, setCamera] = useState(null);
  const navigation = useNavigation();
  const { addStudent } = useAttendance();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (!camera) return;
    try {
      console.log('Taking picture...');
      const data = await camera.takePictureAsync();
      console.log('Picture taken:', data.uri);
      
      // For demo purposes, we'll just mock the OCR result
      // In a real app, you would process the image with OCR here
      mockSuccessfulScan();
      
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const mockSuccessfulScan = () => {
    // Mock a successful scan for demonstration purposes
    const student = {
      id: String(Math.floor(10000000 + Math.random() * 90000000)),
      name: 'John Doe',
      timestamp: new Date()
    };
    
    addStudent(student);
    
    Alert.alert(
      'Success!',
      `Added student: ${student.name}`,
      [
        { text: 'View Attendance', onPress: () => navigation.navigate('AttendanceList') },
        { text: 'Scan Another', onPress: () => console.log('Ready to scan again') }
      ]
    );
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type="back"
        ref={(ref) => setCamera(ref)}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.scanGuide}>
          <View style={styles.idFrame} />
          <Text style={styles.instructionText}>
            Center the student ID in the box
          </Text>
        </View>
        
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  scanGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idFrame: {
    borderWidth: 2,
    borderColor: 'white',
    width: '80%',
    height: 200,
    borderRadius: 10,
    opacity: 0.7,
  },
  instructionText: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'red',
  },
});