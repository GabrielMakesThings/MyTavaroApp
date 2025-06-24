import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../../../utils/supabase'; // Adjust path
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './types'; // Adjust path based on your project structure

type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPasswordScreen'>;

type Props = {
  navigation: ForgotPasswordScreenNavigationProp;
};

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(''); // For success/general messages
  const [error, setError] = useState('');     // For input validation errors
  const [loading, setLoading] = useState(false);

 const handleResetPassword = async () => {
  setError('');
  setMessage('');
  setLoading(true);

  if (!email.trim()) {
    setError('Por favor, ingresa tu correo electrónico.');
    setLoading(false);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    setError('Por favor, ingresa un formato de correo electrónico válido.');
    setLoading(false);
    return;
  }

  try {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // THIS IS THE CRUCIAL ADDITION:
      // Replace 'tavaroapp' with your actual deep link scheme.
      // The 'reset-password' path is what your App.tsx deep link handler looks for.
      redirectTo: 'tavaroapp://reset-password',
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('Si existe una cuenta asociada a este correo, recibirás un enlace para restablecer tu contraseña en tu bandeja de entrada.');
      Alert.alert(
        'Enlace Enviado',
        'Si existe una cuenta asociada a este correo, recibirás un enlace para restablecer tu contraseña en tu bandeja de entrada. Por favor, revisa también tu carpeta de spam.'
      );
      setEmail(''); // Clear the input field
    }
  } catch (err: any) {
    setError(err.message);
    Alert.alert('Error', 'Ocurrió un problema al enviar el enlace. Inténtalo de nuevo.');
    console.error('Password reset error:', err);
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
        {/* Logo (optional, but for consistency) */}
        <Image source={require('/Users/nachorojas/Documents/TavaroApp/Screens/LogInScreen/Assets/Logo.png')} style={styles.logo} />

        <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
        <Text style={styles.description}>
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#A0A0A0"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Enviar enlace de restablecimiento</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')} style={styles.backToLoginButton}>
          <Text style={styles.link}>Volver a Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  logo: {
    width: 180, // Slightly smaller for this screen
    height: 110,
    marginBottom: 30,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 30,
    width: '85%',
  },
  input: {
    width: '80%',
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 15,
    borderRadius: 10,
    color: '#000',
  },
  errorText: {
    color: '#FFD700', // Yellow for errors
    marginBottom: 12,
    textAlign: 'center',
    width: '80%',
  },
  messageText: {
    color: '#ADFF2F', // Green for success messages
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
  backToLoginButton: {
    marginTop: 20,
  },
  link: {
    color: '#ffffff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  gradient: {
    flex: 1,
  },
});

export default ForgotPasswordScreen;