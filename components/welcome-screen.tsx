import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    // For now, both buttons go to login
    // Later you can create a separate onboarding/registration flow
    router.push('/login');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logo}>
          <Svg width={70} height={70} viewBox="0 0 24 24" fill="white">
            <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </Svg>
        </View>

        {/* Title */}
        <Text style={styles.title}>Elderly Fall{'\n'}Detection</Text>

        {/* Description */}
        <Text style={styles.description}>
          Stay safe and connected with real-time fall detection and instant emergency alerts
        </Text>

        {/* Buttons */}
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleSignIn}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        {/* Emergency Badge */}
        <View style={styles.emergencyBadge}>
          <Text style={styles.badgeText}>24/7 Emergency Monitoring</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 50,
    maxWidth: 350,
  },
  primaryButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
    width: '100%',
    maxWidth: 280,
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
    width: '100%',
    maxWidth: 280,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emergencyBadge: {
    backgroundColor: '#ff4757',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 15,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});