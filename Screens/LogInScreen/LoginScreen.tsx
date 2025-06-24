import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../../utils/supabase';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUserStore } from '../../utils/useUserStore';

// Define el tipo de los parámetros de navegación
type RootStackParamList = {
  LoginScreen: undefined;
  HomeScreen: undefined; // HomeScreen no necesita parámetros
  ForgotPassword: undefined;
  SignUp: undefined;
};

// Define el tipo de la propiedad navigation
type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LoginScreen'>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setUser = useUserStore((state) => state.setUser);
  const setEmpresas = useUserStore((state) => state.setEmpresas); // Cambiado a setEmpresas
  const clearUser = useUserStore((state) => state.clearUser);

  const handleLogin = async () => {
    try {
      const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        throw loginError;
      }

      if (!session?.user?.id) {
        Alert.alert('Error', 'User ID not found after login.');
        return;
      }

      // Login Exitoso, obtener la información del usuario y notificar a Zustand
      // Use the user data from the session object
      const user = {
        id: session.user.id,
        email: session.user.email || '', // Provide a default value for email
        // Add other properties from session.user if needed
      };

      setUser(user);

      // Fetch user empresas
      await fetchUserEmpresas(session.user.id);

      // Navigate to HomeScreen
      navigation.navigate('HomeScreen'); // No need to pass user as a parameter

    } catch (error: any) {
      setError(error.message);
      Alert.alert('Error de inicio de sesión', error.message);
    }
  };

  const fetchUserEmpresas = async (userId: string) => {
    try {
      const { data: userEmpresasData, error: userEmpresasError } = await supabase
        .from('usuarios_empresas')
        .select('*, empresas(*)') // Select all fields from usuarios_empresas and empresas
        .eq('usuario_id', userId);

      if (userEmpresasError) {
        console.error('Error fetching user empresas data:', userEmpresasError);
        Alert.alert('Error', 'Failed to fetch user empresas data. Please try again.');
        return; // Exit if there is an error.
      }

      if (!userEmpresasData || userEmpresasData.length === 0) {
        console.log('No empresas found for this user.');
        setEmpresas([]); // Set an empty array if no companies are found.
        return; // Exit if no companies are found.
      }

      // Map the data to the correct format
      const empresas = userEmpresasData.map((item) => ({
        ...item.empresas,
        rol: item.rol,
        user_empresa_id: item.id, // renombra para evitar colisiones
        user_empresa_creado_en: item.creado_en,
      }));

      setEmpresas(empresas); // Cambiado a setEmpresas

    } catch (error: any) {
      console.error('Error fetching or setting user empresas:', error);
      Alert.alert('Error', 'Failed to fetch or set user empresas. Please try again.');
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
        {/* Logo */}
        <Image source={require('./Assets/Logo.png')} style={styles.logo} />

        {/* Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Botón Entrar */}
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Iniciar sesión</Text>
        </TouchableOpacity>

        {/* Enlaces */}
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.link}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'LinearGradient',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  logo: {
    width: 219,
    height: 140,
    marginBottom: 40,
  },
  input: {
    width: '80%',
    backgroundColor: '#ffffff',
    padding: 10,
    marginBottom: 15,
    borderRadius: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
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
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginTop: 20,
  },
  link: {
    color: '#ffffff',
    fontSize: 14,
  },
  gradient: {
    flex: 1, // Cubre toda la pantalla
  },
});

export default LoginScreen;