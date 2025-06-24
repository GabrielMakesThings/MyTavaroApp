import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { useUserStore } from '../../utils/useUserStore';
import LinearGradient from 'react-native-linear-gradient';

// Importing existing assets/components
import AddIngredienteIcon from '../ProductScreen/Assets/Newproduct.svg';
import BarIcon from '../ProductScreen/Assets/Bar.svg';
import CocinaIcon from '../ProductScreen/Assets/Kitchen.svg';

// Custom components for this screen
import IngredienteFormModal, { IngredienteFormData } from './Components/IngredienteFormModal';
import IngredientPill from './Components/IngredientPill';
import AdminFinancialsDisplay from './Components/AdminFinancialsDisplay';

// --- Define Types ---
type RootStackParamList = {
  RecetasList: undefined;
  RecetaDetail: { recetaId: string; empresaId: string };
  HomeScreen: undefined;
};

type RecetaDetailRouteParams = {
  recetaId: string;
  empresaId: string;
};
type RecetaDetailRouteProp = RouteProp<RootStackParamList, 'RecetaDetail'>;

// Receta Type (should match your Supabase 'recetas' table structure)
export type Receta = {
  id: string;
  nombre: string;
  descripcion: string | null;
  empresa_id: string;
  activo: boolean;
  precio_total: number | null; // This is often the selling price
  margen_beneficio: number | null;
  actualizado_en: string | null;
  creado_en: string;
  categoria: string | null;
  cantidad_total: number | null;    // <-- ADDED: from your database
  unidad_de_medida: string | null;  // <-- ADDED: from your database
  costo_por_rendimiento: number | null; // <-- ADDED: from your database (renamed)
};

// Ingrediente Type (joined with product details)
export type Ingrediente = {
  id: string;
  receta_id: string;
  producto_id: string | null; // Products are now nullable because it could be a sub-recipe
  receta_ingrediente_id: string | null; // NEW: ID of the sub-recipe if this ingredient is a sub-recipe

  cantidad: number; // Amount used in the recipe (e.g., 0.06L of Rum, 1.0 ud of Sprite, 0.1L of Simple Syrup)
  unidad: string; // Unit used in the recipe (e.g., 'L', 'ud')

  // These come from the joined 'productos' table
  productos: {
    nombre: string;
    precio: number; // PRICE PER BASE UNIT OF PURCHASE (e.g., 15€ per Bottle of Rum)
    unidad: string; // BASE UNIT OF PURCHASE (e.g., 'Bottle', 'Kg', 'ud')
    cantidad_pedido: number; // How many base units in one ordered package (e.g., 6 bottles)
    cantidad_en_unidad: number | null; // Volume/Weight (L or Kg) contained in ONE `productos.unidad`
  } | null;

  // NEW: These come from the joined `recetas` table if this ingredient is a sub-recipe
  sub_recetas: {
    nombre: string;
    cantidad_total: number; // The total quantity the sub-recipe yields
    unidad_de_medida: string; // The unit of the sub-recipe's yield
    costo_por_rendimiento: number; // The calculated cost per unit of the sub-recipe's yield
  } | null;
};

// --- Unit Conversion Helper ---
const unitConversionFactors: { [key: string]: { [key: string]: number } } = {
  // Mass
  'kg': { 'gramos': 1000, 'kg': 1, 'g': 1000 },
  'gramos': { 'kg': 0.001, 'gramos': 1, 'g': 1 },
  'g': { 'kg': 0.001, 'gramos': 1, 'g': 1 },
  // Volume
  'l': { 'litros': 1, 'mililitros': 1000, 'ml': 1000, 'l': 1 },
  'litros': { 'mililitros': 1000, 'ml': 1000, 'litros': 1, 'l': 1 },
  'mililitros': { 'litros': 0.001, 'l': 0.001, 'ml': 1, 'mililitros': 1 },
  'ml': { 'litros': 0.001, 'l': 0.001, 'mililitros': 1, 'ml': 1 },
  // Discrete / Count Units - Make sure these map cleanly to a single standard
  'ud': { 'unidades': 1, 'ud': 1, 'unit': 1, 'piece': 1 },
  'unidades': { 'ud': 1, 'unidades': 1, 'unit': 1, 'piece': 1 },
  'unit': { 'ud': 1, 'unidades': 1, 'unit': 1, 'piece': 1 },
  'piece': { 'ud': 1, 'unidades': 1, 'unit': 1, 'piece': 1 },
  // Packaging units should map to generic discrete units
  'bottle': { 'ud': 1, 'unidades': 1, 'unit': 1, 'piece': 1, 'bottle': 1 },
  'box': { 'ud': 1, 'unidades': 1, 'unit': 1, 'piece': 1, 'box': 1 },
  'can': { 'ud': 1, 'unidades': 1, 'unit': 1, 'piece': 1, 'can': 1 },
};

// This function attempts to convert an amount from 'fromUnit' to 'toUnit'
const convertUnits = (amount: number, fromUnit: string, toUnit: string): number | null => {
  fromUnit = fromUnit.toLowerCase();
  toUnit = toUnit.toLowerCase();

  if (fromUnit === toUnit) return amount;

  if (unitConversionFactors[fromUnit] && unitConversionFactors[fromUnit][toUnit]) {
    return amount * unitConversionFactors[fromUnit][toUnit];
  }

  // If no direct conversion factor, log a warning and return null
  console.warn(`No conversion defined for '${fromUnit}' to '${toUnit}'.`);
  return null;
};

const RecetasDetailScreen = () => {
  const route = useRoute<RecetaDetailRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { recetaId, empresaId } = route.params;

  const [receta, setReceta] = useState<Receta | null>(null);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isIngredienteModalVisible, setIsIngredienteModalVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // State to check admin role

  const user = useUserStore((state) => state.user);
  const isAdminFadeAnim = useRef(new Animated.Value(0)).current; // For admin info fade-in

  // --- Icon Picker ---
  const getCategoryIcon = useCallback((categoria: string | null) => {
    switch (categoria) {
      case 'Cocina': return CocinaIcon;
      case 'Bar': return BarIcon;
      default: return CocinaIcon; // Default icon
    }
  }, []);

  // --- Data Fetching ---
  const fetchRecetaAndIngredients = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch Receta Details (including new yield/cost columns)
      const { data: recetaData, error: recetaError } = await supabase
        .from('recetas')
        .select(`
          *,
          cantidad_total,
          unidad_de_medida,
          costo_por_rendimiento
        `) // REMOVED JAVASCRIPT COMMENTS FROM INSIDE THE STRING LITERAL
        .eq('id', recetaId)
        .single();
      if (recetaError) throw recetaError;
      if (!recetaData) throw new Error('Receta no encontrada.');
      setReceta(recetaData as Receta); // Type casting needs the Receta type to be accurate

      // 2. Fetch Ingredients for this Receta, joining with products AND sub-recipes
      const { data: ingredientesData, error: ingredientesError } = await supabase
        .from('ingredientes_receta')
        .select(`
          id,
          receta_id,
          producto_id,
          receta_ingrediente_id,
          cantidad,
          unidad,
          productos (
            nombre,
            precio,
            unidad,
            cantidad_pedido,
            cantidad_en_unidad
          ),
          sub_recetas:recetas!ingredientes_receta_receta_ingrediente_id_fkey(
            nombre,
            cantidad_total,
            unidad_de_medida,
            costo_por_rendimiento
          )
        `) // REMOVED JAVASCRIPT COMMENTS FROM INSIDE THE STRING LITERAL
        .eq('receta_id', recetaId)
        .order('id', { ascending: true });

      if (ingredientesError) throw ingredientesError;

      // Map raw fetched data to our Ingrediente type
      setIngredientes(
        (ingredientesData || []).map((ing: any) => ({
            ...ing,
            // Ensure `productos` is a single object or null, handling potential array result
            productos: Array.isArray(ing.productos) ? (ing.productos[0] || null) : ing.productos ?? null,
            // `sub_recetas` join might also return an array if the FK is set differently
            // but typically should return a single object or null.
            sub_recetas: Array.isArray(ing.sub_recetas) ? (ing.sub_recetas[0] || null) : ing.sub_recetas ?? null,
        }))
      );

      // 3. Check Admin Role
      if (user?.id) {
        const { data: userRoleData, error: userRoleError } = await supabase
          .from('usuarios_empresas')
          .select('rol')
          .eq('usuario_id', user.id)
          .eq('empresa_id', empresaId) // Check role for the specific company
          .single();

        if (userRoleError && userRoleError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error fetching user role:", userRoleError.message);
          setIsAdmin(false);
        } else if (userRoleData && userRoleData.rol === 'Admin') {
          setIsAdmin(true);
          Animated.timing(isAdminFadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }).start();
        } else {
          setIsAdmin(false);
        }
      }

    } catch (e: any) {
      console.error('Error fetching receta details:', e.message);
      setFetchError(e.message || 'Error al cargar los detalles de la receta.');
      setReceta(null);
      setIngredientes([]);
    } finally {
      setLoading(false);
    }
  }, [recetaId, empresaId, user?.id, isAdminFadeAnim]);

  useEffect(() => {
    fetchRecetaAndIngredients();
  }, [fetchRecetaAndIngredients]);

  // --- Ingredient Cost Calculation Logic ---
  const calculateTotalCostOfIngredients = useCallback(() => {
    let totalCost = 0;
    ingredientes.forEach(ing => {
      // Debugging logs - uncomment to see detailed calculation steps
      // console.log(`--- Processing Ingredient: ${ing.productos?.nombre || ing.sub_recetas?.nombre || 'Unknown'} ---`);
      // console.log('Raw Ingredient Data:', ing);

      // Branch 1: It's a regular product ingredient
      if (ing.producto_id !== null && ing.productos !== null) {
        const product = ing.productos;
        const recipeAmount = ing.cantidad;
        const recipeUnit = ing.unidad.toLowerCase();

        const productPricePerBaseUnit = product.precio;
        const productBaseUnit = product.unidad.toLowerCase();
        const productConversionFactor = product.cantidad_en_unidad;

        let costPerStandardMeasurableUnit: number;
        let productStandardMeasurableUnitName: string;

        // Determine effective cost per product's measurable unit
        if (productConversionFactor !== null && productConversionFactor > 0) {
          // This path handles products with a specific volume/weight (e.g., Rum bottle -> Liters)
          costPerStandardMeasurableUnit = productPricePerBaseUnit / productConversionFactor;
          // Infer the standard unit (L or Kg) based on recipe unit or product base unit
          if (['l', 'litros', 'mililitros'].includes(recipeUnit) || ['l', 'litros', 'ml'].includes(productBaseUnit)) {
             productStandardMeasurableUnitName = 'l';
          } else if (['kg', 'gramos', 'g'].includes(recipeUnit) || ['kg', 'gramos', 'g'].includes(productBaseUnit)) {
             productStandardMeasurableUnitName = 'kg';
          } else {
             console.warn(`Product '${product.nombre}' has cantidad_en_unidad but ambiguous unit inference. Using 'l' as fallback.`);
             productStandardMeasurableUnitName = 'l'; // Default fallback, adjust if 'kg' is more common here
          }
        } else {
          // This path handles discrete units (e.g., Sprite 'ud') or products where price is straight per base unit
          costPerStandardMeasurableUnit = productPricePerBaseUnit;
          productStandardMeasurableUnitName = productBaseUnit;
        }

        // Convert the recipe's required amount to the product's standard measurable unit
        const convertedRecipeAmount = convertUnits(recipeAmount, recipeUnit, productStandardMeasurableUnitName);

        if (convertedRecipeAmount === null) {
          console.warn(`Skipping cost calc for product ${product.nombre}: cannot convert recipe unit '${recipeUnit}' to product's standard measurable unit '${productStandardMeasurableUnitName}'.`);
          return; // Skip this ingredient if conversion fails
        }
        totalCost += (convertedRecipeAmount * costPerStandardMeasurableUnit);
        // console.log(`  Added ${convertedRecipeAmount * costPerStandardMeasurableUnit} for ${product.nombre}`);
      }
      // Branch 2: It's a sub-recipe ingredient
      else if (ing.receta_ingrediente_id !== null && ing.sub_recetas !== null) {
        const subReceta = ing.sub_recetas;
        const recipeAmount = ing.cantidad; // Amount of the sub-recipe used in THIS parent recipe
        const recipeUnit = ing.unidad.toLowerCase(); // Unit of the sub-recipe amount used

        const costOfSubRecipeYieldUnit = subReceta.costo_por_rendimiento; // Cost per unit of the sub-recipe's output
        const subRecetaOutputUnit = subReceta.unidad_de_medida.toLowerCase(); // Unit of the sub-recipe's output

        if (costOfSubRecipeYieldUnit === null) {
             console.warn(`Sub-recipe '${subReceta.nombre}' does not have a calculated cost (costo_por_rendimiento is null). Skipping.`);
             return;
        }
        if (subRecetaOutputUnit === null) {
             console.warn(`Sub-recipe '${subReceta.nombre}' does not have a defined output unit (unidad_de_medida is null). Skipping.`);
             return;
        }

        // Convert the amount of sub-recipe used (recipeAmount, recipeUnit) to the sub-recipe's defined output unit (subRecetaOutputUnit)
        const convertedSubRecipeAmount = convertUnits(recipeAmount, recipeUnit, subRecetaOutputUnit);

        if (convertedSubRecipeAmount === null) {
          console.warn(`Skipping cost calc for sub-recipe ${subReceta.nombre}: cannot convert recipe unit '${recipeUnit}' to sub-recipe's output unit '${subRecetaOutputUnit}'.`);
          return; // Skip this ingredient if conversion fails
        }
        totalCost += (convertedSubRecipeAmount * costOfSubRecipeYieldUnit);
        // console.log(`  Added ${convertedSubRecipeAmount * costOfSubRecipeYieldUnit} for sub-recipe ${subReceta.nombre}`);
      }
      // Handle cases where the ingredient has ambiguous or missing association
      else {
        console.warn(`Ingredient ${ing.id} has an ambiguous or missing product/sub-recipe association. Skipping cost calculation for it.`);
      }
    });

    // console.log('Final Total Cost of Ingredients for this recipe:', totalCost);
    return totalCost;
  }, [ingredientes]);


  let costoTotalIngredientes = 0;
  if (isAdmin) {
    costoTotalIngredientes = calculateTotalCostOfIngredients();
   
  }

  // --- Add Ingredient ---
    const handleAddIngredientSubmit = useCallback(async (formData: IngredienteFormData) => {
    try {
      const { error } = await supabase.from('ingredientes_receta').insert([
        {
          receta_id: formData.receta_id,
          producto_id: formData.producto_id, // Will be UUID or undefined/null
          receta_ingrediente_id: formData.receta_ingrediente_id, // Will be UUID or undefined/null
          cantidad: parseFloat(formData.cantidad),
          unidad: formData.unidad,
        },
      ]);
      if (error) {
        throw error;
      }
      Alert.alert('Éxito', 'Ingrediente agregado correctamente.');
      fetchRecetaAndIngredients(); // Refresh the list of ingredients
      return Promise.resolve(); // Confirm success for modal
    } catch (e: any) {
      console.error('Error adding ingredient:', e);
      // Ensure the error message includes the Supabase error details
      Alert.alert('Error', e.message);
      return Promise.reject(e); // Propagate error for modal to handle
    }
  }, [fetchRecetaAndIngredients]);

  // --- Delete Ingredient ---
  const handleDeleteIngredient = useCallback(async (ingredienteId: string) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Está seguro de que desea eliminar este ingrediente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('ingredientes_receta')
                .delete()
                .eq('id', ingredienteId);
              if (error) throw error;
              Alert.alert('Éxito', 'Ingrediente eliminado.');
              fetchRecetaAndIngredients(); // Refresh the list
            } catch (e: any) {
              Alert.alert('Error', `No se pudo eliminar el ingrediente: ${e.message}`);
            }
          },
        },
      ],
    );
  }, [fetchRecetaAndIngredients]);

  // --- Delete Recipe ---
  const handleDeleteRecipe = useCallback(async () => {
    if (!receta) return;
    Alert.alert(
      "Confirmar Eliminación",
      `¿Está seguro de que desea eliminar "${receta.nombre}" y todos sus ingredientes? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete child ingredients first
              const { error: deleteIngError } = await supabase
                .from('ingredientes_receta')
                .delete()
                .eq('receta_id', receta.id);
              if (deleteIngError) throw deleteIngError;

              // Then delete the recipe itself
              const { error: deleteRecetaError } = await supabase
                .from('recetas')
                .delete()
                .eq('id', receta.id);
              if (deleteRecetaError) throw deleteRecetaError;

              Alert.alert('Éxito', 'Receta y sus ingredientes eliminados correctamente.');
              navigation.goBack(); // Go back to the recipe list
            } catch (e: any) {
              Alert.alert('Error', `No se pudo eliminar la receta: ${e.message}`);
            }
          },
        },
      ],
    );
  }, [receta, navigation]);

  // --- Render Logic ---
  if (loading) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
        <ActivityIndicator size="large" color="#F4E3D7" />
        <Text style={styles.loadingText}>Cargando receta...</Text>
      </LinearGradient>
    );
  }

  if (fetchError) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
        <Text style={styles.errorText}>{fetchError}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Volver</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  if (!receta) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
        <Text style={styles.errorText}>Receta no disponible.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Volver</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.container}>
        {/* --- HOME BUTTON START --- */}
        <Pressable
          onPress={() => navigation.navigate('HomeScreen')} // Navigate to your home screen (e.g., RecetasList)
          style={styles.homeButton}
          accessibilityLabel="Go to Home"
        >
          <Text style={styles.homeButtonText}>Home</Text>
        </Pressable>
        {/* --- HOME BUTTON END --- */}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Recipe Name - Main Header */}
          <View style={styles.titleContainer}>
            <Text style={styles.recipeTitle}>{receta.nombre}</Text>
            {/* Category Icon */}
            {React.createElement(getCategoryIcon(receta.categoria), { width: 50, height: 50, fill: '#83D2E5' })}
          </View>

          {/* Description Block */}
          {receta.descripcion && (
            <View style={styles.dataBlock}>
              <Text style={styles.dataLabel}>Descripción:</Text>
              <Text style={styles.dataValue}>{receta.descripcion}</Text>
            </View>
          )}

          {/* Admin Financials Display */}
          {isAdmin && (
            <AdminFinancialsDisplay
              isAdminFadeAnim={isAdminFadeAnim}
              totalCost={costoTotalIngredientes}
              profitMargin={receta.margen_beneficio}
              sellingPrice={receta.precio_total} // Assuming precio_total from DB is selling price
            />
          )}

          {/* Recipe Yield Information (NEW) */}
          {receta.cantidad_total !== null && receta.unidad_de_medida && (
            <View style={styles.dataBlock}>
              <Text style={styles.dataLabel}>Rendimiento de la Receta:</Text>
              <Text style={styles.dataValue}>{receta.cantidad_total} {receta.unidad_de_medida}</Text>
              {receta.costo_por_rendimiento !== null && (
                <Text style={styles.dataValue}>Costo por Unidad: {receta.costo_por_rendimiento.toFixed(2)}€/{receta.unidad_de_medida}</Text>
              )}
            </View>
          )}


          {/* Ingredients Section */}
          <View style={styles.ingredientsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingredientes</Text>
              <Pressable style={styles.addButton} onPress={() => setIsIngredienteModalVisible(true)}>
                {/* Plus icon instead of text */}
                {React.createElement(AddIngredienteIcon, { width: 24, height: 24, fill: '#F4E3D7' })}
              </Pressable>
            </View>

            {ingredientes.length === 0 ? (
              <Text style={styles.emptyListText}>No hay ingredientes en esta receta.</Text>
            ) : (
              <View style={styles.ingredientsGrid}>
                {ingredientes.map((ing) => (
                  // IngredientPill component will need to be updated to display sub-recipe names/units as well
                  <IngredientPill key={ing.id} ingredient={ing} onDelete={handleDeleteIngredient} />
                ))}
              </View>
            )}
          </View>

          {/* Delete Recipe Button */}
          <View style={styles.actionsContainer}>
            <Pressable style={[styles.button, styles.deleteButton]} onPress={handleDeleteRecipe}>
              <Text style={styles.buttonText}>Eliminar Receta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Ingrediente Form Modal */}
      {/* This modal needs significant updates to allow selecting products or sub-recipes */}
      <IngredienteFormModal
        visible={isIngredienteModalVisible}
        onClose={() => setIsIngredienteModalVisible(false)}
        onSubmit={handleAddIngredientSubmit}
        recetaId={recetaId}
        empresaId={empresaId} // Pass empresaId to filter products
      />
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    marginTop: 70, // This pushes the title down
    // Add text shadow or other effects for "projected" feel
    textShadowColor: '#83D2E5',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  recipeTitle: {
    fontSize: 38,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#F4E3D7',
    marginRight: 10,
    textAlign: 'center',
  },
  dataBlock: {
    backgroundColor: 'rgba(148, 200, 239, 0.1)', // Lightly transparent for "glass" effect
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(148, 200, 239, 0.3)',
    shadowColor: '#83D2E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  dataLabel: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#D4C2B3',
    fontWeight: '600',
    marginBottom: 5,
  },
  dataValue: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#F4E3D7',
  },
  ingredientsSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 227, 215, 0.3)',
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Georgia',
    fontWeight: '600',
    color: '#E0CDBB',
  },
  addButton: {
    backgroundColor: 'rgba(131, 210, 229, 0.5)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#83D2E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly', // Distribute items evenly
    textAlign: 'left',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#F4E3D7',
  },
  actionsContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 150,
    shadowColor: '#94C8EF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    fontFamily: 'Georgia',
    color: '#F4E3D7',
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Georgia',
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  homeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20, // Adjust for iOS status bar/notch vs. Android
    left: 20,
    zIndex: 10, // Ensures the button is on top of other content
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(131, 210, 229, 0.2)', // Semi-transparent based on existing styles
    shadowColor: '#83D2E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
    borderColor: 'rgba(131, 210, 229, 0.4)',
    borderWidth: 1,
  },
  homeButtonText: {
    color: '#F4E3D7',
    fontSize: 16,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
  },
});

export default RecetasDetailScreen;