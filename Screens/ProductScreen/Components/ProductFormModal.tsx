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
import { Picker } from '@react-native-picker/picker'; // Make sure this is imported

// Define types for form data and props (Keep this as is)
export interface ProductFormData {
  nombre: string;
  descripcion: string;
  precio: string;
  iva_tipo: string;
  categoria: string;
  proveedorNombre: string;
  stock: string;
  stock_minimo: string;
  unidad: string;
  cantidad_en_unidad: number | null;
  cantidad_pedido: string;
  empresa_id: string;
}

interface Empresa {
  id: string;
  nombre: string;
}

interface ProductFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (formData: ProductFormData) => Promise<void>;
  initialSelectedEmpresaId?: string;
  empresas: Empresa[];
}

// Constants (can be passed as props if they vary more dynamically)
const CATEGORIAS = ['Bar', 'Cocina', 'Limpieza', 'Café'];
const IVA_OPTIONS = [0, 10, 21];

// Re-usable GlowingInput (definition remains the same)
type GlowingInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
};

const GlowingInput = memo(
  ({
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    secureTextEntry = false,
  }: GlowingInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    return (
      <View style={[styles.inputContainer, isFocused && styles.focusedInputContainer]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#888"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
        />
      </View>
    );
  },
);

// --- START: MOVE FORM STEP COMPONENTS OUTSIDE ProductFormModal ---

interface FormStepNombreProps {
    nombre: string;
    setNombre: (text: string) => void;
}
const FormStepNombre = memo(({ nombre, setNombre }: FormStepNombreProps) => (
  <GlowingInput value={nombre} onChangeText={setNombre} placeholder="Nombre del producto" />
));

interface FormStepEmpresaProps {
    selectedEmpresaId: string | undefined;
    setSelectedEmpresaId: (id: string | undefined) => void;
    empresas: Empresa[];
}
const FormStepEmpresa = memo(({ selectedEmpresaId, setSelectedEmpresaId, empresas }: FormStepEmpresaProps) => (
  <View style={styles.formStepContainer}>
    {empresas && empresas.length > 0 ? (
      <Picker
        selectedValue={selectedEmpresaId}
        onValueChange={(itemValue) => setSelectedEmpresaId(itemValue)}
        enabled={empresas.length > 0}
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
  <GlowingInput value={descripcion} onChangeText={setDescripcion} placeholder="Descripción (opcional)" />
));

interface FormStepPrecioProps {
    precio: string;
    setPrecio: (text: string) => void;
}
const FormStepPrecio = memo(({ precio, setPrecio }: FormStepPrecioProps) => (
  <GlowingInput value={precio} onChangeText={setPrecio} placeholder="Precio del producto" keyboardType="numeric" />
));

interface FormStepIVATipoProps {
    ivaTipo: string;
    setIvaTipo: (value: string) => void;
}
const FormStepIVATipo = memo(({ ivaTipo, setIvaTipo }: FormStepIVATipoProps) => (
  <View style={styles.formStepContainer}>
     <Text style={styles.label}>Tipo de IVA</Text>
    <Picker selectedValue={ivaTipo} onValueChange={setIvaTipo}
      style={Platform.OS === 'ios' ? styles.iosPicker : {}}
      itemStyle={Platform.OS === 'ios' ? styles.iosPickerItem : {}}
    >
      {IVA_OPTIONS.map((iva) => (
        <Picker.Item key={iva} label={`${iva}%`} value={iva.toString()} />
      ))}
    </Picker>
  </View>
));

interface FormStepCategoriaProps {
    categoria: string;
    setCategoria: (cat: string) => void;
}
const FormStepCategoria = memo(({ categoria, setCategoria }: FormStepCategoriaProps) => (
   <View style={styles.formStepContainer}>
    <Text style={styles.label}>Categoría</Text>
    <View style={styles.categoryButtons}>
      {CATEGORIAS.map((cat) => (
        <Pressable
          key={cat}
          style={[styles.categoryButton, categoria === cat && styles.categoryButtonSelected]}
          onPress={() => setCategoria(cat)}
        >
          <Text style={[styles.categoryButtonText, categoria === cat && styles.categoryButtonTextSelected]}>
            {cat}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
));

interface FormStepProveedorProps {
    proveedorNombre: string;
    setProveedorNombre: (text: string) => void;
}
const FormStepProveedor = memo(({ proveedorNombre, setProveedorNombre }: FormStepProveedorProps) => (
  <GlowingInput value={proveedorNombre} onChangeText={setProveedorNombre} placeholder="Nombre del proveedor" />
));

interface FormStepStockProps {
    stock: string;
    setStock: (text: string) => void;
}
const FormStepStock = memo(({ stock, setStock }: FormStepStockProps) => (
  <GlowingInput value={stock} onChangeText={setStock} placeholder="Stock (opcional)" keyboardType="numeric" />
));

interface FormStepStockMinimoProps {
    stockMinimo: string;
    setStockMinimo: (text: string) => void;
}
const FormStepStockMinimo = memo(({ stockMinimo, setStockMinimo }: FormStepStockMinimoProps) => (
  <GlowingInput value={stockMinimo} onChangeText={setStockMinimo} placeholder="Stock Mínimo (obligatorio)" keyboardType="numeric" />
));

interface FormStepUnidadProps {
    unidad: string;
    setUnidad: (text: string) => void;
}
const FormStepUnidad = memo(({ unidad, setUnidad }: FormStepUnidadProps) => (
  <GlowingInput value={unidad} onChangeText={setUnidad} placeholder="Unidad (ej: L, Kg, ud)" />
));

interface FormStepCantidadEnUnidadProps {
    unidad: string;
    cantidadEnUnidad: string;
    setCantidadEnUnidad: (text: string) => void;
}
const FormStepCantidadEnUnidad = memo(({ unidad, cantidadEnUnidad, setCantidadEnUnidad }: FormStepCantidadEnUnidadProps) => {
  const isVolumeOrWeightUnit = ['L', 'l', 'Kg', 'kg'].includes(unidad.trim());
  return (
    <View style={styles.formStepContainer}>
      <Text style={styles.label}>Cantidad/Volumen en Unidad</Text>
      {isVolumeOrWeightUnit ? (
        <GlowingInput
          value={cantidadEnUnidad}
          onChangeText={setCantidadEnUnidad}
          placeholder={`Valor por ${unidad} (ej: 0.7 para 700ml, 1 para 1kg)`}
          keyboardType="numeric"
        />
      ) : (
        <Text style={styles.infoText}>
          Este campo solo es necesario si la unidad es 'L' o 'Kg'.
          Para otras unidades (ej: 'ud' - unidad), se asume un valor de 1.
        </Text>
      )}
    </View>
  );
});

interface FormStepCantidadPedidoProps {
    cantidad_pedido: string;
    setCantidadPedido: (text: string) => void;
}
const FormStepCantidadPedido = memo(({ cantidad_pedido, setCantidadPedido }: FormStepCantidadPedidoProps) => (
  <GlowingInput
    value={cantidad_pedido}
    onChangeText={setCantidadPedido}
    placeholder="Cantidad en un paquete (ej: 24, 1)"
    keyboardType="numeric"
  />
));

// --- END: MOVE FORM STEP COMPONENTS OUTSIDE ProductFormModal ---

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialSelectedEmpresaId,
  empresas,
}) => {
  const [formIndex, setFormIndex] = useState(0);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [ivaTipo, setIvaTipo] = useState(IVA_OPTIONS[0].toString());
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [stock, setStock] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [unidad, setUnidad] = useState('');
  const [cantidadEnUnidad, setCantidadEnUnidad] = useState('');
  const [cantidad_pedido, setCantidadPedido] = useState('');
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | undefined>(
    initialSelectedEmpresaId
  );

  useEffect(() => {
    // Reset form when visibility changes or initialEmpresaId changes
    if (visible) {
      setFormIndex(0);
      setNombre('');
      setDescripcion('');
      setPrecio('');
      setIvaTipo(IVA_OPTIONS[0].toString());
      setCategoria(CATEGORIAS[0]);
      setProveedorNombre('');
      setStock('');
      setStockMinimo('');
      setUnidad('');
      setCantidadEnUnidad('');
      setCantidadPedido('');
      setSelectedEmpresaId(initialSelectedEmpresaId || (empresas.length > 0 ? empresas[0].id : undefined));
    }
  }, [visible, initialSelectedEmpresaId, empresas]);


  // --- NEW: Helper function to normalize decimal input ---
  const normalizeDecimalInput = (text: string): string => {
    // Replace comma with dot for internal parsing
    return text.replace(',', '.');
  };

  // --- NEW: Memoized setters for numeric fields ---
  // Apply normalization here directly before updating state
  const handleSetPrecio = useCallback((text: string) => {
    setPrecio(normalizeDecimalInput(text));
  }, []);

  const handleSetStock = useCallback((text: string) => {
    setStock(normalizeDecimalInput(text));
  }, []);

  const handleSetStockMinimo = useCallback((text: string) => {
    setStockMinimo(normalizeDecimalInput(text));
  }, []);

  const handleSetCantidadEnUnidad = useCallback((text: string) => {
    setCantidadEnUnidad(normalizeDecimalInput(text));
  }, []);

  const handleSetCantidadPedido = useCallback((text: string) => {
    setCantidadPedido(normalizeDecimalInput(text));
  }, []);


  // Updated formSteps array, passing the new memoized setters
  const formSteps = [
    { title: 'Nombre', component: <FormStepNombre nombre={nombre} setNombre={setNombre} /> },
    { title: 'Empresa', component: <FormStepEmpresa selectedEmpresaId={selectedEmpresaId} setSelectedEmpresaId={setSelectedEmpresaId} empresas={empresas} /> },
    { title: 'Descripción', component: <FormStepDescripcion descripcion={descripcion} setDescripcion={setDescripcion} /> },
    // Use the new handleSetPrecio
    { title: 'Precio', component: <FormStepPrecio precio={precio} setPrecio={handleSetPrecio} /> },
    { title: 'Tipo IVA', component: <FormStepIVATipo ivaTipo={ivaTipo} setIvaTipo={setIvaTipo} /> },
    { title: 'Categoría', component: <FormStepCategoria categoria={categoria} setCategoria={setCategoria} /> },
    { title: 'Proveedor', component: <FormStepProveedor proveedorNombre={proveedorNombre} setProveedorNombre={setProveedorNombre} /> },
    // Use the new handleSetStock
    { title: 'Stock', component: <FormStepStock stock={stock} setStock={handleSetStock} /> },
    // Use the new handleSetStockMinimo
    { title: 'Stock Mínimo', component: <FormStepStockMinimo stockMinimo={stockMinimo} setStockMinimo={handleSetStockMinimo} /> },
    { title: 'Unidad', component: <FormStepUnidad unidad={unidad} setUnidad={setUnidad} /> },
    // Use the new handleSetCantidadEnUnidad
    { title: 'Cantidad en Unidad', component: <FormStepCantidadEnUnidad unidad={unidad} cantidadEnUnidad={cantidadEnUnidad} setCantidadEnUnidad={handleSetCantidadEnUnidad} /> },
    // Use the new handleSetCantidadPedido
    { title: 'Cantidad en Pedido', component: <FormStepCantidadPedido cantidad_pedido={cantidad_pedido} setCantidadPedido={handleSetCantidadPedido} /> },
  ];

  const handleNextStep = async () => {
    // Basic validation for current step before proceeding
    if (formIndex === 0 && nombre.trim() === '') return Alert.alert('Validación', 'El nombre del producto es obligatorio.');
    if (formIndex === 1 && !selectedEmpresaId) return Alert.alert('Validación', 'Debe seleccionar una empresa.');
    if (formIndex === 3 && (precio.trim() === '' || isNaN(Number(precio)))) return Alert.alert('Validación', 'El precio debe ser un número válido.');
    if (formIndex === 6 && proveedorNombre.trim() === '') return Alert.alert('Validación', 'El nombre del proveedor es obligatorio.');
    if (formIndex === 8 && (stockMinimo.trim() === '' || isNaN(Number(stockMinimo)))) return Alert.alert('Validación', 'El stock mínimo es obligatorio y debe ser un número.');
    
    // VALIDATION: For 'Cantidad en Unidad' step (formIndex 10)
    if (formIndex === 10) {
      const trimmedUnidad = unidad.trim().toLowerCase();
      if (['l', 'kg'].includes(trimmedUnidad)) {
        if (cantidadEnUnidad.trim() === '' || isNaN(Number(cantidadEnUnidad)) || Number(cantidadEnUnidad) <= 0) {
          return Alert.alert('Validación', `Ingrese un valor válido (mayor que 0) para la cantidad en ${unidad}.`);
        }
      }
    }

    // Validation for the last step (Cantidad por paquete, now at formIndex 11)
    if (formIndex === 11 && (cantidad_pedido.trim() === '' || isNaN(Number(cantidad_pedido)) || Number(cantidad_pedido) <= 0)) {
        return Alert.alert('Validación', 'La cantidad por paquete es obligatoria y debe ser un número mayor que 0.');
    }

    // Advance to the next step
    if (formIndex < formSteps.length - 1) {
      setFormIndex(formIndex + 1);
    } else {
      // Final submission logic
      // Re-validate all required fields in case user skipped steps
      if (nombre.trim() === '') return Alert.alert('Error', 'El nombre del producto es obligatorio.');
      if (!selectedEmpresaId) return Alert.alert('Error', 'Debe seleccionar una empresa.');
      if (precio.trim() === '' || isNaN(Number(precio))) return Alert.alert('Error', 'El precio debe ser un número válido.');
      if (proveedorNombre.trim() === '') return Alert.alert('Error', 'El proveedor es obligatorio.');
      if (stockMinimo.trim() === '' || isNaN(Number(stockMinimo))) return Alert.alert('Error', 'El stock mínimo es obligatorio y debe ser un número.');
      
      const trimmedUnidad = unidad.trim().toLowerCase();
      if (['l', 'kg'].includes(trimmedUnidad)) {
        if (cantidadEnUnidad.trim() === '' || isNaN(Number(cantidadEnUnidad)) || Number(cantidadEnUnidad) <= 0) {
          return Alert.alert('Error', `Ingrese un valor válido (mayor que 0) para la cantidad en ${unidad}.`);
        }
      }
      
      if (cantidad_pedido.trim() === '' || isNaN(Number(cantidad_pedido)) || Number(cantidad_pedido) <= 0) {
          return Alert.alert('Error', 'La cantidad por paquete es obligatoria y debe ser un número mayor que 0.');
      }

      // Prepare data for submission, including the new field
      let finalCantidadEnUnidad: number | null = null;
      if (['l', 'kg'].includes(trimmedUnidad)) {
        finalCantidadEnUnidad = Number(cantidadEnUnidad);
      } // If not 'L' or 'Kg', it remains null.

      const formData: ProductFormData = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio,
        iva_tipo: ivaTipo,
        categoria,
        proveedorNombre: proveedorNombre.trim(),
        stock,
        stock_minimo: stockMinimo,
        unidad: unidad.trim(),
        cantidad_en_unidad: finalCantidadEnUnidad, // Pass the numeric or null value
        cantidad_pedido: cantidad_pedido,
        empresa_id: selectedEmpresaId,
      };
      try {
        await onSubmit(formData);
        onClose(); // Close modal upon successful submission
      } catch (error) {
        console.error("Error submitting form: ", error);
        Alert.alert('Error al guardar', 'Hubo un problema al guardar el producto. Inténtelo de nuevo.');
      }
    }
  };

  const handlePrevStep = () => {
    if (formIndex > 0) {
      setFormIndex(formIndex - 1);
    }
  };

  const isNextButtonDisabled = (): boolean => {
    if (formIndex === 0 && nombre.trim() === '') return true;
    if (formIndex === 1 && !selectedEmpresaId) return true;
    if (formIndex === 3 && (precio.trim() === '' || isNaN(Number(precio)))) return true;
    if (formIndex === 6 && proveedorNombre.trim() === '') return true;
    if (formIndex === 8 && (stockMinimo.trim() === '' || isNaN(Number(stockMinimo)))) return true;
    
    // Check: For 'Cantidad en Unidad' step (formIndex 10)
    if (formIndex === 10) {
      const trimmedUnidad = unidad.trim().toLowerCase();
      if (['l', 'kg'].includes(trimmedUnidad)) {
        if (cantidadEnUnidad.trim() === '' || isNaN(Number(cantidadEnUnidad)) || Number(cantidadEnUnidad) <= 0) {
          return true;
        }
      }
    }

    // Check for the last step (Cantidad por paquete, now at formIndex 11)
    if (formIndex === 11 && (cantidad_pedido.trim() === '' || isNaN(Number(cantidad_pedido)) || Number(cantidad_pedido) <= 0)) {
      return true;
    }

    return false;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.glassContainer}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{formSteps[formIndex].title}</Text>
              
              {/* This is the clean rendering based on formSteps array */}
              {formSteps[formIndex].component}

              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.button, styles.backButton, formIndex === 0 && styles.disabledButton]}
                  onPress={handlePrevStep}
                  disabled={formIndex === 0}
                >
                  <Text style={[styles.buttonText]}>Atrás</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.nextButton, isNextButtonDisabled() && styles.disabledButton]}
                  onPress={handleNextStep}
                  disabled={isNextButtonDisabled()}
                >
                  <Text style={[styles.buttonText, isNextButtonDisabled() && styles.disabledNextText]}>
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
    backgroundColor: 'rgba(0,0,0,0.5)', // Dimmed background
  },
  modalContainer: {
    width: '90%',
    borderRadius: 20,
    shadowColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    flexGrow: 1, // Ensure ScrollView can expand
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
    shadowColor: '#FFA500', // Use your accent color for the glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  input: {
    padding: 10,
    color: '#333',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#00234B', // Changed to complement dark blue theme
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'sans-serif',
    fontWeight: 'bold',
  },
  infoText: { // NEW style for informational text
    fontSize: 14,
    color: '#D3D3D3', // Lighter color for info text
    textAlign: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    marginTop: 5,
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 5,
  },
  categoryButton: {
    backgroundColor: '#ddd',
    padding: 10,
    borderRadius: 5,
  },
  categoryButtonSelected: {
    backgroundColor: '#A4D4FF',
    borderColor: '#00234B',
    borderWidth: 1,
  },
  categoryButtonText: {
    color: '#462917',
  },
  categoryButtonTextSelected: {
    color: '#00234B', // Corrected color for text on selected button
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Spread out buttons
    marginTop: 25,
    marginBottom: 15,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100, // Ensure buttons have a decent tap area
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
    backgroundColor: '#8C272F', // Destructive/cancel color
    marginTop: 10, // Separate from nav buttons
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
  disabledText: { // For picker when no companies
    color: '#ffdddd', // Light red to indicate issue
    textAlign: 'center',
    padding: 10,
  },
  iosPicker: {
    //backgroundColor: 'white', // Helps with iOS picker visibility/styling
  },
  iosPickerItem: {
    //color: '#000', // Ensure text color is visible on iOS
    //height: 120, // Adjust height if needed
  },
});

export default ProductFormModal;