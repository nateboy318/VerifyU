## Usage

### Creating an Event
1. Tap the "+" button on the home screen
2. Fill in event details:
   - Select an emoji icon
   - Enter event name
   - Choose date and time
   - Add location (optional)
   - Add description (optional)
3. Tap "Create Event"

### Scanning IDs
1. Select an event from the list
2. Tap "Scan" button
3. Point camera at student ID barcode
4. Confirmation will appear on successful scan

### Viewing Attendance
1. Select an event
2. Tap "View Details"
3. See list of scanned attendees
4. Use search/filter options as needed

### Managing Events
1. Access event list
2. Use action buttons:
   - View: See event details
   - Edit: Modify event
   - Scan: Start scanning
   - Delete: Remove event

## Contributing

1. Fork the repository
2. Create your feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Acknowledgments

- React Native community
- Expo team
- All contributors to this project

## Installation & Local Setup

### Prerequisites
- Node.js (v14 or newer)
- npm or yarn
- Git
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Step-by-Step Local Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/chuck-alt-delete/cardinalscanner.git
   cd cardinalscanner
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or if you use yarn
   yarn install
   ```

3. **Set Up Environment**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Open .env and configure your environment variables if needed
   ```

4. **Start Development Server**
   ```bash
   # Using npm
   npm start
   # or using yarn
   yarn start
   # or using expo directly
   npx expo start
   ```

5. **Running on Your Device**

   **Using Expo Go (Easiest Method)**:
   - Install Expo Go on your mobile device
   - Make sure your phone and computer are on the same network
   - Scan the QR code shown in the terminal with:
     - iOS: Use the Camera app
     - Android: Use the Expo Go app

   **Using Android Emulator**:
   - Open Android Studio
   - Open AVD Manager and start your emulator
   - In the terminal running Expo, press 'a'

   **Using iOS Simulator (macOS only)**:
   - Install Xcode
   - Start the iOS Simulator
   - In the terminal running Expo, press 'i'

### Common Issues & Solutions

1. **Metro Bundler Port Issues**
   ```bash
   # If port 8081 is already in use
   kill -9 $(lsof -ti:8081)
   # Then restart the development server
   ```

2. **Node Modules Issues**
   ```bash
   # Remove node_modules and reinstall
   rm -rf node_modules
   npm install
   ```

3. **Cache Issues**
   ```bash
   # Clear Expo cache
   expo r -c
   
   # Clear npm cache
   npm cache clean --force
   ```

4. **Android/iOS Build Issues**
   ```bash
   # Reset Expo development client
   expo start -c
   ```

### Development Tools Setup

1. **VS Code Extensions**
   - React Native Tools
   - ESLint
   - Prettier
   - TypeScript support

2. **Chrome Developer Tools**
   - Install React Developer Tools extension
   - Enable remote debugging in Expo

### Project Structure