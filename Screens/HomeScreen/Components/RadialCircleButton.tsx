import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Defs, RadialGradient, Circle, Stop, SvgProps } from "react-native-svg";

// Define los tipos para las props
interface RadialCircleButtonProps {
  title: string;
  icon?: React.ComponentType<SvgProps>; // Icono opcional
  onPress?: () => void; // Agregar onPress prop
}

const RadialCircleButton: React.FC<RadialCircleButtonProps> = ({ title, icon: Icon, onPress }) => {
  return (
    <TouchableOpacity style={styles.buttonContainer} onPress={onPress}>
      {/* Fondo del botón con gradiente radial */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <RadialGradient
            id="radialGrad"
            cx="50%" // Centro en X
            cy="10%" // Centro en Y
            r="75%"  // Radio del gradiente
            fx="80%" // Foco en X
            fy="5%"  // Foco en Y
          >
            <Stop offset="0%" stopColor="#01336C" stopOpacity="1" />
            <Stop offset="100%" stopColor="#00234B" stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Circle
          cx="50%"
          cy="50%"
          r="50%" // Radio del círculo
          fill="url(#radialGrad)"
        />
      </Svg>

      {/* Contenido del botón */}
      <View style={styles.content}>
        {Icon && <Icon width={43} height={43} style={styles.icon} />}
        <Text style={styles.buttonText}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: 70,
    height: 70,
    borderRadius: 90, // Hace que sea un círculo
    overflow: "hidden", // Asegura que el gradiente respete la forma circular
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    margin: 20,
    borderWidth: 0.5,
    borderColor: '#FFA500',
  },
  content: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    alignItems: "center",
    top: 8,
    left: 1,
  },
  buttonText: {
    color: "transparent",
    fontSize: 8,
    fontWeight: "normal",
    textAlign: "center",
  },
});

export default RadialCircleButton;
