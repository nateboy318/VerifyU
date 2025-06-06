import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, StatusBar, SafeAreaView, Image } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useNoGoList } from '../../context/NoGoListContext';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { Student } from '../../types';
import { VisionService } from '../../services/VisionService';
import { markAttendance, getCurrentUser, getEventDetails } from '../../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runOnJS } from 'react-native-reanimated';

// Screen dimensions
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_ASPECT_RATIO = 1.586; // Standard ID card aspect ratio (85.6mm × 54mm)
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_HEIGHT = CARD_WIDTH / CARD_ASPECT_RATIO;

export const IDScannerScreen = () => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [torchMode, setTorchMode] = useState<boolean>(false);
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const eventId = route.params?.eventId;
  const cameraRef = useRef<CameraView>(null);
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const [croppedPhoto, setCroppedPhoto] = useState<string | null>(null);
  const { isOnNoGoList } = useNoGoList();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!eventId) {
      Alert.alert('Error', 'No event ID provided');
      navigation.goBack();
    }
  }, [eventId, navigation]);

  if (!permission) {
    // Camera permissions are still loading
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={72} color={COLORS.primary} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.message}>We need your permission to scan ID cards</Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Function to calculate crop coordinates based on the card guide dimensions
  const calculateCropCoordinates = (photoWidth: number, photoHeight: number) => {
    // Calculate center of the screen for the card guide
    const cardGuideTop = (SCREEN_HEIGHT - CARD_HEIGHT) / 2;
    const cardGuideLeft = (SCREEN_WIDTH - CARD_WIDTH) / 2;
    
    // Calculate the scaling factor between photo dimensions and screen dimensions
    const scaleX = photoWidth / SCREEN_WIDTH;
    const scaleY = photoHeight / SCREEN_HEIGHT;
    
    // Calculate crop region
    const cropX = Math.floor(cardGuideLeft * scaleX);
    const cropY = Math.floor(cardGuideTop * scaleY);
    const cropWidth = Math.floor(CARD_WIDTH * scaleX);
    const cropHeight = Math.floor(CARD_HEIGHT * scaleY);
    
    console.log(`📐 Crop coordinates: x=${cropX}, y=${cropY}, width=${cropWidth}, height=${cropHeight}`);
    
    return {
      originX: cropX,
      originY: cropY,
      width: cropWidth,
      height: cropHeight
    };
  };

  // Function to perform OCR using VisionService
  const performOCR = async (imageUri: string): Promise<Partial<Student>> => {
    try {
      console.log('🔍 Processing image with OCR via VisionService...');
      const result = await VisionService.processImage(imageUri);
      
      // Ensure we return an object with no nil values
      return {
        id: result.id || '',
        name: result.name || '',
        // Add other properties with default values
      };
    } catch (error) {
      console.error('❌ OCR failed:', error);
      // Return default values instead of throwing
      return { id: '', name: '' };
    }
  };

  const takePhoto = async () => {
    if (!scanning && cameraRef.current) {
      try {
        setScanning(true);
        setOcrProgress('Taking photo...');
        
        console.log('🔍 Taking photo...');
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          skipProcessing: true,
        });

        if (photo) {
          console.log('📸 Photo taken:', photo.uri);
          console.log(`📐 Photo dimensions: ${photo.width} x ${photo.height}`);
          
          // Calculate crop coordinates
          const cropRegion = calculateCropCoordinates(photo.width, photo.height);
          
          // Crop the image to just the ID card region
          setOcrProgress('Cropping image...');
          const croppedImage = await ImageManipulator.manipulateAsync(
            photo.uri,
            [
              { 
                crop: {
                  originX: cropRegion.originX,
                  originY: cropRegion.originY,
                  width: cropRegion.width,
                  height: cropRegion.height
                }
              }
            ],
            { compress: 1, format: SaveFormat.JPEG }
          );
          
          setCroppedPhoto(croppedImage.uri);
          console.log('✂️ Image cropped successfully:', croppedImage.uri);
          
          // Save the cropped image
          const timestamp = Date.now();
          const filename = `${FileSystem.documentDirectory}id-scan-${timestamp}.jpg`;
          
          await FileSystem.moveAsync({
            from: croppedImage.uri,
            to: filename
          });
          
          try {
            // Process the image with OCR 
            setOcrProgress('Analyzing ID card text...');
            console.log('🔍 Processing image with OCR...');
            
            const studentData = await performOCR(filename);
            
            // Only proceed if we have at least some ID or name
            if (!studentData.id && !studentData.name) {
              throw new Error('Could not extract any information from the card');
            }
            
            // Create a default ID if none was extracted
            if (!studentData.id) {
              studentData.id = `S${Math.floor(10000 + Math.random() * 90000)}`;
            }
            
            // Create a default name if none was extracted
            if (!studentData.name) {
              studentData.name = `Unknown Student ${studentData.id}`;
            }
            
            // Process the OCR result
            processOcrResult({
              id: studentData.id,
              name: studentData.name,
              imagePath: filename
            });
            
          } catch (ocrError) {
            console.error('❌ OCR failed:', ocrError);
            setScanning(false);
            setOcrProgress('');
            Alert.alert('Error', 'Failed to analyze the ID card. Please try again.');
          }
        }
      } catch (error) {
        console.error('Camera Error:', error);
        setScanning(false);
        setOcrProgress('');
        Alert.alert('Error', 'Failed to capture image. Please try again.');
      }
    }
  };

  const processOcrResult = async (result: {id: string, name: string, imagePath?: string}) => {
    try {
      setOcrProgress('Processing information...');
      console.log('OCR Result:', JSON.stringify(result));

      // Extract student info from OCR and provide defaults
      const id = result.id || '';
      const name = result.name || '';
      const finalImagePath = result.imagePath || croppedPhoto || undefined;  // Use undefined, not null
      console.log('Extracted:', { id, name, imagePath: finalImagePath });

      if (!id || !name) {
        Alert.alert("Extraction Failed", "Could not extract all required information. Please try again.");
        setScanning(false);
        setOcrProgress('');
        return;
      }

      // Get the event details to access its no-go list
      const eventDetails = await getEventDetails(eventId);
      const eventNoGoList = eventDetails?.event?.noGoList || [];

      // Check if the person is on the event's no-go list
      const isOnEventNoGoList = eventNoGoList.some(
        noGoName => noGoName.toLowerCase() === name.toLowerCase().trim()
      );

      // Check if the person is on the global no-go list (as a fallback)
      const isOnGlobalNoGoList = isOnNoGoList(name);

      if (isOnEventNoGoList || isOnGlobalNoGoList) {
        const listType = isOnEventNoGoList ? "event's" : "global";
        Alert.alert(
          '⚠️ NO ENTRY',
          `${name} is on the ${listType} no-go list and should not be admitted.`,
          [
            { 
              text: 'OK', 
              style: 'cancel',
              onPress: () => {
                setScanning(false);
                setOcrProgress('');
                setCroppedPhoto(null);
              }
            }
          ]
        );
        return;
      }

      // Get current user
      const currentUser = getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to mark attendance');
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        'Confirm Attendance',
        `Add attendance for:\nName: ${name}\nID: ${id}`,
        [
          {
            text: 'Rescan',
            style: 'cancel',
            onPress: () => {
              setScanning(false);
              setOcrProgress('');
              setCroppedPhoto(null);
            }
          },
          {
            text: 'Add',
            onPress: async () => {
              try {
                await markAttendance(
                  eventId || '',
                  id || '',
                  currentUser?.uid || '',
                  'present',
                  `Name: ${name || 'Unknown'}`,
                  finalImagePath || undefined
                );
                
                // Show success message
                Alert.alert(
                  'Success',
                  'Attendance marked successfully',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        setScanning(false);
                        setOcrProgress('');
                        setCroppedPhoto(null);
                      }
                    }
                  ]
                );
              } catch (error) {
                console.error('Error marking attendance:', error);
                Alert.alert('Error', 'Failed to mark attendance. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error processing OCR result:', error);
      Alert.alert('Error', 'Failed to process the ID card. Please try again.');
    } finally {
      setScanning(false);
      setOcrProgress('');
      setCroppedPhoto(null);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current: CameraType) => 
      current === 'back' ? 'front' : 'back'
    );
  };

  const toggleTorch = () => {
    // Update UI immediately
    const newTorchMode = !torchMode;
    setTorchMode(newTorchMode);
    
    // Log for debugging
    console.log('Setting torch mode to:', newTorchMode);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <CameraView 
        style={styles.camera} 
        facing={facing}
        ref={cameraRef}
        enableTorch={torchMode}
        ratio="16:9"
      >
        {/* Back Button */}
        <SafeAreaView style={styles.safeArea}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>Scan ID Card</Text>
          </View>
        </SafeAreaView>
        
        {/* Overlay for ID card alignment */}
        <View style={styles.overlay}>
          <View style={styles.cardGuideContainer}>
            <View style={styles.cardGuide}>
              <View style={[styles.cardCorner1, { top: 0, left: 0 }]} />
              <View style={[styles.cardCorner2, { top: 0, right: 0 }]} />
              <View style={[styles.cardCorner3, { bottom: 0, left: 0 }]} />
              <View style={[styles.cardCorner4, { bottom: 0, right: 0 }]} />
            </View>
            <Text style={styles.alignText}>Align with ID</Text>
          </View>
        </View>

        {/* OCR Progress Indicator */}
        {scanning && ocrProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBox}>
              <Ionicons name="hourglass-outline" size={24} color={COLORS.primary} style={styles.progressIcon} />
              <Text style={styles.progressText}>{ocrProgress}</Text>
            </View>
          </View>
        )}

        {/* Camera controls */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.flipButton}
            onPress={toggleCameraFacing}
          >
            <Ionicons name="camera-reverse-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={takePhoto}
            disabled={scanning}
          >
            {scanning ? (
              <View style={styles.processingIndicator}>
                <Ionicons name="sync" size={24} color={COLORS.white} />
              </View>
            ) : (
              <View style={styles.captureIcon} />
            )}
          </TouchableOpacity>
          

          <TouchableOpacity 
            style={[
              styles.helpButton,
              torchMode && { backgroundColor: '#009CDF' }
            ]}
            onPress={toggleTorch}
          >
            <Ionicons 
              name={torchMode ? "flashlight" : "flashlight-outline"} 
              size={22} 
              color={COLORS.white} 
            />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: StatusBar.currentHeight || 40,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginLeft: 10,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
    marginRight: 40, // To balance with the back button
  },
  headerText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
    backgroundColor: COLORS.white,
  },
  permissionTitle: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: SIZES.radius,
    ...SHADOWS.medium,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.3,
  },
  cardGuideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  cardGuide: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCorner1: {
    position: 'absolute',
    width: 60,
    height: 40,
    borderColor: '#fff',
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderTopLeftRadius: 5,
  },
  cardCorner2: {
    position: 'absolute',
    width: 60,
    height: 40,
    borderColor: '#fff',
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderTopRightRadius: 5,
  },
  cardCorner3: {
    position: 'absolute',
    width: 60,
    height: 40,
    borderColor: '#fff',
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 5,
  },
  cardCorner4: {
    position: 'absolute',
    width: 60,
    height: 40,
    borderColor: '#fff',
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomRightRadius: 5,
  },
  alignText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: -64,
  },
  progressContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.25,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    ...SHADOWS.medium,
  },
  progressIcon: {
    marginRight: 8,
    color: COLORS.primary,
  },
  progressText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 30,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  captureIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
  },
  processingIndicator: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 30,
  },
  torchButton: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 5,
  },
  torchButtonText: {
    color: 'white',
    fontSize: 16,
  },
});
