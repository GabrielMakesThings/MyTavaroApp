import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../../../utils/supabase';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUserStore } from '../../../utils/useUserStore';
import { RootStackParamList } from './types';

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUpScreen'>;

type Props = {
  navigation: SignUpScreenNavigationProp;
};

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Still use these if you auto-login users immediately after sign-up
  const setUser = useUserStore((state) => state.setUser);
  const setEmpresas = useUserStore((state) => state.setEmpresas);

  const handleSignUp = async () => {
    setError('');
    setLoading(true);

    // --- Client-Side Validation ---
    if (!email || !password || !confirmPassword) {
      setError('Por favor, completa todos los campos.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError(
        'La contraseña debe tener al menos 6 caracteres.'
      );
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      // --- Supabase Sign Up Success Handling ---
      if (data.user && !data.session) {
        // SCENARIO 1: Email confirmation is required (most common)
        Alert.alert(
          'Registro Exitoso',
          '¡Felicitaciones! Tu cuenta ha sido creada. Por favor, revisa tu correo electrónico para verificarla antes de iniciar sesión.'
        );
        // Navigate back to LoginScreen, as the user cannot log in yet
        navigation.navigate('LoginScreen');
      } else if (data.user && data.session) {
        // SCENARIO 2: User is automatically logged in (email confirmation disabled or magic link)
        Alert.alert(
          'Registro Exitoso',
          '¡Tu cuenta ha sido creada y has iniciado sesión!'
        );

        // Update Zustand store with the new user's basic info
        setUser({
          id: data.user.id,
          email: data.user.email || '',
        });

        // IMPORTANT: The `fetchUserEmpresas` needs to be done *after* the user's session is active,
        // and it now determines whether to go to HomeScreen or EmpresaOnboarding.
        // We'll rely on the LoginScreen's logic or a similar check.
        // For simplicity and to avoid duplicating the company check here,
        // we'll navigate directly to EmpresaOnboarding for new users who are auto-logged in.
        // They explicitly need to associate with a company.
        navigation.navigate('EmpresaOnboardingScreen', { userId: data.user.id });

        // If you want ALL users to go through the LoginScreen flow (where company check occurs),
        // regardless of auto-login, you could navigate to LoginScreen here too.
        // However, auto-login -> immediate company setup is a smoother UX.

      } else {
        // Unexpected scenario (e.g., neither user nor session found on success)
        Alert.alert(
          'Error de Registro',
          'No se pudo completar el registro. Inténtalo de nuevo.'
        );
      }
    } catch (error: any) {
      setError(error.message);
      Alert.alert('Error de Registro', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#003978', '#012349', '#00152C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <Image source={require('/Users/nachorojas/Documents/TavaroApp/Screens/LogInScreen/Assets/Logo.png')} style={styles.logo} />

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          placeholderTextColor="#A0A0A0"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#A0A0A0"
        />
        <TextInput
          style={styles.input}
          placeholder="Repetir Contraseña"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor="#A0A0A0"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Crear cuenta</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
          <Text style={styles.link}>¿Ya tienes una cuenta? Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  logo: {
    width: 219,
    height: 140,
    marginBottom: 40,
    resizeMode: 'contain',
  },
  input: {
    width: '80%',
    backgroundColor: '#ffffff',
    padding: 10,
    marginBottom: 15,
    borderRadius: 10,
    color: '#000',
  },
  errorText: {
    color: '#FFD700',
    marginBottom: 12,
    textAlign: 'center',
    width: '80%',
  },
  button: {
    backgroundColor: '#58A6FF',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'Marcellus-Regular',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 20,
  },
  gradient: {
    flex: 1,
  },
});

export default SignUpScreen;