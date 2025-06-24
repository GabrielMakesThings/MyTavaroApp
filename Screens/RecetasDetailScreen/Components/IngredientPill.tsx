// Components/IngredientPill.tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
// Adjust path as needed, assuming this is where Ingrediente type is defined
import { Ingrediente } from '../RecetasDetailScreen'; 

interface IngredientPillProps {
  ingredient: Ingrediente;
  onDelete: (ingredienteId: string) => void;
}

const IngredientPill = memo(({ ingredient, onDelete }: IngredientPillProps) => {
  let displayName: string;
  let displayQuantity: number | string; // Quantity can be float, so string is safer for display
  let displayUnit: string;

  // Determine display name, quantity, and unit based on whether it's a product or a sub-recipe
  if (ingredient.producto_id && ingredient.productos) {
    // This is a product ingredient
    displayName = ingredient.productos.nombre;
  } else if (ingredient.receta_ingrediente_id && ingredient.sub_recetas) {
    // This is a sub-recipe ingredient
    displayName = ingredient.sub_recetas.nombre;
  } else {
    // Fallback for an unexpected or malformed ingredient
    displayName = 'Ingrediente Desconocido'; // More descriptive fallback
    console.warn('IngredientPill received unexpected ingredient data:', ingredient);
  }

  // Common quantity and unit display, as this applies to both types of ingredients
  displayQuantity = ingredient.cantidad;
  displayUnit = ingredient.unidad;


  return (
    <View style={ingredientPillStyles.card}>
      <Text style={ingredientPillStyles.productName} numberOfLines={2}>
        {displayName} {/* Use the determined display name */}
      </Text>
      <View style={ingredientPillStyles.detailsContainer}>
        {/* Display quantity and unit */}
        <Text style={ingredientPillStyles.quantityUnitText}>
          {`${displayQuantity} ${displayUnit}`} {/* Use the determined quantity and unit */}
        </Text>
      </View>
      <Pressable style={ingredientPillStyles.deleteButton} onPress={() => onDelete(ingredient.id)}>
        <Text style={ingredientPillStyles.deleteButtonText}>✕</Text>
      </Pressable>
    </View>
  );
});

const ingredientPillStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle white background
    borderRadius: 15,
    padding: 10,
    margin: 6, // Space between pills
    width: Dimensions.get('window').width / 3 - 20, // Approx 3 pills per row on small screens
    // Adjusted minHeight for content flexibility
    minHeight: 100, // Increased to provide more consistent space
    justifyContent: 'space-between', // Distribute content vertically
    alignItems: 'center', // Center content horizontally
    borderWidth: 1,
    borderColor: 'rgba(148, 200, 239, 0.3)', // Soft border
    shadowColor: '#83D2E5', // Gentle glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#F4E3D7',
    textAlign: 'center', // Center text
    flexGrow: 1, // Allow text to take available space
    marginBottom: 5, // Space below name to quantity/unit
  },
  detailsContainer: {
    alignItems: 'center', // Center horizontally
    // Removed marginBottom as productName handles spacing
  },
  quantityUnitText: {
    fontSize: 12,
    fontFamily: 'Georgia',
    // Removed marginTop as productName handles spacing
    color: '#D4C2B3',
    textAlign: 'center',
  },
  deleteButton: {
    position: 'absolute', // Position X button
    top: 5,
    right: 5,
    backgroundColor: 'rgba(112, 70, 65, 0.7)', // Red background for delete
    borderRadius: 10,
    width: 20, // Increased size for easier tap
    height: 20, // Increased size for easier tap
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14, // Increased size for readability
    fontWeight: 'bold',
  },
});

export default IngredientPill;