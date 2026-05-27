import React from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

// Import Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreenWrapper from '../screens/HomeScreenWrapper';
import EmployeeMasterScreen from '../screens/EmployeeMasterScreen';
import SampleMasterScreen from '../screens/SampleMasterScreen';
import HandoverScreen from '../screens/HandoverScreen';
import TrackingScreen from '../screens/TrackingScreen';
import TimelineScreen from '../screens/TimelineScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import VerifyScanScreen from '../screens/VerifyScanScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.copper,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: {
          backgroundColor: COLORS.indigo,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 16,
          right: 16,
          elevation: 10,
          shadowColor: COLORS.indigo,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          borderRadius: 24,
          height: 64,
          paddingBottom: Platform.OS === 'ios' ? 16 : 8,
          paddingTop: 8,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreenWrapper}
        options={{ tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} /> }}
      />

      {isAdmin && (
        <Tab.Screen
          name="Samples"
          component={SampleMasterScreen}
          options={{ tabBarIcon: ({ color }) => <Feather name="box" size={20} color={color} /> }}
        />
      )}

      <Tab.Screen
        name="Transfers"
        component={HandoverScreen}
        options={{ tabBarIcon: ({ color }) => <Feather name="repeat" size={20} color={color} /> }}
      />

      <Tab.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{ tabBarIcon: ({ color }) => <Feather name="map-pin" size={20} color={color} /> }}
      />

      {isAdmin && (
        <Tab.Screen
          name="Employees"
          component={EmployeeMasterScreen}
          options={{ tabBarIcon: ({ color }) => <Feather name="users" size={20} color={color} /> }}
        />
      )}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  // While Firebase checks for a persisted session, show a clean splash loader
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.indigo }}>
        <ActivityIndicator size="large" color={COLORS.copper} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        // Go directly to Dashboard if already logged in, otherwise Login
        initialRouteName={isLoggedIn ? 'Dashboard' : 'Login'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={MainTabs} />
        <Stack.Screen name="Timeline" component={TimelineScreen} />
        <Stack.Screen name="HandoverFromTimeline" component={HandoverScreen} />
        <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
        <Stack.Screen name="VerifyScan" component={VerifyScanScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
