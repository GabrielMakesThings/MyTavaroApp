import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

const MyAppText: React.FC<TextProps> = ({ style, ...props }) => {
  return <Text style={[styles.defaultText, style]} {...props} />;
};

const styles = StyleSheet.create({
  defaultText: {
    backgroundColor: 'transparent',
    fontFamily: 'Georgia', // Cambia por tu fuente
  },
});
export default MyAppText;
