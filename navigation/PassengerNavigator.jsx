import React from 'react';
import { View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { IconButton, useTheme, Text, Badge } from 'react-native-paper';
import { useRequestStore } from '../store/requestStore';
import { useThemeStore } from '../store/themeStore';

// Completed & Placeholder Screen Imports
import HomeScreen from '../app/passenger/HomeScreen';
import AddTripScreen from '../app/passenger/AddTripScreen';
import AssistanceFormScreen from '../app/passenger/AssistanceFormScreen';
import UploadDocumentsScreen from '../app/passenger/UploadDocumentsScreen';
import RequestTrackingScreen from '../app/passenger/RequestTrackingScreen';
import NotificationsScreen from '../app/passenger/NotificationsScreen';
import ProfileScreen from '../app/passenger/ProfileScreen';
import PassengerCommScreen from '../app/admin/PassengerCommScreen';

const Stack = createStackNavigator();

/**
 * Renders the notification bell icon with an overlay badge for unread notifications.
 * 
 * @param {Object} props - Component properties.
 * @param {Object} props.navigation - React Navigation navigation prop.
 * @returns {React.JSX.Element} Notification bell layout.
 */
function NotificationBell({ navigation }) {
  const theme = useTheme();
  const unreadCount = useRequestStore((state) => state.unreadNotificationCount);

  return (
    <View style={{ position: 'relative', marginRight: 8 }}>
      <IconButton
        icon="bell-outline"
        iconColor={theme.colors.onPrimary}
        size={24}
        onPress={() => navigation.navigate('Notifications')}
      />
      {unreadCount > 0 && (
        <Badge
          visible={true}
          size={18}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: theme.colors.error,
            color: '#FFFFFF',
          }}
        >
          {unreadCount}
        </Badge>
      )}
    </View>
  );
}

/**
 * PassengerNavigator component configuring stack navigation for passenger screens.
 * Renders custom headers with step indicators for the wizard flow, and
 * a multi-line title/subtitle header for the RequestTrackingScreen.
 * 
 * @returns {React.JSX.Element} Passenger Stack Navigator.
 */
export default function PassengerNavigator() {
  const theme = useTheme();
  const { toggleTheme, isDarkMode } = useThemeStore();

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
          elevation: 4,
          shadowOpacity: 0.2,
        },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: 'bold', fontSize: 20, color: theme.colors.onPrimary },
        headerRight: () => (
          <IconButton
            icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
            iconColor={theme.colors.onPrimary}
            onPress={toggleTheme}
          />
        ),
      }}
    >
      {/* Home Screen: Shows brand header and notification bell action */}
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={({ navigation }) => ({ 
          title: 'Aviora',
          headerLeft: () => null, // Suppress back arrow on home screen
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <NotificationBell navigation={navigation} />
              <IconButton
                icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
                iconColor={theme.colors.onPrimary}
                onPress={toggleTheme}
              />
            </View>
          ),
        })} 
      />

      {/* AddTripScreen: Step 1 of 3 */}
      <Stack.Screen 
        name="AddTrip" 
        component={AddTripScreen} 
        options={{ title: 'Trip Details (Step 1/3)' }} 
      />

      {/* AssistanceFormScreen: Step 2 of 3 */}
      <Stack.Screen 
        name="AssistanceForm" 
        component={AssistanceFormScreen} 
        options={{ title: 'Service Details (Step 2/3)' }} 
      />

      {/* UploadDocumentsScreen: Step 3 of 3 */}
      <Stack.Screen 
        name="UploadDocuments" 
        component={UploadDocumentsScreen} 
        options={{ title: 'Verify Files (Step 3/3)' }} 
      />

      {/* RequestTrackingScreen: Custom title containing the requestId parameter */}
      <Stack.Screen 
        name="RequestTracking" 
        component={RequestTrackingScreen} 
        options={({ route }) => ({
          headerTitle: () => (
            <View style={{ justifyContent: 'center' }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
                Track Assistance
              </Text>
              {route.params?.requestId ? (
                <Text 
                  variant="bodySmall" 
                  style={{ color: theme.colors.onPrimary + 'B0', fontSize: 10, marginTop: -2 }}
                  numberOfLines={1}
                >
                  ID: {route.params.requestId}
                </Text>
              ) : null}
            </View>
          ),
        })} 
      />

      <Stack.Screen
        name="PassengerComm"
        component={PassengerCommScreen}
        options={{ title: 'Assigned Staff Chat' }}
      />

      {/* Notifications: standard header */}
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Notification Alerts' }} 
      />

      {/* Profile: standard header */}
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }} 
      />
    </Stack.Navigator>
  );
}
