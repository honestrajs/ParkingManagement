import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';


export default function LoginScreen({ navigation, setIsLoggedIn }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    console.log('Login attempt started');
    if (!username.trim() || !password) {
      console.log('Username or password missing');
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }
    setLoading(true);
    try {
      console.log('Querying database for user:', username);

      const userRef = ref(db, `Managers/${username}`);
      const snapshot = await get(userRef);
      const data = snapshot.val();

      //const snapshot = await database().ref(`Managers/${username}`).once('value');
      setLoading(false);
      console.log("_________-")
      console.log('Snapshot:', snapshot);
      console.log('Database response received');
     // const data = snapshot.val();
      console.log('Data from DB:', data);
      if (!data || !data.pwd) {
        console.log('No user data or password found');
        Alert.alert('Login Failed', 'Invalid username or password');
        
        return;
      }
      if (String(data.pwd) !== password) {
        console.log('Password mismatch');
        console.log('Entered password:', password);
        console.log('Database password:', data.pwd);
        Alert.alert('Login Failed', 'Invalid username or password');
        setLoading(false);
        return;
      }
      // Success: Navigate to ListScreen with managerId
      console.log('Login successful');
      navigation.navigate('List', { managerId: username });
    } catch (e) {
      console.log('Login error:', e);
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.card}>
             
              <Text style={styles.subtitle}>Manager Login</Text>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#A0A4B8"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#A0A4B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.loginButton}
                disabled={loading}
                onPress={handleLogin}
              >
                <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
     // Soft green background
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 370,
    backgroundColor: '#f7faff',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#4a5568',
    marginBottom: 24,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    backgroundColor: '#eaf1fb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e7ef',
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eaf1fb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e7ef',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 12,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
  },
}); 