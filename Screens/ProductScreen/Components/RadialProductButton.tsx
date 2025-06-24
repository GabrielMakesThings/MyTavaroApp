import React, {ComponentType} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Rect,
  Stop,
  SvgProps,
} from 'react-native-svg';

interface RadialSquareButtonProps {
  title: string;
  icon?: ComponentType<SvgProps> | null; // Ahora es opcional y permite null
  onPress?: () => void; // Click handler
  isAddProductButton?: boolean;
  style?: ViewStyle; // Agrega el prop style
}

const RadialProductButton: React.FC<RadialSquareButtonProps> = ({
  title,
  icon: Icon,
  onPress,
  style, // Recibe el prop style
  isAddProductButton = false,
}) => {
  // Debugging logs
  console.log('Title:', title);
  console.log('Icon:', Icon);
  console.log('isAddProductButton:', isAddProductButton);

  return (
    <TouchableOpacity
      style={[
        styles.buttonContainer,
        isAddProductButton ? styles.addProductButton : null,
        style, // Aplica los estilos recibidos
      ]}
      onPress={onPress}>
      {/* Fondo con gradiente radial */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <RadialGradient
            id="radialGrad"
            cx="50%" // Centro X
            cy="-5%" // Centro Y (Más alto para el efecto de luz superior)
            r="80%" // Radio del gradiente
          >
            <Stop offset="-10%" stopColor="#325781" stopOpacity="1" />
            <Stop offset="70%" stopColor="#00234B" stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="15" // Bordes redondeados
          ry="15" // Bordes redondeados
          fill="url(#radialGrad)"
        />
      </Svg>

      {/* Contenido del botón */}
      <View style={styles.content}>
        {/* Renderizado condicional con ternario */}
        {Icon ? (
          <Icon
            width={isAddProductButton ? 60 : 30}
            height={isAddProductButton ? 60 : 30}
            style={styles.icon}
          />
        ) : (
          <View style={styles.emptyIcon} /> // Fallback for missing icon
        )}

        <Text style={styles.buttonText}>{title || 'Default Title'}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: 65,
    height: 76,
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    margin: 20,
    borderWidth: 0.8,
    borderColor: '#FFA500',
    
  },
  addProductButton: {
    width: 95, // Solo para el botón de añadir producto
    height: 106, // Solo para el botón de añadir producto
  },
  content: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    alignItems: 'center',
    left: 1,
    width: 20,
    height: 20,
  },
  buttonText: {
    fontFamily: 'Verdana',
    color: 'white',
    fontSize: 10,
    fontWeight: 'normal',
    textAlign: 'center',
    top: 5,
  },
  emptyIcon: {
    // Agrega estilos para el View vacío
    width: 30,
    height: 30,
  },
});

export default RadialProductButton;