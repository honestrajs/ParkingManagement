/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import '@react-native-firebase/app';
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import ListScreen from './screens/ListScreen';
import ParkingScreen from './screens/ParkingScreen';
import EmployeeScreen from './screens/EmployeeScreen';
import CashScreen from './screens/CashScreen';
import PassScreen from './screens/PassScreen';
import RevenueDetailsScreen from './screens/RevenueDetailsScreen';
import RevenueTrendsScreen from './screens/RevenueTrendsScreen';
import EmployeeListScreen from './screens/EmployeeListScreen';
import EmployeeRevenueDetailsScreen from './screens/EmployeeRevenueDetailsScreen';
import ChargesScreen from './screens/ChargesScreen';
import OldEntriesScreen from './screens/OldEntriesScreen';
import { Text } from 'react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator({ route }: any) {
  const { selectedBikeStand, managerId } = route.params || {};
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1ecb8b',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal: 10,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      <Tab.Screen 
        name="Parking" 
        component={ParkingScreen}
        initialParams={{ selectedBikeStand, managerId }}
        options={{
          tabBarLabel: 'Parking',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 16 }}>🏍️</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Employee" 
        component={EmployeeScreen}
        initialParams={{ selectedBikeStand, managerId }}
        options={{
          tabBarLabel: 'Employee',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 16 }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Pass" 
        component={PassScreen}
        initialParams={{ selectedBikeStand, managerId }}
        options={{
          tabBarLabel: 'Pass',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 16 }}>🎫</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Cash" 
        component={CashScreen}
        initialParams={{ selectedBikeStand, managerId }}
        options={{
          tabBarLabel: 'Cash',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 16 }}>💰</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
            </Stack.Screen>
            <Stack.Screen name="List" component={ListScreen} />
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="RevenueDetails" component={RevenueDetailsScreen} />
            <Stack.Screen name="RevenueTrends" component={RevenueTrendsScreen} />
            <Stack.Screen name="EmployeeList" component={EmployeeListScreen} />
            <Stack.Screen name="EmployeeRevenueDetails" component={EmployeeRevenueDetailsScreen} />
            <Stack.Screen name="Charges" component={ChargesScreen} />
            <Stack.Screen name="OldEntries" component={OldEntriesScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
