import React, { useEffect, useRef, memo } from 'react';
import { View, Animated, StyleSheet, Easing, Dimensions } from 'react-native';

interface BubbleProps {
  size: number;
  color: string;
  speed: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Bubble: React.FC<BubbleProps> = memo(({ size, color, speed }) => {
  const position = useRef(new Animated.Value(Math.random() * screenWidth)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.4,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(position, {
          toValue: Math.random() * screenWidth,
          duration: speed,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, [position, opacity, speed]);

  const bottom = useRef(new Animated.Value(-size)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(bottom, {
        toValue: screenHeight + size,
        duration: speed * 5,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [bottom, speed]);

  const translateX = position;
  const translateY = bottom;

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: opacity,
          transform: [{ translateX }, { translateY }], // Utiliza translateX y translateY
        },
      ]}
    />
  );
});

interface BubblesBackgroundProps {
  bubbleCount?: number; // Prop opcional para controlar la cantidad de burbujas
}

const BubblesBackground: React.FC<BubblesBackgroundProps> = ({ bubbleCount = 20 }) => {
  const bubbles = Array.from({ length: bubbleCount }, (_, i) => ({
    id: i,
    size: Math.random() * 100 + 10,
    color: 'rgba(255, 255, 255, 0.2)', // Blanco con transparencia
    speed: Math.random() * 6000 + 6000, // Velocidad aleatoria
  }));

  return (
    <View style={styles.container}>
      {bubbles.map(bubble => (
        <Bubble key={bubble.id} size={bubble.size} color={bubble.color} speed={bubble.speed} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden', // Para evitar que las burbujas se salgan del contenedor
  },
  bubble: {
    position: 'absolute',
   top: 0,
    left: 0,
    borderRadius: 20,
  },
});

export default BubblesBackground;