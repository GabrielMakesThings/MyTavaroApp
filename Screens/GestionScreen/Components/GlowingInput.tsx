// components/GlowingInput.tsx (or similar path)
import React, { useState, memo } from 'react';
import { TextInput, View, StyleSheet, KeyboardTypeOptions } from 'react-native';

interface GlowingInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  onFocus?: () => void;
  style?: object; // For additional styling
  glowColor?: string; // Custom glow color for specific cases (like low stock)
}

export const GlowingInput = memo(
  ({
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    multiline = false,
    onFocus,
    style,
    glowColor = '#94C8EF', // Default glow color
  }: GlowingInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const handleFocus = () => {
      setIsFocused(true);
      if (onFocus) onFocus();
    };
    const handleBlur = () => setIsFocused(false);

    return (
      <View
        style={[
          glowingInputStyles.inputContainer,
          isFocused ? { ...glowingInputStyles.focusedInputContainer, shadowColor: glowColor } : null,
          style, // Apply passed style
        ]}
      >
        <TextInput
          style={[glowingInputStyles.input, multiline ? glowingInputStyles.multilineInput : null]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#888"
          keyboardType={keyboardType}
          multiline={multiline}
        />
      </View>
    );
  },
);

const glowingInputStyles = StyleSheet.create({
  inputContainer: {
    borderWidth: 0.1,
    borderColor: '#C9D0D9',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    marginBottom: 5,
  },
  focusedInputContainer: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  input: {
    padding: 10,
    color: '#333',
    fontFamily: 'Georgia',
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});