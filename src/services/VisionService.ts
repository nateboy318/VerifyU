import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Student } from '../types';
import nlp from 'compromise';
import * as tf from '@tensorflow/tfjs';

// Import credentials
const credentials = require('../../google_creds.json');

// Define type for annotation objects
interface TextAnnotation {
    description: string;
    boundingPoly?: {
        vertices: Array<{ x: number, y: number }>;
    };
}

interface NameCandidate {
    text: string;
    confidence: number;
}

const COMMON_TITLES = ['student', 'id', 'card', 'university', 'college', 'school'];
const NAME_INDICATORS = ['name:', 'student:', 'student name:'];
const ID_INDICATORS = ['id:', 'id#:', 'student id:', 'number:'];

// Common name indicators with different formats
const NAME_PATTERNS = [
    /^[A-Z][a-z]+ [A-Z][a-z]+$/,                       // First Last
    /^[A-Z][a-z]+ [A-Z]\.? [A-Z][a-z]+$/,             // First M. Last
    /Name:\s*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i,        // Name: First Last
    /Student:\s*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i,     // Student: First Last
    /([A-Z][a-z]+),\s([A-Z][a-z]+)/,                  // Last, First
];

// Helper functions outside the class
async function readFile(path: string) {
    const content = await FileSystem.readAsStringAsync(path);
    return content;
}

async function fileExists(path: string) {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
}

/**
 * Service class for handling interactions with Google Cloud Vision API
 */
export class VisionService {
    private static readonly API_KEY = 'AIzaSyDhdKl9outmUUPrDGgbtChye0nmMNFe4fA';
    private static readonly API_URL = 'https://vision.googleapis.com/v1/images:annotate';
    private static model: tf.GraphModel | null = null;

    private static analyzeNameCandidates(blocks: string[]): NameCandidate[] {
        const candidates: NameCandidate[] = [];
        
        for (let i = 0; i < blocks.length; i++) {
            const text = blocks[i].trim();
            if (!text || text.length < 4 || text.length > 50) continue;
            
            let confidence = 0;
            const doc = nlp(text);
            
            // Enhanced NER with compromise
            const people = doc.people();
            if (people.found) {
                // If compromise specifically identified this as a person
                confidence += 0.6;
                
                // Even more confident if it found a full name pattern
                if (doc.match('(#FirstName|#GivenName) (#LastName|#Surname)').found) {
                    confidence += 0.2;
                }
            }
            
            // Advanced name pattern matching (common in IDs)
            if (NAME_PATTERNS.some(pattern => pattern.test(text))) {
                confidence += 0.4;
            }
            
            // Check for name indicators
            if (NAME_INDICATORS.some(indicator => 
                text.toLowerCase().includes(indicator))) {
                confidence += 0.4;
            }
            
            // Check proper case formatting
            const words = text.split(' ');
            const isProperCase = words.every(word => 
                word.length > 0 && 
                word[0] === word[0].toUpperCase() && 
                word.slice(1).toLowerCase() === word.slice(1)
            );
            if (isProperCase) confidence += 0.3;
            
            // Skip lines with common titles
            if (words.some(word => COMMON_TITLES.includes(word.toLowerCase()))) continue;
            
            // Check word count (most names are 2-3 words)
            if (words.length >= 2 && words.length <= 3) confidence += 0.2;
            
            // Check for only letters and basic punctuation
            if (!/[^A-Za-z\s\.-]/.test(text)) confidence += 0.2;
            
            // Check text before and after for name indicators
            const prevLine = i > 0 ? blocks[i-1].toLowerCase().trim() : '';
            const nextLine = i < blocks.length-1 ? blocks[i+1].toLowerCase().trim() : '';

            // Check if surrounding lines indicate this is a name
            if (prevLine.includes('name') || prevLine.includes('student') || 
                nextLine.includes('id') || nextLine.includes('number')) {
                confidence += 0.3;
            }
            
            candidates.push({ text: text, confidence });
        }
        
        return candidates.sort((a, b) => b.confidence - a.confidence);
    }

    private static analyzeIdCandidates(text: string): string[] {
        const doc = nlp(text);
        const candidates: string[] = [];
        
        // Look for patterns that might indicate an ID
        const idPatterns = [
            /ID\s*#\s*(\d{5,12})/i,
            /STUDENT\s+ID[:#\s-]*(\d{5,12})/i,
            /ID\s*NUMBER[:#\s-]*(\d{5,12})/i,
            /ID[:#\s-]*(\d{5,12})/i,
            /(\d{7,10})/  // fallback for just numbers of appropriate length
        ];
        
        // First try to find IDs near ID indicators
        const matches = text.match(/(id|student id|identification)\s*(number|#|no)?\s*([0-9]{5,12})/i);
        if (matches && matches[3]) {
            candidates.push(matches[3]);
        }
        
        // Then try regular expressions
        for (const pattern of idPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                candidates.push(match[1].replace(/[^\d]/g, ''));
            }
        }
        
        // Convert to array and remove duplicates using Array.from()
        return Array.from(new Set(candidates));
    }

    /**
     * Process an image with Google Cloud Vision OCR
     * @param imageUri URI of the image to process
     * @returns Promise with the extracted student information
     */
    static async processImage(imageUri: string): Promise<Partial<Student>> {
        try {
            console.log('⚠️ VisionService: Starting image processing...');

            // Process the image
            const processedImage = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ resize: { width: 1200 } }],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            if (!processedImage.base64) {
                throw new Error('Failed to get base64 data from image');
            }

            // Prepare the request to Google Cloud Vision API
            const requestBody = {
                requests: [{
                    image: {
                        content: processedImage.base64
                    },
                    features: [{
                        type: 'TEXT_DETECTION'
                    }]
                }]
            };

            // Make the API request
            const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            console.log('📝 Google Vision API result:', result);

            // Extract text blocks
            const fullText = result.responses[0]?.fullTextAnnotation?.text || '';
            const lines = fullText.split('\n').map((line: string) => line.trim());

            // Analyze name candidates
            const nameCandidates = this.analyzeNameCandidates(lines);
            console.log('👤 Name candidates:', nameCandidates);

            // Analyze ID candidates
            const idCandidates = this.analyzeIdCandidates(fullText);
            console.log('🔢 ID candidates:', idCandidates);

            const bestNameMatch = nameCandidates.length > 0 ? nameCandidates[0].text : null;
            const bestIdMatch = idCandidates[0];

            return {
                id: bestIdMatch || "Unknown",
                name: bestNameMatch || 'Unknown Student',
                timestamp: new Date()
            };

        } catch (error) {
            console.error('❌ Error processing image:', error);
            throw error;
        }
    }

    private static async detectPersonNameWithModel(text: string): Promise<boolean> {
        try {
            // Load the model if not already loaded
            if (!this.model) {
                // Path to your saved model - could be local or remote
                const modelPath = 'https://tfhub.dev/tensorflow/tfjs-model/bert_en_uncased_preprocess/3'; // Replace with actual path
                console.log('Loading NER model...');
                this.model = await tf.loadGraphModel(modelPath);
            }
            
            // Preprocess text for the model
            // This will depend on how your model expects input
            const encodedText = this.encodeText(text);
            
            // Make prediction
            const predictions = await this.model.predict(encodedText);
            
            // Process the predictions to determine if it's a person's name
            // This will depend on your model's output format
            const hasPerson = this.processPredictions(predictions);
            
            return hasPerson;
        } catch (error) {
            console.error('Error in NER model:', error);
            return false; // Fallback to false on error
        }
    }
    
    // Helper method to encode text for the model
    private static encodeText(text: string): tf.Tensor {
        // This is a placeholder - actual implementation depends on your model
        // For example, you might need to tokenize the text and convert to tensors
        
        // Simple example - convert to lowercase and split into words
        const words = text.toLowerCase().split(/\s+/);
        
        // Create a tensor - this is just an example
        // In reality, you would use a tokenizer specific to your model
        return tf.tensor([words.map(w => w.length)]); 
    }
    
    // Helper method to process model predictions
    private static processPredictions(predictions: tf.Tensor | tf.Tensor[] | tf.NamedTensorMap): boolean {
        // Handle NamedTensorMap case
        if (predictions instanceof Object && !(predictions instanceof tf.Tensor) && !Array.isArray(predictions)) {
            // Use the first tensor in the map
            const firstTensor = Object.values(predictions)[0] as tf.Tensor;
            const values = firstTensor.dataSync();
            return values.some(v => v > 0.5);
        } 
        // Handle array of tensors case
        else if (Array.isArray(predictions)) {
            const mainPrediction = predictions[0];
            const values = mainPrediction.dataSync();
            return values.some(v => v > 0.5);
        } 
        // Handle single tensor case
        else {
            const values = (predictions as tf.Tensor).dataSync();
            return values.some(v => v > 0.5);
        }
    }
} 