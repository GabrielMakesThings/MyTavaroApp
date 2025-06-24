import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  KeyboardTypeOptions,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { supabase } from '../../../utils/supabase'; // Corrected path assumed

// --- TYPINGS ---
// Data structures for fetching products and sub-recipes
interface SelectableProduct {
  id: string;
  nombre: string;
  unidad: string; // Base unit of the product (e.g., 'gramo', 'litro', 'unidad')
  cantidad_en_unidad: number | null; // e.g., 0.7 for 700ml bottle. Used to infer unit type.
}

interface SelectableSubReceta {
  id: string;
  nombre: string;
  unidad_de_medida: string; // Output unit of the sub-recipe (e.g., 'L', 'Kg', 'ud')
  cantidad_total: number; // Total quantity of the sub-recipe's output
  costo_por_rendimiento: number | null; // Cost per unit of the sub-recipe's output (can be null initially)
}

// Data sent to onSubmit callback
export interface IngredienteFormData {
  receta_id: string; // The ID of the parent recipe this ingredient is being added to
  producto_id?: string | null;// Optional: ID if adding a product
  receta_ingrediente_id?: string; // Optional: ID if adding a sub-recipe
  cantidad: string; // Still a string from input
  unidad: string; // This unit will now be automatically set
}

// Props for the modal component itself
interface IngredienteFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (formData: IngredienteFormData) => Promise<void>;
  recetaId: string; // ID of the recipe being modified
  empresaId: string; // Used to filter products/recipes by company
}

// --- REUSABLE COMPONENTS FOR FORM STEPS ---

// GlowingInput (from previous versions, ensuring it accepts onFocus)
type GlowingInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  onFocus?: () => void;
};

const GlowingInput = memo(
  ({
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    multiline = false,
    onFocus,
  }: GlowingInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const handleFocus = () => {
      setIsFocused(true);
      if (onFocus) onFocus();
    };
    const handleBlur = () => setIsFocused(false);

    return (
      <View style={[modalStyles.inputContainer, isFocused ? modalStyles.focusedInputContainer : null]}>
        <TextInput
          style={[modalStyles.input, multiline ? modalStyles.multilineInput : null]}
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

// Form Step 1: Combined Type Selection and Item Search/Selection
interface FormStepItemAndTypeSelectionProps {
  selectedItemType: 'product' | 'recipe';
  setSelectedItemType: (type: 'product' | 'recipe') => void;
  
  selectedProductId: string | undefined;
  setSelectedProductId: (id: string | undefined) => void;
  nombreProductoInput: string;
  setNombreProductoInput: (text: string) => void;
  allProducts: SelectableProduct[];
  loadingProducts: boolean;

  selectedSubRecetaId: string | undefined;
  setSelectedSubRecetaId: (id: string | undefined) => void;
  nombreSubRecetaInput: string;
  setNombreSubRecetaInput: (text: string) => void;
  allSubRecetas: SelectableSubReceta[];
  loadingSubRecetas: boolean;

  onItemSelected: (item: SelectableProduct | SelectableSubReceta) => void;
}

const FormStepItemAndTypeSelection = memo(
  ({
    selectedItemType,
    setSelectedItemType,
    selectedProductId, setSelectedProductId,
    nombreProductoInput, setNombreProductoInput,
    allProducts, loadingProducts,
    selectedSubRecetaId, setSelectedSubRecetaId,
    nombreSubRecetaInput, setNombreSubRecetaInput,
    allSubRecetas, loadingSubRecetas,
    onItemSelected,
  }: FormStepItemAndTypeSelectionProps) => {
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Dynamic data based on selectedItemType
    const currentSelectedId = selectedItemType === 'product' ? selectedProductId : selectedSubRecetaId;
    const currentItemNameInput = selectedItemType === 'product' ? nombreProductoInput : nombreSubRecetaInput;
    const currentSetItemNameInput = selectedItemType === 'product' ? setNombreProductoInput : setNombreSubRecetaInput;
    const currentSetSelectedItemId = selectedItemType === 'product' ? setSelectedProductId : setSelectedSubRecetaId;
    const currentAllItems = selectedItemType === 'product' ? allProducts : allSubRecetas;
    const currentLoadingItems = selectedItemType === 'product' ? loadingProducts : loadingSubRecetas;

    const filteredItems = currentAllItems.filter((item) =>
      item.nombre.toLowerCase().includes(currentItemNameInput.toLowerCase())
    );

    const handleSelectItem = useCallback((item: SelectableProduct | SelectableSubReceta) => {
      currentSetItemNameInput(item.nombre);
      currentSetSelectedItemId(item.id);
      onItemSelected(item); // Callback to parent to update state and suggest unit
      setShowSuggestions(false);
    }, [currentSetItemNameInput, currentSetSelectedItemId, onItemSelected]);

    useEffect(() => {
      const selectedItem = currentAllItems.find(item => item.id === currentSelectedId);

      // If an item is selected and its name in the input is incorrect (e.g., initial load or user typed then deleted and re-selected)
      if (currentSelectedId && selectedItem && currentItemNameInput !== selectedItem.nombre) {
        currentSetItemNameInput(selectedItem.nombre);
        setShowSuggestions(false); // Hide suggestions once selection is made
      }
    }, [currentSelectedId, currentAllItems, currentItemNameInput, currentSetItemNameInput]);


    const handleTypeChange = useCallback((type: 'product' | 'recipe') => {
        if (selectedItemType !== type) {
            setSelectedItemType(type);
            // Clear selections when switching type
            if (type === 'product') {
                setSelectedSubRecetaId(undefined);
                setNombreSubRecetaInput('');
            } else { // type === 'recipe'
                setSelectedProductId(undefined);
                setNombreProductoInput('');
            }
        }
    }, [selectedItemType, setSelectedItemType, setSelectedProductId, setNombreProductoInput, setSelectedSubRecetaId, setNombreSubRecetaInput]);


    return (
      <View style={modalStyles.formStepContainer}>
        <Text style={modalStyles.label}>¿Qué tipo de ingrediente desea agregar?</Text>
        <View style={modalStyles.typeSelector}>
          <Pressable
            style={[modalStyles.typeButton, selectedItemType === 'product' && modalStyles.typeButtonSelected]}
            onPress={() => handleTypeChange('product')}
          >
            <Text style={[modalStyles.typeButtonText, selectedItemType === 'product' && modalStyles.typeButtonTextSelected]}>Producto</Text>
          </Pressable>
          <Pressable
            style={[modalStyles.typeButton, selectedItemType === 'recipe' && modalStyles.typeButtonSelected]}
            onPress={() => handleTypeChange('recipe')}
          >
            <Text style={[modalStyles.typeButtonText, selectedItemType === 'recipe' && modalStyles.typeButtonTextSelected]}>Sub-Receta</Text>
          </Pressable>
        </View>

        <Text style={modalStyles.label}>{`Seleccionar ${selectedItemType === 'product' ? 'Producto' : 'Sub-Receta'}`}</Text>
        {currentLoadingItems ? (
          <ActivityIndicator size="large" color="#FFF1D8" />
        ) : currentAllItems.length === 0 ? (
          <Text style={modalStyles.disabledText}>
            {`No hay ${selectedItemType === 'product' ? 'productos' : 'sub-recetas'} disponibles para agregar.`}
          </Text>
        ) : (
          <>
            <GlowingInput
              value={currentItemNameInput}
              onChangeText={(text) => {
                currentSetItemNameInput(text);
                // Clear active ID if input text differs from current selection's name
                if (currentSelectedId && currentAllItems.find(item => item.id === currentSelectedId)?.nombre !== text) {
                  currentSetSelectedItemId(undefined); // Unselect if text no longer matches
                }
                setShowSuggestions(true); // Always show suggestions when typing
              }}
              placeholder={`Escribe el nombre de la ${selectedItemType === 'product' ? 'producto' : 'sub-receta'}...`}
              onFocus={() => setShowSuggestions(true)}
            />

            {(showSuggestions && currentItemNameInput.length > 0 && filteredItems.length > 0) ? (
              <ScrollView style={modalStyles.suggestionsContainer} keyboardShouldPersistTaps="always">
                {filteredItems.map((item) => (
                  <Pressable
                    key={item.id}
                    style={modalStyles.suggestionItem}
                    onPress={() => handleSelectItem(item)}
                  >
                    <Text style={modalStyles.suggestionText}>
                      {item.nombre} ({('unidad' in item && item.unidad) || ('unidad_de_medida' in item && item.unidad_de_medida) || ''})
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
            ) : null}
            
            {(currentItemNameInput.length > 0 && filteredItems.length === 0 && !currentSelectedId) ? (
                <Text style={modalStyles.warningText}>No se encontraron {selectedItemType === 'product' ? 'productos' : 'sub-recetas'} coincidentes.</Text>
            ) : null}
          </>
        )}
      </View>
    );
  },
);

// Form Step 2: Quantity
interface FormStepCantidadProps {
  cantidad: string;
  setCantidad: (text: string) => void;
  inferredUnit: string; // Display the inferred unit for user context
}
const FormStepCantidad = memo(({ cantidad, setCantidad, inferredUnit }: FormStepCantidadProps) => (
  <View style={modalStyles.formStepContainer}>
    <Text style={modalStyles.label}>Cantidad</Text>
    <GlowingInput
      value={cantidad}
      onChangeText={setCantidad}
      placeholder={`Cantidad en ${inferredUnit || 'unidad'}`}
      keyboardType="numeric"
    />
    {inferredUnit ? (
      <Text style={modalStyles.inferredUnitText}>Unidad: {inferredUnit}</Text>
    ) : null}
  </View>
));

// FormStepUnidad is REMOVED from here

// --- MAIN MODAL COMPONENT ---
const IngredienteFormModal: React.FC<IngredienteFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  recetaId,
  empresaId,
}) => {
  const [formIndex, setFormIndex] = useState(0);

  const [selectedItemType, setSelectedItemType] = useState<'product' | 'recipe'>('product');

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [allProducts, setAllProducts] = useState<SelectableProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [nombreProductoInput, setNombreProductoInput] = useState('');

  const [loadingSubRecetas, setLoadingSubRecetas] = useState(true);
  const [allSubRecetas, setAllSubRecetas] = useState<SelectableSubReceta[]>([]);
  const [selectedSubRecetaId, setSelectedSubRecetaId] = useState<string | undefined>(undefined);
  const [nombreSubRecetaInput, setNombreSubRecetaInput] = useState('');

  const [cantidad, setCantidad] = useState('');
  const [inferredUnit, setInferredUnit] = useState(''); // Changed from `unidad` to `inferredUnit` for clarity

  const selectedItemDetailsRef = useRef<SelectableProduct | SelectableSubReceta | null>(null);

  useEffect(() => {
    if (!visible) {
      setFormIndex(0);
      setSelectedItemType('product');
      
      setLoadingProducts(true);
      setAllProducts([]);
      setSelectedProductId(undefined);
      setNombreProductoInput('');

      setLoadingSubRecetas(true);
      setAllSubRecetas([]);
      setSelectedSubRecetaId(undefined);
      setNombreSubRecetaInput('');

      setCantidad('');
      setInferredUnit(''); // Reset the inferred unit on close
      selectedItemDetailsRef.current = null;
    }
  }, [visible]);

  const fetchSelectableItems = useCallback(async () => {
    setLoadingProducts(true);
    setLoadingSubRecetas(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from('productos')
        .select('id, nombre, unidad, cantidad_en_unidad')
        .eq('empresa_id', empresaId)
        .order('nombre', { ascending: true });

      if (productError) throw productError;
      setAllProducts(productData as SelectableProduct[]);

      const { data: recipeData, error: recipeError } = await supabase
        .from('recetas')
        .select('id, nombre, unidad_de_medida, cantidad_total, costo_por_rendimiento')
        .eq('empresa_id', empresaId)
        .neq('id', recetaId) // Cannot add a recipe to itself as an ingredient
        .not('cantidad_total', 'is', null) // Recipes must have a defined yield quantity
        .not('unidad_de_medida', 'is', null) // Recipes must have a defined yield unit
        .order('nombre', { ascending: true });

      if (recipeError) throw recipeError;
      setAllSubRecetas(recipeData as SelectableSubReceta[]);

    } catch (e: any) {
      Alert.alert('Error', `No se pudieron cargar los productos/sub-recetas: ${e.message}`);
      setAllProducts([]);
      setAllSubRecetas([]);
    } finally {
      setLoadingProducts(false);
      setLoadingSubRecetas(false);
    }
  }, [empresaId, recetaId]);

  useEffect(() => {
    if (visible) {
      fetchSelectableItems();
    }
  }, [visible, fetchSelectableItems]);

  const handleItemSelected = useCallback((item: SelectableProduct | SelectableSubReceta) => {
    selectedItemDetailsRef.current = item;

    let unitToInfer = ''; // Changed from suggestedUnit for clarity
    
    if ('unidad' in item && item.unidad) { // It's a SelectableProduct
      unitToInfer = item.unidad; // Use the product's base unit directly
    }
    else if ('unidad_de_medida' in item && item.unidad_de_medida) { // It's a SelectableSubReceta
      unitToInfer = item.unidad_de_medida; // Use the sub-recipe's output unit directly
    }

    setInferredUnit(unitToInfer); // Set the determined unit
  }, []);

  // Updated formSteps array (removed 'Unidad' step)
  const formSteps = [
    {
      title: 'Seleccionar Ingrediente',
      validation: () => {
        let selectedId = selectedItemType === 'product' ? selectedProductId : selectedSubRecetaId;
        let itemNameInput = selectedItemType === 'product' ? nombreProductoInput : nombreSubRecetaInput;
        let allItems = selectedItemType === 'product' ? allProducts : allSubRecetas;

        if (!selectedId) {
          Alert.alert('Validación', `Debe seleccionar un ${selectedItemType === 'product' ? 'producto' : 'sub-receta'} de la lista.`);
          return false;
        }
        
        const actualSelectedItemName = allItems.find(p => p.id === selectedId)?.nombre;
        if (actualSelectedItemName !== itemNameInput) {
            Alert.alert('Validación', `El ${selectedItemType === 'product' ? 'producto' : 'sub-receta'} seleccionado no coincide con el campo. Por favor, elija uno de la lista sugerida.`);
            if (selectedItemType === 'product') {
                setSelectedProductId(undefined);
                setNombreProductoInput(actualSelectedItemName || '');
            } else {
                setSelectedSubRecetaId(undefined);
                setNombreSubRecetaInput(actualSelectedItemName || '');
            }
            return false;
        }
        return true;
      },
    },
    {
      title: 'Cantidad',
      validation: () => {
        if (cantidad.trim() === '' || isNaN(Number(cantidad)) || Number(cantidad) <= 0) {
          Alert.alert('Validación', 'La cantidad debe ser un número válido mayor que 0.');
          return false;
        }
        // Ensure that a unit has been inferred, otherwise the previous step validation failed
        if (!inferredUnit.trim()) {
            Alert.alert('Error Interno', 'No se pudo determinar la unidad del ingrediente. Por favor, vuelva a seleccionar el producto/sub-receta.');
            return false;
        }
        return true;
      },
    },
    // The 'Unidad' step is removed, so no validation here
  ];

  const handleNextStep = async () => {
    // Validate current step
    if (!formSteps[formIndex].validation()) {
      return;
    }

    // Check if it's the last step
    if (formIndex < formSteps.length - 1) { // formSteps.length is now 2
      setFormIndex(formIndex + 1);
    } else {
      // Final submission logic
      const finalProductId = selectedItemType === 'product' ? selectedProductId : undefined;
      const finalRecetaIngredienteId = selectedItemType === 'recipe' ? selectedSubRecetaId : undefined;

      if (!finalProductId && !finalRecetaIngredienteId) {
        Alert.alert('Error', 'No se seleccionó ningún producto/sub-receta.');
        return;
      }

      // Final check for inferredUnit before submission
      if (!inferredUnit.trim()) {
          Alert.alert('Error', 'No se pudo determinar la unidad del ingrediente. Por favor, vuelva a seleccionar el producto/sub-receta.');
          return;
      }

      const formData: IngredienteFormData = {
        receta_id: recetaId,
        producto_id: finalProductId,
        receta_ingrediente_id: finalRecetaIngredienteId,
        cantidad: cantidad.trim(),
        unidad: inferredUnit.trim(), // Use the inferred unit
      };

      try {
        await onSubmit(formData);
        onClose(); // Close modal on successful submission
      } catch (e: any) {
        console.error("Error al agregar ingrediente:", e);
        Alert.alert("Error al agregar ingrediente", e.message || "Ocurrió un error desconocido.");
      }
    }
  };

  const handlePrevStep = () => {
    if (formIndex > 0) {
      setFormIndex(formIndex - 1);
    }
  };

  const isNextButtonDisabled = useCallback(() => {
    if (loadingProducts || loadingSubRecetas) {
        return true;
    }
    // Only validate the first step using this simplified check
    if (formIndex === 0) {
        let selectedId = selectedItemType === 'product' ? selectedProductId : selectedSubRecetaId;
        let itemNameInput = selectedItemType === 'product' ? nombreProductoInput : nombreSubRecetaInput;
        let allItems = selectedItemType === 'product' ? allProducts : allSubRecetas;

        if (!selectedId) return true;

        const selectedItem = allItems.find(p => p.id === selectedId);
        if (!selectedItem || selectedItem.nombre !== itemNameInput) return true;
    }
    
    return false;
  }, [formIndex, selectedItemType, selectedProductId, selectedSubRecetaId, nombreProductoInput, nombreSubRecetaInput, allProducts, allSubRecetas, loadingProducts, loadingSubRecetas]);

  if (!visible) return null;

  const renderFormStepComponent = () => {
    switch (formIndex) {
      case 0:
        return (
          <FormStepItemAndTypeSelection
            selectedItemType={selectedItemType}
            setSelectedItemType={setSelectedItemType}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            nombreProductoInput={nombreProductoInput}
            setNombreProductoInput={setNombreProductoInput}
            allProducts={allProducts}
            loadingProducts={loadingProducts}
            selectedSubRecetaId={selectedSubRecetaId}
            setSelectedSubRecetaId={setSelectedSubRecetaId}
            nombreSubRecetaInput={nombreSubRecetaInput}
            setNombreSubRecetaInput={setNombreSubRecetaInput}
            allSubRecetas={allSubRecetas}
            loadingSubRecetas={loadingSubRecetas}
            onItemSelected={handleItemSelected}
          />
        );
      case 1: // Now the Quantity step is the second step
        return (
          <FormStepCantidad
            cantidad={cantidad}
            setCantidad={setCantidad}
            inferredUnit={inferredUnit} // Pass the inferred unit to display
          />
        );
      // The 'Unidad' step (case 2) is removed
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.glassContainer}>
            <ScrollView contentContainerStyle={modalStyles.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={modalStyles.modalTitle}>{formSteps[formIndex].title}</Text>

              {renderFormStepComponent()}

              <View style={modalStyles.modalButtons}>
                {formIndex > 0 ? (
                  <Pressable
                    style={[
                      modalStyles.button,
                      modalStyles.backButton,
                    ]}
                    onPress={handlePrevStep}
                  >
                    <Text style={[modalStyles.buttonText]}>Atrás</Text>
                  </Pressable>
                ) : (
                  <View style={modalStyles.buttonPlaceholder} />
                )}
                <Pressable
                  style={[
                    modalStyles.button,
                    modalStyles.nextButton,
                    isNextButtonDisabled() ? modalStyles.disabledButton : null
                  ]}
                  onPress={handleNextStep}
                  disabled={isNextButtonDisabled()}
                >
                  <Text style={[
                      modalStyles.buttonText, 
                      isNextButtonDisabled() ? modalStyles.disabledNextText : null
                  ]}>
                    {formIndex === formSteps.length - 1 ? 'Agregar' : 'Siguiente'}
                  </Text>
                </Pressable>
              </View>

              <Pressable style={[modalStyles.button, modalStyles.cancelButton]} onPress={onClose}>
                <Text style={modalStyles.buttonText}>Cancelar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- STYLES ---
const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    borderRadius: 20,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 5,
  },
  glassContainer: {
    borderRadius: 20,
    padding: 2,
    backgroundColor: 'rgba(138, 255, 255, 0.4)',
    shadowColor: "#94C8EF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 50,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    flexGrow: 1,
    color: '#F4E3D7',
    fontFamily: 'Georgia',
    fontWeight: "bold",
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 20,
    padding: 10,
    color: '#00234B',
    fontFamily: 'Georgia',
    fontWeight: "bold",
    textAlign: 'center',
  },
  formStepContainer: {
    marginBottom: 10,
  },
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
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  input: {
    padding: 10,
    color: '#333',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#00234B',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'sans-serif',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 15,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'sans-serif-medium',
  },
  nextButton: {
    backgroundColor: '#00234B',
    borderWidth: 0.8,
    borderColor: '#FFA500',
  },
  backButton: {
    backgroundColor: '#00234B',
    borderWidth: 0.8,
    borderColor: '#FFA500',
  },
  cancelButton: {
    backgroundColor: '#8C272F',
    marginTop: 10,
    alignSelf: 'center',
    borderWidth: 0.8,
    borderColor: '#FFA500',
  },
  disabledButton: {
    backgroundColor: '#00234B',
    opacity: 0.7,
  },
  buttonPlaceholder: {
    flex: 1,
    marginRight: 10,
  },
  disabledNextText: {
    color: '#e0e0e0',
  },
  disabledText: {
    color: '#ffdddd',
    textAlign: 'center',
    padding: 10,
  },
  pickerWrapper: {
    borderRadius: 8,
    marginBottom: 150, // Enough space for iOS picker
    minHeight: 50,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderColor: '#C9D0D9',
    borderWidth: 0.1,
  },
  androidPickerVisualFix: {
    // This style is not directly used anymore if pickerWrapper has background
  },
  iosPicker: {
    height: 50,
    width: '100%',
    color: '#333',
    backgroundColor: 'transparent',
  },
  iosPickerItem: {
  },
  androidPicker: {
    height: 50,
    width: '100%',
    color: '#333',
    backgroundColor: 'transparent',
  },
  suggestionsContainer: {
    maxHeight: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: 'rgba(148, 200, 239, 0.5)',
    shadowColor: '#83D2E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Georgia',
  },
  warningText: {
    marginTop: 10,
    fontSize: 14,
    color: '#FF6347',
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  typeButtonSelected: {
    backgroundColor: '#00234B',
    borderColor: '#FFA500',
  },
  typeButtonText: {
    color: '#F4E3D7',
    fontFamily: 'Georgia',
    fontWeight: 'bold',
  },
  typeButtonTextSelected: {
    color: '#FFFFFF',
  },
  inferredUnitText: {
    fontSize: 14,
    color: '#00234B',
    textAlign: 'left',
    marginTop: 5,
    fontFamily: 'Georgia',
  },
});

export default IngredienteFormModal;