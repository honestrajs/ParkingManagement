import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';

// Initialize Realtime Database and Storage
const rtdb = database();
const storageRef = storage();

export { rtdb, storageRef }; 