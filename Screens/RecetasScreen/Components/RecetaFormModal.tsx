import React, { useState, useEffect, useCallback, memo } from 'react';
import { LinearGradient } from 'react-native-linear-gradient';
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

// UPDATED: Added cantidad_total and unidad_de_medida to the FormData interface
export interface RecetaFormData {
  nombre: string;
  descripcion: string;
  empresa_id: string;
  categoria: string;
  precio_total?: string; // Selling price, optional
  // NEW FIELDS FOR YIELD
  cantidad_total?: string;
  unidad_de_medida?: string;
}

interface Empresa {
  id: string;
  nombre: string;
}

interface RecetaFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (formData: RecetaFormData) => Promise<void>;
  initialSelectedEmpresaId?: string;
  empresas: Empresa[];
}

const RECETA_CATEGORIES = ['Cocina', 'Bar']; // Specific options for the existing category picker
// NEW: Options for Unidad de Medida picker
const UNIDAD_DE_MEDIDA_OPTIONS = ['L', 'Kg', 'Porciones'];


// Re-usable GlowingInput
type GlowingInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  multiline?: boolean;
};

const GlowingInput = memo(
  ({
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    secureTextEntry = false,
    multiline = false,
  }: GlowingInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    return (
      // Changed: Replaced `isFocused && styles.focusedInputContainer` with ternary for explicit null
      <View style={[styles.inputContainer, isFocused ? styles.focusedInputContainer : null]}>
        <TextInput
          style={[styles.input, multiline ? styles.multilineInput : null]} // Changed this too for consistency
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#888"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
        />
      </View>
    );
  },
);

// --- START: Form Step Components (DEFINED OUTSIDE RecetaFormModal) ---

interface FormStepNombreProps {
  nombre: string;
  setNombre: (text: string) => void;
}
const FormStepNombre = memo(({ nombre, setNombre }: FormStepNombreProps) => (
  <GlowingInput value={nombre} onChangeText={setNombre} placeholder="Nombre de la receta" />
));

interface FormStepEmpresaProps {
  selectedEmpresaId?: string;
  setSelectedEmpresaId: (id: string | undefined) => void;
  empresas: Empresa[];
}
const FormStepEmpresa = memo(({ selectedEmpresaId, setSelectedEmpresaId, empresas }: FormStepEmpresaProps) => (
  <View style={styles.formStepContainer}>
    <Text style={styles.label}>Empresa</Text>
    {empresas && empresas.length > 0 ? (
      <Picker
        selectedValue={selectedEmpresaId}
        onValueChange={(itemValue) => setSelectedEmpresaId(itemValue)}
        enabled={true}
        style={Platform.OS === 'ios' ? styles.iosPicker : {}}
        itemStyle={Platform.OS === 'ios' ? styles.iosPickerItem : {}}
      >
        {empresas.map((emp) => (
          <Picker.Item key={emp.id} label={emp.nombre} value={emp.id} />
        ))}
      </Picker>
    ) : (
      <Text style={styles.disabledText}>No tiene empresas asignadas.</Text>
    )}
  </View>
));

interface FormStepDescripcionProps {
  descripcion: string;
  setDescripcion: (text: string) => void;
}
const FormStepDescripcion = memo(({ descripcion, setDescripcion }: FormStepDescripcionProps) => (
  <GlowingInput
    value={descripcion}
    onChangeText={setDescripcion}
    placeholder="Descripción (opcional)"
    multiline={true}
  />
));


interface FormStepCategoriaProps {
  categoria: string;
  setCategoria: (value: string) => void;
}
const FormStepCategoria = memo(({ categoria, setCategoria }: FormStepCategoriaProps) => (
  <View style={styles.formStepContainer}>
    <Text style={styles.label}>Categoría</Text> 
    <Picker
      selectedValue={categoria}
      onValueChange={setCategoria}
      style={Platform.OS === 'ios' ? styles.iosPicker : {}}
      itemStyle={Platform.OS === 'ios' ? styles.iosPickerItem : {}}
    >
      {RECETA_CATEGORIES.map((cat) => (
        <Picker.Item key={cat} label={cat} value={cat} />
      ))}
    </Picker>
  </View>
));

// NEW FormStep for Rendimiento (Yield)
interface FormStepYieldProps {
  cantidadTotal: string;
  setCantidadTotal: (text: string) => void;
  unidadDeMedida: string;
  setUnidadDeMedida: (text: string) => void;
}
const FormStepYield = memo(({ cantidadTotal, setCantidadTotal, unidadDeMedida, setUnidadDeMedida }: FormStepYieldProps) => (
  <View style={styles.formStepContainer}>
    <Text style={styles.label}>Rendimiento de la Receta</Text>
    <GlowingInput
      value={cantidadTotal}
      onChangeText={setCantidadTotal}
      placeholder="Cantidad total que rinde (ej: 1, 0.5)"
      keyboardType="numeric"
    />
    <Text style={styles.label}>Unidad de medida</Text> 
    <Picker
      selectedValue={unidadDeMedida}
      onValueChange={setUnidadDeMedida}
      style={Platform.OS === 'ios' ? styles.iosPicker : {}}
      itemStyle={Platform.OS === 'ios' ? styles.iosPickerItem : {}}
    >
      {UNIDAD_DE_MEDIDA_OPTIONS.map((unit) => (
        <Picker.Item key={unit} label={unit} value={unit} />
      ))}
    </Picker>
  </View>
));


interface FormStepPrecioVentaProps {
  precioVenta: string;
  setPrecioVenta: (text: string) => void;
}
const FormStepPrecioVenta = memo(({ precioVenta, setPrecioVenta }: FormStepPrecioVentaProps) => (
  <GlowingInput
    value={precioVenta}
    onChangeText={setPrecioVenta}
    placeholder="Precio de venta (€) (Opcional)" // Clarify it's optional
    keyboardType="numeric" // Ensure numeric input
  />
));

// --- END: Form Step Components ---


// --- START: RecetaFormModal Component ---
const RecetaFormModal: React.FC<RecetaFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialSelectedEmpresaId,
  empresas,
}) => {
  const [formIndex, setFormIndex] = useState(0);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState(RECETA_CATEGORIES[0]);
  const [precioVenta, setPrecioVenta] = useState('');
  // NEW STATE: for cantidad_total and unidad_de_medida, initialized with default values
  const [cantidadTotal, setCantidadTotal] = useState('');
  // Initialize Picker with first valid option to avoid null/undefined initial value
  const [unidadDeMedida, setUnidadDeMedida] = useState(UNIDAD_DE_MEDIDA_OPTIONS[0]);


  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | undefined>(
    initialSelectedEmpresaId
  );

  useEffect(() => {
    // Reset form when visibility changes or initialEmpresaId changes
    if (visible) {
      setFormIndex(0);
      setNombre('');
      setDescripcion('');
      setCategoria(RECETA_CATEGORIES[0]);
      setPrecioVenta('');
      setCantidadTotal(''); // Reset
      setUnidadDeMedida(UNIDAD_DE_MEDIDA_OPTIONS[0]); // Reset to default option
      setSelectedEmpresaId(initialSelectedEmpresaId || (empresas.length > 0 ? empresas[0].id : undefined));
    }
  }, [visible, initialSelectedEmpresaId, empresas]);


  // Updated formSteps array with 'Rendimiento' step
  const formSteps = [
    { title: 'Nombre' },          // 0
    { title: 'Empresa' },         // 1
    { title: 'Descripción' },     // 2
    { title: 'Categoría' },       // 3
    { title: 'Rendimiento' },     // NEW: 4 (contains cantidad_total & unidad_de_medida)
    { title: 'Precio de Venta' }, // now 5
  ];

  const handleNextStep = async () => {
    // Validation adjusted for new indices
    if (formIndex === 0 && nombre.trim() === '') return Alert.alert('Validación', 'El nombre de la receta es obligatorio.');
    if (formIndex === 1 && !selectedEmpresaId) return Alert.alert('Validación', 'Debe seleccionar una empresa.');
    if (formIndex === 3 && categoria.trim() === '') return Alert.alert('Validación', 'La categoría es obligatoria.');

    // NEW validation for "Rendimiento" step (index 4)
    if (formIndex === 4) {
      const parsedCantidad = parseFloat(cantidadTotal);
      if (cantidadTotal.trim() === '' || isNaN(parsedCantidad) || parsedCantidad <= 0) {
        return Alert.alert('Validación', 'La cantidad total que rinde debe ser un número válido y positivo.');
      }
      // unidadDeMedida validation is implicitly handled by picker always having a value,
      // but explicitly checking for an empty string is harmless.
      if (unidadDeMedida.trim() === '') {
        return Alert.alert('Validación', 'La unidad de medida es obligatoria para el rendimiento.');
      }
    }

    // Validation for selling price step (index 5 now)
    if (formIndex === 5) { 
        const parsedPrecio = parseFloat(precioVenta);
        if (precioVenta.trim() !== '' && (isNaN(parsedPrecio) || parsedPrecio < 0)) {
            return Alert.alert('Validación', 'El precio de venta debe ser un número válido y no negativo si se ingresa.');
        }
    }


    if (formIndex < formSteps.length - 1) {
      setFormIndex(formIndex + 1);
    } else {
      // Final validations before submitting (all indices shifted)
      if (nombre.trim() === '') return Alert.alert('Error', 'El nombre de la receta es obligatorio.');
      if (!selectedEmpresaId) return Alert.alert('Error', 'Debe seleccionar una empresa.');
      if (categoria.trim() === '') return Alert.alert('Error', 'La categoría es obligatoria.');
      
      // Final validation for "Rendimiento" fields
      const parsedCantidad = parseFloat(cantidadTotal);
      if (cantidadTotal.trim() === '' || isNaN(parsedCantidad) || parsedCantidad <= 0) {
        return Alert.alert('Error', 'La cantidad total que rinde debe ser un número válido y positivo.');
      }
      // unidadDeMedida validation check
      if (unidadDeMedida.trim() === '') {
        return Alert.alert('Error', 'La unidad de medida es obligatoria para el rendimiento.');
      }

      // Final validation for selling price
      const parsedPrecio = parseFloat(precioVenta);
      if (precioVenta.trim() !== '' && (isNaN(parsedPrecio) || parsedPrecio < 0)) {
          return Alert.alert('Error', 'El precio de venta debe ser un número válido y no negativo si se ingresa.');
      }

      const formData: RecetaFormData = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        empresa_id: selectedEmpresaId,
        categoria: categoria,
        cantidad_total: cantidadTotal.trim() !== '' ? cantidadTotal.trim() : undefined, // NEW
        unidad_de_medida: unidadDeMedida.trim() !== '' ? unidadDeMedida.trim() : undefined, // NEW
        precio_total: precioVenta.trim() !== '' ? precioVenta.trim() : undefined
      };
      try {
        await onSubmit(formData);
        onClose();
      } catch (error) {
        console.error("Error submitting form: ", error);
        Alert.alert('Error', 'No se pudo guardar la receta. ' + (error as Error).message);
      }
    }
  };

  const handlePrevStep = () => {
    if (formIndex > 0) {
      setFormIndex(formIndex - 1);
    }
  };

  const isNextButtonDisabled = (): boolean => {
    // This only checks for the first two steps as per original logic.
    // More complex validation for subsequent steps occurs in handleNextStep implicitly.
    if (formIndex === 0 && nombre.trim() === '') return true;
    if (formIndex === 1 && !selectedEmpresaId) return true;
    return false;
  };
  if (!visible) {
    return null;
  }

  const renderFormStepComponent = () => {
    switch (formIndex) {
      case 0:
        return <FormStepNombre nombre={nombre} setNombre={setNombre} />;
      case 1:
        return (
          <FormStepEmpresa
            selectedEmpresaId={selectedEmpresaId}
            setSelectedEmpresaId={setSelectedEmpresaId}
            empresas={empresas}
          />
        );
      case 2:
        return <FormStepDescripcion descripcion={descripcion} setDescripcion={setDescripcion} />;
      case 3: 
        return <FormStepCategoria categoria={categoria} setCategoria={setCategoria} />;
      case 4: // NEW INDEX for Rendimiento
        return (
          <FormStepYield
            cantidadTotal={cantidadTotal}
            setCantidadTotal={setCantidadTotal}
            unidadDeMedida={unidadDeMedida}
            setUnidadDeMedida={setUnidadDeMedida}
          />
        );
      case 5: // NEW INDEX for Precio de Venta
        return <FormStepPrecioVenta precioVenta={precioVenta} setPrecioVenta={setPrecioVenta} />;
      default:
        return null; // Should not happen
    }
  };


  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.glassContainer}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{formSteps[formIndex].title}</Text>
              {renderFormStepComponent()}

              <View style={styles.modalButtons}>
                {formIndex > 0 ? (
                  <Pressable
                    style={[styles.button, styles.backButton]}
                    onPress={handlePrevStep}
                  >
                    <Text style={styles.buttonText}>Atrás</Text>
                  </Pressable>
                ) : (
                  <View style={styles.buttonPlaceholder} />
                )}
                
                <Pressable
                  style={[styles.button, styles.nextButton, isNextButtonDisabled() ? styles.disabledButton : null]}
                  disabled={isNextButtonDisabled()}
                  onPress={handleNextStep}
                >
                  <Text 
                    style={[styles.buttonText, isNextButtonDisabled() ? styles.disabledNextText : null]}
                  >
                    {formIndex === formSteps.length - 1 ? 'Agregar' : 'Siguiente'}
                  </Text>
                </Pressable>
              </View>

              <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
        </View>
       </Modal>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 2,
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
  label: { // Used now for all labels
    fontSize: 16,
    marginBottom: 8,
    color: '#00234B', // Ensured dark color for visibility
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
  disabledNextText: {
    color: '#e0e0e0',
  },
  disabledText: {
    color: '#ffdddd',
    textAlign: 'center',
    padding: 10,
  },
  iosPicker: {
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  iosPickerItem: {
    // This style is often not fully applied as text color in iOS Picker items is handled natively.
    // However, it's kept consistent with your existing category picker setup.
  },
  buttonPlaceholder: {
    width: 100, // Same width as buttons to maintain spacing
    // No background or border, just a spacer
  },
});

export default RecetaFormModal;