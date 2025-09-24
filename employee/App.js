/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { View, Text, StyleSheet, useColorScheme, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import EntryScreen from './screens/EntryScreen';
import ExitScreen from './screens/ExitScreen';
import ParkedScreen from './screens/ParkedScreen';
import MonthlyPassScreen from './screens/MonthlyPassScreen';
import CreateMonthlyPassScreen from './screens/CreateMonthlyPassScreen';
import CreatePrepaidPassScreen from './screens/CreatePrepaidPassScreen';
import PassHistoryScreen from './screens/PassHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeAreaTabBar}>
      <View style={styles.bendTabBarContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;
          const isFocused = state.index === index;
          let iconName;
          if (route.name === 'Entry') iconName = 'arrow-right-circle-outline';
          else if (route.name === 'Exit') iconName = 'arrow-left-circle-outline';
          else if (route.name === 'Parked') iconName = 'bike';
          else if (route.name === 'Pass') iconName = 'card-account-details-outline';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.bendTabItem}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.bendTabLabel,
                  { color: isFocused ? '#1976D2' : '#B0B3B8', marginBottom: 4 },
                ]}
              >
                {label}
              </Text>
              <Icon
                name={iconName}
                color={isFocused ? '#1976D2' : '#B0B3B8'}
                size={28}
                style={{ marginTop: 2 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Entry" component={EntryScreen} />
      <Tab.Screen name="Exit" component={ExitScreen} />
      <Tab.Screen name="Parked" component={ParkedScreen} />
      <Tab.Screen name="Pass" component={MonthlyPassScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <NavigationContainer>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="CreateMonthlyPass"
          component={CreateMonthlyPassScreen}
          options={{ headerShown: true, title: 'Create Monthly Pass' }}
        />
        <Stack.Screen
          name="CreatePrepaidPass"
          component={CreatePrepaidPassScreen}
          options={{ headerShown: true, title: 'Create Prepaid Pass' }}
        />
        <Stack.Screen
          name="PassHistory"
          component={PassHistoryScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
    fontFamily: 'Poppins-Bold',
  },
  safeAreaTabBar: {
    backgroundColor: '#fff',
  },
  bendTabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
    height: 64,
    paddingBottom: 4,
    elevation: 0,
    shadowOpacity: 0,
  },
  bendTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 2,
  },
  bendTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: 'Inter-Regular',
  },
}); 