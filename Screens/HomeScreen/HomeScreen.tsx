import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Image, FlatList, TouchableOpacity, Modal, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Clock from './Components/Clock.tsx';
import { supabase } from '../../utils/supabase'; // ajusta ruta si hace falta
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import RadialCircleButton from './Components/RadialCircleButton';
import ProductosIcon from './Assets/Productos.svg';
import ProveedoresIcon from './Assets/Proveedores.svg';
import RecetasIcon from './Assets/Recetas.svg';
import TavLabIcon from './Assets/TavLab.svg';
import GestionIcon from './Assets/Gestion.svg';
import CarritoIcon from './Assets/Carrito.svg';
import BubblesBackground from './Components/BubblesBackground'; // Importa el componente BubblesBackground
import { useUserStore } from '../../utils/useUserStore';


const BUTTONS = [
  { id: '1', title: 'Productos', icon: ProductosIcon },
  { id: '2', title: 'Proveedores', icon: ProveedoresIcon },
  { id: '3', title: 'Recetas', icon: RecetasIcon },
  { id: '4', title: 'TavLab', icon: TavLabIcon },
  { id: '5', title: 'Gestión', icon: GestionIcon },
  { id: '6', title: 'Carrito', icon: CarritoIcon },
];

type RootStackParamList = {
  LoginScreen: undefined;
  HomeScreen: undefined;
  ProductScreen: undefined;
  CarritoScreen: undefined;
  ProveedoresScreen: undefined;
  RecetasScreen: undefined;
  GestionScreen: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const user = useUserStore((state) => state.user);
  const empresas = useUserStore((state) => state.empresas);
  const clearUser = useUserStore((state) => state.clearUser);
  const setEmpresas = useUserStore((state) => state.setEmpresas);

  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleLogout = async () => {
    try {
      console.log('Logout en proceso en HomeScreen');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear user and empresas data from Zustand on logout
      clearUser();
      setEmpresas(null); // set to null instead of []

      navigation.replace('LoginScreen');
    } catch (error) {
      console.error('Error al cerrar sesión en HomeScreen:', error);
    }
  };

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  const handleProfile = () => {
    // Aquí iría la lógica para navegar al perfil (cuando esté creado)
    console.log("Navegando al perfil (no implementado)");
  };

  return (
    <LinearGradient
      colors={['#00336C', '#00234B', '#001124']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.bubblesBackground}>
        <BubblesBackground />
      </View>
      <View style={styles.container}>
        {/* Logo */}
        <TouchableOpacity onPress={toggleModal}>
          <Image source={require('./Assets/Logo2.png')} style={styles.logo2} />
        </TouchableOpacity>
        <Text style={styles.greeting}>¡Buenos Días!</Text>
      </View>

      {/* Modal */}
      <Modal
        animationType="fade" // Cambiado a 'fade'
        transparent={true}
        visible={isModalVisible}
        onRequestClose={toggleModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={toggleModal} // Cierra el modal al tocar fuera
          >
            <Animated.View style={[
              styles.modalContent,
              {
                transform: [
                  {
                    translateX: isModalVisible ? 0 : -250, // Desliza desde la izquierda
                  },
                ],
              },
            ]}>
              <Button title="Perfil" color='rgba(255, 155, 0, 0.8)' onPress={handleProfile} />
              <Button title="Cerrar Sesión" color='rgba(255, 155, 0, 0.8)' onPress={handleLogout}/>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Botones circulares con gradiente */}
      <FlatList
        data={BUTTONS}
        keyExtractor={(item) => item.id}
        numColumns={3} // Coloca los botones en 3 columnas
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Clock style={styles.clockContainer} />
          </View> // Cierra el View del header
        }
        renderItem={({ item }) => (
          <View style={styles.buttonWrapper}>
            <TouchableOpacity onPress={() => {
              if (item.title === 'Productos') {
                navigation.navigate('ProductScreen');  // Navigate to ProductScreen
              }
              else if (item.title === 'Proveedores') {
                navigation.navigate('ProveedoresScreen'); // Navigate to ProveedoresScreen
              }
              else if (item.title === 'Recetas') {
                navigation.navigate('RecetasScreen'); // Navigate to RecetasScreen
              }
              else if (item.title === 'TavLab') {
                navigation.navigate('ProductScreen'); // Navigate to TavLabScreen
              }
              else if (item.title === 'Gestión') {
                navigation.navigate('GestionScreen'); // Navigate to GestionScreen
              }
              else if (item.title === 'Carrito') {
                navigation.navigate('CarritoScreen'); // Navigate to CarritoScreen
              }
            }}>
              <RadialCircleButton
                title={item.title}
                icon={item.icon}
                onPress={() => {
                  // Navigate to the corresponding screen when the button is pressed
                  if (item.title === 'Productos') {
                    navigation.navigate('ProductScreen');
                  }
                  else if (item.title === 'Proveedores') {
                    navigation.navigate('ProveedoresScreen');
                  }
                  else if (item.title === 'Recetas') {
                    navigation.navigate('RecetasScreen');
                  }
                  else if (item.title === 'TavLab') {
                    navigation.navigate('ProductScreen');
                  }
                  else if (item.title === 'Gestión') {
                    navigation.navigate('GestionScreen');
                  }
                  else if (item.title === 'Carrito') {
                    navigation.navigate('CarritoScreen');
                  }
                  // Add other conditions for different buttons if needed
                }}
              />
            </TouchableOpacity>
            <Text style={styles.buttonText}>{item.title}</Text>
          </View>
        )}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1, // Cubre toda la pantalla
  },
  bubblesBackground: {
    position: 'absolute',
    top: 0, // Cambio clave: posiciona en la parte superior
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 2, // Espacio superior
  },
  logo2: {
    width: 100,
    height: 20,
    position: 'absolute', // Posiciona el logo de forma absoluta
    top: 55, // Espacio desde la parte superior
    right: 80, // Lo coloca a la izquierda
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 80, // Ajusta la posición del ListHeaderComponent
    marginBottom: 50, // Espacio en la parte superior para asegurar que el contenido no esté encima
  },
  greeting: {
    position: 'absolute',
    marginTop: 150,
    alignItems: 'center',
    fontFamily: 'Georgia',
    fontSize: 48,
    fontWeight: 'normal',
    color: '#F4E3D7',
  },
  clockContainer: {
    position: 'absolute', // Posiciona el reloj de forma absoluta
    top: 150, // Ajusta la posición vertical
    left: 0,
    right: 0,
    alignItems: 'center',
    marginBottom: 10, // Espacio debajo del reloj
  },
  buttonWrapper: {
    alignItems: 'center',
    flexDirection: 'column',
    margin: 5,
    paddingBottom: 0.3,
    marginRight: 15,
    shadowColor: "#94C8EF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 17,
    elevation: 500,
  },
  icon: {
    justifyContent: 'center', // Asegura que el contenido esté centrado
    flexDirection: 'column', // Coloca el ícono y el texto en columna
  },
  buttonText: {
    color: "#F4E3D6",
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  logoutContainer: {
    position: 'absolute', // Posiciona el contenedor de logout de forma absoluta
    top: 45, // Espacio desde la parte superior
    right: 15, // Lo coloca a la izquierda
    zIndex: 1, // Asegura que esté por encima de otros elementos si es necesario
  },

  // Estilos para el modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start', // Alinea el contenido en la parte superior
    alignItems: 'flex-start', // Alinea el contenido a la izquierda
    backgroundColor: 'rgba(0, 0, 0, 0)', // Fondo semitransparente
  },
  modalBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'flex-start', // Alinea el contenido a la izquierda
  },
  modalContent: {
    width: 250, // Ancho del modal
    height: '100%', // Cubre toda la altura
    backgroundColor: 'rgba(0, 35, 75, 0.4)',
    padding: 50,
    borderRightWidth: 2, // Cambiado a borderRightWidth
    borderRightColor: '#8affff', // Cambiado a borderRightColor
  },
});

export default HomeScreen;