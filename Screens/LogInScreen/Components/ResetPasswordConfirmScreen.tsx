// ResetPasswordConfirmScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../../utils/supabase'; // Adjust path
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './types'; // Adjust path

type ResetPasswordConfirmScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ResetPasswordConfirmScreen'>;

type Props = {
  navigation: ResetPasswordConfirmScreenNavigationProp;
};

const ResetPasswordConfirmScreen: React.FC<Props> = ({ navigation }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

   const handlePasswordResetConfirm = async () => { // <--- ADD 'async' HERE
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ // <--- Here is the 'await'
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        Alert.alert('Error', updateError.message);
      } else {
        Alert.alert('¡Éxito!', 'Tu contraseña ha sido restablecida.');
        navigation.navigate('LoginScreen');
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', 'Ocurrió un problema al restablecer la contraseña. Inténtalo de nuevo.');
      console.error('Password reset confirm error:', err);
    } finally {
      setLoading(false);
    }
};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Establecer Nueva Contraseña</Text>
      <TextInput
        style={styles.input}
        placeholder="Nueva Contraseña"
        placeholderTextColor="#A0A0A0"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmar Nueva Contraseña"
        placeholderTextColor="#A0A0A0"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity
        style={styles.button}
        onPress={handlePasswordResetConfirm}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Confirmar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#00152C', // Match your gradient background
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 30,
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
    color: '#FFD700',
    marginBottom: 15,
    textAlign: 'center',
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
    fontFamily: 'Marcellus-Regular', // If you have this font imported
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ResetPasswordConfirmScreen;