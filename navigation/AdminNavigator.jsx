import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { IconButton, useTheme } from 'react-native-paper';
import { useThemeStore } from '../store/themeStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Store Import
import { useAuthStore } from '../store/authStore';
import { useRequestStore } from '../store/requestStore';

// Admin screens
import RequestListScreen from '../app/admin/RequestListScreen';
import RequestDetailScreen from '../app/admin/RequestDetailScreen';
import AssignStaffScreen from '../app/admin/AssignStaffScreen';
import StatusUpdateScreen from '../app/admin/StatusUpdateScreen';
import PassengerCommScreen from '../app/admin/PassengerCommScreen';
import DailyReportScreen from '../app/admin/DailyReportScreen';
import OnboardPassengerScreen from '../app/admin/OnboardPassengerScreen';
import AdminProfileScreen from '../app/admin/AdminProfileScreen';
import NotificationsScreen from '../app/passenger/NotificationsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Stack Navigator for the Requests tab flow.
 * Includes request listings, detail view, staff assignment, status updates, and chat screen.
 * 
 * @returns {React.JSX.Element} The Request Stack Navigator.
 */
function RequestStackNavigator() {
  const theme = useTheme();
  const { toggleTheme, isDarkMode } = useThemeStore();
  return (
    <Stack.Navigator
      initialRouteName="RequestList"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
          elevation: 4,
          shadowOpacity: 0.2,
        },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <IconButton
            icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
            iconColor={theme.colors.onPrimary}
            onPress={toggleTheme}
          />
        ),
      }}
    >
      <Stack.Screen 
        name="RequestList" 
        component={RequestListScreen} 
        options={{ title: 'Assistance Requests' }} 
      />
      <Stack.Screen 
        name="RequestDetail" 
        component={RequestDetailScreen} 
        options={{ title: 'Request Details' }} 
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Notifications' }} 
      />
      <Stack.Screen 
        name="AssignStaff" 
        component={AssignStaffScreen} 
        options={{ title: 'Assign Support Staff' }} 
      />
      <Stack.Screen 
        name="OnboardPassenger" 
        component={OnboardPassengerScreen} 
        options={{ title: 'Onboard Passenger' }} 
      />
      <Stack.Screen 
        name="StatusUpdate" 
        component={StatusUpdateScreen} 
        options={{ title: 'Update Request Status' }} 
      />
      <Stack.Screen 
        name="PassengerComm" 
        component={PassengerCommScreen} 
        options={{ title: 'Passenger Chat' }} 
      />
    </Stack.Navigator>
  );
}

/**
 * Stack Navigator for the Reports tab flow.
 * 
 * @returns {React.JSX.Element} The Report Stack Navigator.
 */
function ReportStackNavigator() {
  const theme = useTheme();
    const { toggleTheme, isDarkMode } = useThemeStore();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
          elevation: 4,
          shadowOpacity: 0.2,
        },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <IconButton
            icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
            iconColor={theme.colors.onPrimary}
            onPress={toggleTheme}
          />
        ),
      }}
    >
      <Stack.Screen 
        name="DailyReport" 
        component={DailyReportScreen} 
        options={{ title: 'Daily Report & Insights' }} 
      />
    </Stack.Navigator>
  );
}

/**
 * Stack Navigator for the Profile tab flow.
 * 
 * @returns {React.JSX.Element} The Profile Stack Navigator.
 */
function ProfileStackNavigator() {
  const theme = useTheme();
    const { toggleTheme, isDarkMode } = useThemeStore();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
          elevation: 4,
          shadowOpacity: 0.2,
        },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <IconButton
            icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
            iconColor={theme.colors.onPrimary}
            onPress={toggleTheme}
          />
        ),
      }}
    >
      <Stack.Screen 
        name="AdminProfile" 
        component={AdminProfileScreen} 
        options={{ title: 'My Profile' }} 
      />
    </Stack.Navigator>
  );
}

/**
 * Bottom Tab Navigator for Staff & Admin workspace.
 * Hosts the Requests workflow, Reports analytics, and Profile controls.
 * 
 * @returns {React.JSX.Element} Admin Bottom Tab Navigator.
 */
export default function AdminNavigator() {
  const theme = useTheme();
  const { toggleTheme, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom || 0;
  const role = useAuthStore((state) => state.role);
  const isAdmin = role === 'admin';
  
  // Real-time Badge calculation for unassigned "New Request" status documents
  const allRequests = useRequestStore((state) => state.allRequests);
  const newCount = allRequests.filter((req) => req.status === 'New Request').length;

  return (
    <Tab.Navigator
      initialRouteName="RequestsTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outline + '20',
          paddingBottom: Math.max(safeBottom, 6),
          height: 60 + safeBottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* Tab 1: Requests */}
      <Tab.Screen
        name="RequestsTab"
        component={RequestStackNavigator}
        options={{
          tabBarLabel: 'Requests',
          tabBarBadge: newCount > 0 ? newCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list" color={color} size={size} />
          ),
        }}
      />
      
      {isAdmin && (
        <Tab.Screen
          name="ReportTab"
          component={ReportStackNavigator}
          options={{
            tabBarLabel: 'Report',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-bar" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Tab 3: Profile */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
