import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './Screens/LogInScreen/LoginScreen';
import HomeScreen from './Screens/HomeScreen/HomeScreen';
import ProductScreen from './Screens/ProductScreen/ProductScreen';
import ProductDetailScreen from './Screens/ProductDetailScreen/ProductDetailScreen';
import CarritoScreen from './Screens/CarritoScreen/CarritoScreen';
import ProveedoresScreen from './Screens/ProveedoresScreen/ProveedoresScreen';
import ProveedorDetailScreen from './Screens/ProveedorDetailScreen/ProveedorDetailScreen';
import RecetasScreen from './Screens/RecetasScreen/RecetasScreen';
import RecetasDetailScreen from './Screens/RecetasDetailScreen/RecetasDetailScreen';
import GestionScreen from './Screens/GestionScreen/GestionScreen';
import OrderDetailScreen, { FullOrderDetails } from './Screens/OrderDetailScreen/OrderDetailScreen';
import { ProductProvider } from './Components/ProductContext';
import * as Sentry from '@sentry/react-native';
import { SearchProvider } from './Components/SearchContext';
import { supabase } from './utils/supabase.js';
import 'react-native-get-random-values';
import { useUserStore } from './utils/useUserStore'; // Import the Zustand store
import { Session } from '@supabase/supabase-js';
import { SENTRY_DSN } from '@env';

Sentry.init({
  dsn: SENTRY_DSN, // Use the variable here
  spotlight: __DEV__,
});

const Stack = createStackNavigator();

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const user = useUserStore((state) => state.user); // Get user from Zustand
  const setUser = useUserStore((state) => state.setUser); // Get setUser from Zustand
  const setEmpresas = useUserStore((state) => state.setEmpresas); // Get setEmpresas from Zustand
  const clearUser = useUserStore((state) => state.clearUser);

  const [isUserReady, setIsUserReady] = useState(false); // <-- AGREGAR ESTADO PARA CONTROLAR CUANDO EL USUARIO ESTÁ LISTO
  const [initialSession, setInitialSession] = useState<Session | null>(null);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial Session data:", session); // Log the initial session

        if (session?.user?.email && session?.user?.id) {
          // Use the user data from the session object
          const userData = {
            id: session.user.id,
            email: session.user.email,
            // Add other properties from session.user if needed
          };

          setUser(userData);
          console.log("User data set in Zustand (initial session):", userData);
          setIsUserReady(true); // Set user ready state
          setInitialSession(session); // Store the initial session

          fetchUserEmpresas(session.user.id);  // Fetch empresas here.
        } else {
          clearUser();
          console.log("User cleared from Zustand (initial session)");
          setIsUserReady(false);
          setInitialSession(null);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        Sentry.captureException(error);
        setIsUserReady(false);
      }
    };

    getSession();
  }, [setUser, clearUser, setEmpresas]);

  const fetchUserEmpresas = async (userId: string) => {
    try {
      console.log("Fetching empresas for user:", userId);
      const { data: userEmpresasData, error: userEmpresasError } = await supabase
        .from('usuarios_empresas')
        .select('*, empresas(*)') // Select all fields from usuarios_empresas and empresas
        .eq('usuario_id', userId);

      if (userEmpresasError) {
        console.error('Error fetching user empresas data:', userEmpresasError);
        Sentry.captureException(userEmpresasError);
        return;  // Important: Exit the function on error
      }

      console.log("userEmpresasData from Supabase:", userEmpresasData);

      // Map the data to the correct format
      const empresas = userEmpresasData.map((item) => ({
        ...item.empresas,
        rol: item.rol,
        user_empresa_id: item.id, // renombra para evitar colisiones
        user_empresa_creado_en: item.creado_en,
      }));
      setEmpresas(empresas);
      console.log("Empresas en Zustand:", empresas);
    } catch (error) {
      console.error("Error fetching user empresas:", error);
      Sentry.captureException(error);
    }
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("Auth state change:", _event, session);
        if (session?.user?.email && session?.user?.id) {
          // Use the user data from the session object
          const userData = {
            id: session.user.id,
            email: session.user.email,
            // Add other properties from session.user if needed
          };

          setUser(userData);
          setIsUserReady(true); // Set user ready state

          // Only fetch empresas if the session is new or the user ID has changed
          if (!initialSession || session.user.id !== initialSession.user.id) {
            fetchUserEmpresas(session.user.id);
          }
        } else {
          clearUser();
          setIsUserReady(false);
        }
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [setUser, clearUser, setEmpresas, initialSession]);

  return (
    <NavigationContainer>
      <SearchProvider>
        <ProductProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <Stack.Navigator
            initialRouteName={isUserReady && user ? 'HomeScreen' : 'LoginScreen'} // Use user from Zustand AND isUserReady
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="LoginScreen" component={LoginScreen} />
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="ProductScreen" component={ProductScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="CarritoScreen" component={CarritoScreen} />
            <Stack.Screen name="ProveedoresScreen" component={ProveedoresScreen} />
            <Stack.Screen name="ProveedorDetail" component={ProveedorDetailScreen} />
            <Stack.Screen name="RecetasScreen" component={RecetasScreen} />
            <Stack.Screen name="RecetasDetail" component={RecetasDetailScreen} />
            <Stack.Screen name="GestionScreen" component={GestionScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          </Stack.Navigator>
        </ProductProvider>
      </SearchProvider>
    </NavigationContainer>
  );
};

export default Sentry.wrap(App);