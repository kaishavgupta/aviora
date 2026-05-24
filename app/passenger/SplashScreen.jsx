import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * SplashScreen component displayed at app launch.
 * Plays an entrance animation (fade and scale-up) for the airplane logo,
 * and automatically redirects to the "Login" screen after a 3-second delay.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} SplashScreen layout.
 */
export default function SplashScreen({ navigation }) {
  const theme = useTheme();

  // Animation values for fading and scaling the icon
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Run entrance animation for the logo icon
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Redirect to the Login screen after exactly 3 seconds
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, scaleAnim]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Animated.View
        style={[
          styles.animationWrapper,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { rotate: '45deg' } // Aviation style tilt for the airplane
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="airplane"
          size={120}
          color={theme.colors.onPrimary}
        />
      </Animated.View>

      <Text
        variant="displayMedium"
        style={[styles.titleText, { color: theme.colors.onPrimary }]}
      >
        AVIORA
      </Text>
      
      <Text
        variant="titleMedium"
        style={[styles.subtitleText, { color: theme.colors.secondary || '#F59E0B' }]}
      >
        Airport Assistance & Protocol
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  animationWrapper: {
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },
  subtitleText: {
    marginTop: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
