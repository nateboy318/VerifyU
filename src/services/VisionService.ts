import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Student } from '../types';
import nlp from 'compromise';

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

    private static analyzeNameCandidates(blocks: string[]): NameCandidate[] {
        const candidates: NameCandidate[] = [];
        
        for (const text of blocks) {
            const line = text.trim();
            if (!line || line.length < 4 || line.length > 50) continue;
            
            let confidence = 0;
            const doc = nlp(line);
            
            // Use compromise's built-in person detection
            // Note: This is less accurate than using a dedicated plugin but works without additional dependencies
            const hasPersonName = doc.match('#Person').found || doc.match('#FirstName #LastName').found;
            if (hasPersonName) confidence += 0.5;
            
            // Advanced name pattern matching (common in IDs)
            const namePatterns = [
                /^[A-Z][a-z]+ [A-Z][a-z]+$/,  // Simple "First Last"
                /^[A-Z][a-z]+ [A-Z]\.? [A-Z][a-z]+$/,  // With middle initial
                /Name:\s*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i  // With "Name:" prefix
            ];
            
            if (namePatterns.some(pattern => pattern.test(line))) {
                confidence += 0.4;
            }
            
            // Check for name indicators
            if (NAME_INDICATORS.some(indicator => 
                line.toLowerCase().includes(indicator))) {
                confidence += 0.4;
            }
            
            // Check proper case formatting
            const words = line.split(' ');
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
            if (!/[^A-Za-z\s\.-]/.test(line)) confidence += 0.2;
            
            candidates.push({ text: line, confidence });
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
                id: bestIdMatch || `ID-${Date.now()}`,
                name: bestNameMatch || 'Unknown Student',
                timestamp: new Date()
            };

        } catch (error) {
            console.error('❌ Error processing image:', error);
            throw error;
        }
    }
} 