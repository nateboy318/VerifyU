import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Student } from '../types';

// Import credentials
const credentials = require('../../google_creds.json');

// Define type for annotation objects
interface TextAnnotation {
    description: string;
    boundingPoly?: {
        vertices: Array<{ x: number, y: number }>;
    };
}

/**
 * Service class for handling interactions with Google Cloud Vision API
 */
export class VisionService {
    // Your Google Cloud Vision API key
    // For demo, we'll use a simpler approach with an API key
    private static readonly API_KEY = 'AIzaSyDhdKl9outmUUPrDGgbtChye0nmMNFe4fA'; // User's API key
    private static readonly API_URL = 'https://vision.googleapis.com/v1/images:annotate';

    /**
     * Process an image with Google Cloud Vision OCR
     * @param imageUri URI of the image to process
     * @returns Promise with the extracted student information
     */
    static async processImage(imageUri: string): Promise<Partial<Student>> {
        try {
            console.log('⚠️ VisionService: Starting image processing...');
            console.log('📷 Original image URI:', imageUri);

            // IMPORTANT: No contrast or brightness operations here!
            // Only using resize and compression which are supported
            console.log('🔄 About to call ImageManipulator with ONLY resize operation');

            const processedImage = await ImageManipulator.manipulateAsync(
                imageUri,
                [
                    { resize: { width: 1200 } } // Only using resize, no contrast or brightness
                ],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            console.log('✅ Image manipulation completed successfully');

            if (!processedImage.base64) {
                throw new Error('Failed to get base64 data from the image');
            }

            console.log('🔍 Processed image width:', processedImage.width);
            console.log('🔍 Processed image height:', processedImage.height);
            console.log('📡 Making Vision API request...');

            // Make request to Vision API
            const response = await this.makeVisionApiRequest(processedImage.base64);

            // Extract and parse text from response
            return this.parseOcrResult(response);
        } catch (error) {
            console.error('❌ Vision API Error:', error);
            console.error('🔎 Error details:', JSON.stringify(error));
            throw error;
        }
    }

    /**
     * Make a request to the Google Cloud Vision API
     * @param base64Image Base64 encoded image
     * @returns API response
     */
    private static async makeVisionApiRequest(base64Image: string) {
        const requestBody = {
            requests: [
                {
                    image: {
                        content: base64Image
                    },
                    features: [
                        {
                            type: 'TEXT_DETECTION',
                            maxResults: 30
                        },
                        {
                            type: 'DOCUMENT_TEXT_DETECTION',
                            maxResults: 30
                        }
                    ]
                }
            ]
        };

        console.log('🌐 Sending request to Vision API...');

        const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('🚨 Vision API error response:', data);
            throw new Error(data.error?.message || 'Failed to process image with Vision API');
        }

        console.log('✅ Vision API response received successfully');
        return data;
    }

    /**
     * Parse the OCR result to extract student information
     * @param apiResponse Response from the Vision API
     * @returns Extracted student information
     */
    private static parseOcrResult(apiResponse: any): Partial<Student> {
        // First try the document text detection result (better for structured documents)
        const docTextAnnotations = apiResponse.responses[0]?.fullTextAnnotation?.text;
        // Then try the regular text detection
        const textAnnotations = apiResponse.responses[0]?.textAnnotations as TextAnnotation[] || [];

        if ((!textAnnotations || textAnnotations.length === 0) && !docTextAnnotations) {
            throw new Error('No text detected in the image');
        }

        // The first item contains the full text
        const fullText = docTextAnnotations || (textAnnotations[0]?.description || '');
        console.log('📝 Extracted full text:', fullText);

        // Get all detected words for analysis
        const allWords = textAnnotations.slice(1).map((annotation: TextAnnotation) => annotation.description);
        console.log('🔤 All detected words count:', allWords.length);
        if (allWords.length > 0) {
            console.log('🔤 Sample words:', allWords.slice(0, 10).join(', '));
        }

        // Default values
        let id = `ID-${Date.now()}`;
        let name = ''; // Start with empty name

        // ID EXTRACTION - PRIORITIZE ID# PATTERN
        // First check specifically for "ID#" pattern as mentioned by user
        const idNumberPatterns = [
            /ID\s*#\s*(\d+)/i,               // Matches: ID#12345, ID #12345, ID# 12345
            /ID\s*NUMBER\s*#?\s*(\d+)/i,      // Matches: ID NUMBER 12345, ID NUMBER#12345
            /ID\s*NO\.?\s*#?\s*(\d+)/i,       // Matches: ID NO #12345, ID NO. 12345
            /ID\s*[:=]\s*(\d+)/i,             // Matches: ID: 12345, ID=12345
            /ID\s*([\d-]+)/i,                 // Matches: ID 123-45-6789, ID 123456789
            /STUDENT\s*ID\s*#?\s*(\d+)/i,     // Matches: STUDENT ID 12345
            /NO\.?\s*(\d+)/i,                 // Matches: NO. 12345, NO 12345
            /NUMBER\s*[:=]?\s*(\d+)/i         // Matches: NUMBER: 12345, NUMBER=12345
        ];

        // Try each ID pattern in priority order
        let foundId = false;
        for (const pattern of idNumberPatterns) {
            const match = fullText.match(pattern);
            if (match && match[1]) {
                id = match[1].replace(/[^\d]/g, ''); // Clean up, keep only digits
                console.log(`🎯 Found ID using pattern ${pattern}: ${id}`);
                foundId = true;
                break;
            }
        }

        // If no ID found with specific patterns, look for sequences of digits
        if (!foundId) {
            console.log('⚠️ No specific ID pattern matched, looking for digit sequences...');

            // Split text into lines for more targeted searching
            const lines = fullText.split('\n');

            // First try to find lines containing ID indicators
            for (const line of lines) {
                if (/ID|NUMBER|NO\.?/i.test(line)) {
                    console.log('📍 Found line with ID indicator:', line);

                    // Extract all digit sequences from this line
                    const digitMatches = line.match(/\d+/g);
                    if (digitMatches && digitMatches.length > 0) {
                        // Use the longest digit sequence in this line
                        const longestDigitMatch = digitMatches.reduce((longest: string, current: string) =>
                            current.length > longest.length ? current : longest, '');

                        if (longestDigitMatch.length >= 5) { // Most IDs are at least 5 digits
                            id = longestDigitMatch;
                            console.log('🔢 Found ID in line with ID indicator:', id);
                            foundId = true;
                            break;
                        }
                    }
                }
            }

            // If still no ID, look for any digit sequence that looks like an ID
            if (!foundId) {
                const digitSequences = fullText.match(/\d{5,12}/g); // Most IDs are 5-12 digits
                if (digitSequences && digitSequences.length > 0) {
                    id = digitSequences[0]; // Use the first substantial digit sequence
                    console.log('⚠️ Falling back to first substantial digit sequence as ID:', id);
                }
            }
        }

        console.log('🆔 Final extracted ID:', id);

        // Split text into lines for better analysis
        const lines = fullText.split('\n');
        console.log('📊 Total lines in text:', lines.length);

        // Print each line for debugging
        lines.forEach((line: string, index: number) => {
            console.log(`📌 Line ${index + 1}: "${line}"`);
        });

        // APPROACH 1: Look for name on lines after keywords like "NAME" or "STUDENT"
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Check for explicit name labels
            if (/^(?:STUDENT|NAME)[:]\s*(.+)/i.test(line)) {
                const nameMatch = line.match(/^(?:STUDENT|NAME)[:]\s*(.+)/i);
                if (nameMatch && nameMatch[1]) {
                    name = nameMatch[1].trim();
                    console.log('✅ Found name with explicit label:', name);
                    break;
                }
            }

            // Check if current line has a name label but the value is on the next line
            if (/^(?:STUDENT|NAME)[:]?\s*$/i.test(line) && i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                if (nextLine.length > 2 && !/^ID|UNIVERSITY|COLLEGE|NUMBER/i.test(nextLine)) {
                    name = nextLine;
                    console.log('✅ Found name on line after label:', name);
                    break;
                }
            }
        }

        // APPROACH 2: Look for typical name patterns (2-3 capitalized words)
        if (!name) {
            const namePatterns = [
                // Fairly strict name pattern: 2-3 capitalized words
                /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/g,
                // Less strict name pattern
                /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,2})/g
            ];

            for (const pattern of namePatterns) {
                const nameMatches = fullText.match(pattern);
                if (nameMatches && nameMatches.length > 0) {
                    console.log('🔍 Name pattern matches:', nameMatches);

                    // Exclude common non-name phrases
                    const possibleNames = nameMatches.filter((match: string) =>
                        !/STUDENT ID|UNIVERSITY|COLLEGE|CARD|ISSUE|VALID|EXPIRE/i.test(match)
                    );

                    if (possibleNames.length > 0) {
                        name = possibleNames[0]; // Use the first match as most likely
                        console.log('✅ Found name with pattern:', name);
                        break;
                    }
                }
            }
        }

        // APPROACH 3: Try using allWords to find consecutive capitalized words
        if (!name && allWords.length > 1) {
            console.log('🔍 Trying to find name from individual words...');

            let nameWords: string[] = [];
            for (let i = 0; i < allWords.length; i++) {
                const word = allWords[i];
                // Check if this word looks like part of a name
                if (word.length > 1 &&
                    /^[A-Z][a-z]+$/.test(word) &&
                    !/^(THE|AND|FOR|ID|CARD|STUDENT|SCHOOL|UNIVERSITY|COLLEGE)$/i.test(word)) {

                    nameWords.push(word);
                    console.log(`👀 Possible name word: ${word}, current sequence: ${nameWords.join(' ')}`);

                    // If we have 2-3 words, treat as a full name
                    if (nameWords.length >= 2 && nameWords.length <= 3) {
                        name = nameWords.join(' ');
                        console.log('✅ Constructed name from words:', name);
                        break;
                    }
                } else {
                    // Reset if we encounter a non-name word
                    if (nameWords.length > 0) {
                        console.log(`🔄 Resetting name words sequence at word: ${word}`);
                        nameWords = [];
                    }
                }
            }
        }

        // APPROACH 4: Last resort - take a reasonable line
        if (!name && lines.length > 0) {
            console.log('🔍 Trying to find name from lines...');

            for (const line of lines) {
                // A name usually has spaces, isn't too short or too long, and doesn't contain common non-name words
                if (line.length > 3 && line.length < 30 &&
                    line.includes(' ') &&
                    !/ID|UNIVERSITY|COLLEGE|CARD|ISSUE|VALID|EXPIRE/i.test(line)) {
                    name = line.trim();
                    console.log('✅ Using first reasonable line as name:', name);
                    break;
                }
            }
        }

        // If all else fails, use a default
        if (!name) {
            name = `Student ${id.substr(-4)}`;
            console.log('⚠️ Using default name with ID suffix');
        }

        console.log('✅ Final extracted data - ID:', id, 'Name:', name);
        return {
            id,
            name,
            timestamp: new Date()
        };
    }
} 