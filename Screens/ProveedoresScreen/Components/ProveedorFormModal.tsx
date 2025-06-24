// Components/ProveedorFormModal.tsx
import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  KeyboardTypeOptions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useUserStore } from '/Users/nachorojas/Documents/TavaroApp/utils/useUserStore';
import { Proveedor } from '/Users/nachorojas/Documents/TavaroApp/Screens/ProveedoresScreen/ProveedoresScreen'; // Import Proveedor type

// Type for the data collected by this form (for both insert and update)
export type ProveedorFormData = {
  nombre: string;
  contacto_nombre: string;
  contacto_telefono: string;
  contacto_email: string;
  empresa_id: string;
  canal_pedido: string;
};

// Props for the modal
type ProveedorFormModalProps = {
  visible: boolean;
  onClose: () => void;
  // onSubmit will now be responsible for either INSERT or UPDATE based on initialData presence
  onSubmit: (formData: ProveedorFormData, isEditing: boolean, proveedorId?: string) => Promise<void>; 
  initialSelectedEmpresaId?: string | null;
  empresas: Array<{ id: string; nombre: string }>;
  initialData?: Proveedor | null; // NEW PROP: The existing provider data if editing
};

// ... (GlowingInput component definition - ONLY CHANGE: ENSURE TERNARY FOR STYLE ARRAY) ...
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
          <View style={[styles.inputContainer, isFocused ? styles.focusedInputContainer : null]}> 
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


const CANAL_PEDIDO_OPTIONS = ['WhatsApp', 'Email', 'Encargado'];

const ProveedorFormModal: React.FC<ProveedorFormModalProps> = ({
  visible,
  onClose,
  onSubmit, 
  initialSelectedEmpresaId,
  empresas,
  initialData, 
}) => {
  // Form State
  const [nombre, setNombre] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [contactoEmail, setContactoEmail] = useState('');
  const [canalPedido, setCanalPedido] = useState(CANAL_PEDIDO_OPTIONS[0]);
  const [selectedEmpresaIdForForm, setSelectedEmpresaIdForForm] = useState<string>(
    initialSelectedEmpresaId || (empresas.length > 0 ? empresas[0].id : '')
  );

  const totalSteps = 3;
  const [currentStep, setCurrentStep] = useState(0); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if we are in edit mode
  const isEditingMode = useMemo(() => !!initialData, [initialData]);

  // Reset/Initialize form when modal visibility or initialData changes
  useEffect(() => {
    if (visible) {
      if (isEditingMode && initialData) {
        setNombre(String(initialData.nombre || ''));
        setContactoNombre(String(initialData.contacto_nombre || ''));
        setContactoTelefono(String(initialData.contacto_telefono || ''));
        setContactoEmail(String(initialData.contacto_email || ''));
        setCanalPedido(String(initialData.canal_pedido || CANAL_PEDIDO_OPTIONS[0]));
        setSelectedEmpresaIdForForm(String(initialData.empresa_id || (empresas.length > 0 ? empresas[0].id : '')));
      } else {
        setNombre('');
        setContactoNombre('');
        setContactoTelefono('');
        setContactoEmail('');
        setCanalPedido(CANAL_PEDIDO_OPTIONS[0]);
        setSelectedEmpresaIdForForm(initialSelectedEmpresaId || (empresas.length > 0 ? empresas[0].id : ''));
      }
      setCurrentStep(0);
      setIsSubmitting(false);
    }
  }, [visible, initialSelectedEmpresaId, empresas, isEditingMode, initialData]);

  useEffect(() => {
    if (!isEditingMode) {
      if (initialSelectedEmpresaId && initialSelectedEmpresaId !== selectedEmpresaIdForForm) {
          setSelectedEmpresaIdForForm(initialSelectedEmpresaId);
      } else if (!initialSelectedEmpresaId && empresas.length > 0 && !selectedEmpresaIdForForm) {
          setSelectedEmpresaIdForForm(empresas[0].id);
      }
    }
  }, [initialSelectedEmpresaId, empresas, selectedEmpresaIdForForm, isEditingMode]);


  const nextFormStep = () => {
    if (currentStep === 0) { 
      if (!nombre.trim()) {
        Alert.alert('Campo Requerido', 'El nombre del proveedor es obligatorio.');
        return;
      }
      if (contactoEmail.trim() && !/\S+@\S+\.\S+/.test(contactoEmail.trim())) {
          Alert.alert('Email Inválido', 'Por favor, ingrese un correo electrónico válido.');
          return;
      }
    }
    if (currentStep < totalSteps - 1) { 
      setCurrentStep(currentStep + 1);
    }
  };

  const prevFormStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isNextButtonDisabled = useMemo(() => {
    if (currentStep === 0) {
      return !nombre.trim();
    }
    return false;
  }, [currentStep, nombre]);

  const isSubmitButtonDisabled = useMemo(() => {
    if (!nombre.trim()) return true;
    if (!selectedEmpresaIdForForm) return true;
    if (!canalPedido.trim() || !CANAL_PEDIDO_OPTIONS.includes(canalPedido)) return true;
    if (isSubmitting) return true;
    return false;
  }, [nombre, selectedEmpresaIdForForm, canalPedido, isSubmitting]);


  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!nombre.trim()) {
      Alert.alert('Campo Requerido', 'El nombre del proveedor es obligatorio.');
      setCurrentStep(0);
      return;
    }
    if (!selectedEmpresaIdForForm) {
      Alert.alert('Campo Requerido', 'Debe seleccionar una empresa.');
      setCurrentStep(1);
      return;
    }
    if (!CANAL_PEDIDO_OPTIONS.includes(canalPedido)) {
      Alert.alert('Campo Requerido', 'Debe seleccionar un canal de pedido válido.');
      setCurrentStep(2);
      return;
    }
    if (contactoEmail.trim() && !/\S+@\S+\.\S+/.test(contactoEmail.trim())) {
        Alert.alert('Email Inválido', 'Por favor, ingrese un correo electrónico válido para el contacto.');
        setCurrentStep(0);
        return;
    }

    setIsSubmitting(true);
    const formData: ProveedorFormData = {
      nombre: nombre.trim(),
      contacto_nombre: contactoNombre.trim(),
      contacto_telefono: contactoTelefono.trim(),
      contacto_email: contactoEmail.trim(),
      empresa_id: selectedEmpresaIdForForm,
      canal_pedido: canalPedido,
    };

    try {
      await onSubmit(formData, isEditingMode, initialData?.id);
      onClose();
    } catch (error) {
      console.error("Error submitting proveedor form from modal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Información del Proveedor</Text>
            <GlowingInput
              placeholder="Nombre del Proveedor *"
              value={nombre}
              onChangeText={setNombre}
            />
            <GlowingInput
              placeholder="Nombre de Contacto (Opcional)"
              value={contactoNombre}
              onChangeText={setContactoNombre}
            />
            <GlowingInput
              placeholder="Teléfono de Contacto (Opcional)"
              value={contactoTelefono}
              onChangeText={setContactoTelefono}
              keyboardType="phone-pad"
            />
            <GlowingInput
              placeholder="Email de Contacto (Opcional)"
              value={contactoEmail}
              onChangeText={setContactoEmail}
              keyboardType="email-address"
            />
          </View>
        );
      case 1: // Empresa Assignment
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Asignar a Empresa *</Text>
            {empresas.length > 0 ? (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedEmpresaIdForForm}
                  onValueChange={(itemValue) => setSelectedEmpresaIdForForm(itemValue || '')}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  enabled={!isEditingMode} 
                >
                  {/* Conditional rendering for Picker.Item with ternary operator */}
                  {isEditingMode && initialData && !empresas.some(e => e.id === initialData.empresa_id) ? (
                      <Picker.Item key={initialData.empresa_id} label={`Actual: ${initialData.empresa_id}`} value={initialData.empresa_id} />
                  ) : null}
                  {empresas.map((emp) => (
                    <Picker.Item key={emp.id} label={emp.nombre} value={emp.id} />
                  ))}
                </Picker>
                {/* Conditional rendering for Text with ternary operator */}
                {isEditingMode ? (
                  <Text style={styles.noteText}>La empresa no puede cambiarse en modo edición.</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.infoText}>No hay empresas disponibles. Por favor, agregue una empresa primero.</Text>
            )}
            </View>
        );
      case 2: // Canal Pedido Selection
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Canal de Pedido *</Text>
            <Text style={styles.infoText}>¿Por qué canal le gustaría enviar los pedidos a este proveedor?</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={canalPedido}
                onValueChange={(itemValue) => setCanalPedido(itemValue)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {CANAL_PEDIDO_OPTIONS.map((channel) => (
                  <Picker.Item key={channel} label={channel} value={channel} />
                ))}
              </Picker>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const modalTitle = isEditingMode ? 'Editar Proveedor' : 'Nuevo Proveedor';
  const submitButtonText = isEditingMode ? (isSubmitting ? 'Guardando...' : 'Guardar Cambios') : (isSubmitting ? 'Creando...' : 'Crear Proveedor');

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.mainModalTitle}>{modalTitle}</Text>
            <ScrollView style={styles.formScrollView}>
                {renderFormStep()}
            </ScrollView>

            <View style={styles.progressBarContainer}>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressBarDot,
                    index === currentStep ? styles.progressBarDotActive : null,
                  ]}
                />
              ))}
            </View>

            <View style={styles.navigationButtons}>
              {currentStep > 0 ? (
                <Pressable
                  style={[styles.button, styles.buttonBack]}
                  onPress={prevFormStep}
                  disabled={isSubmitting}
                >
                  <Text style={styles.buttonText}>Anterior</Text>
                </Pressable>
              ) : null}
              {currentStep < totalSteps - 1 ? ( 
                <Pressable
                  style={[styles.button, styles.buttonNext, isNextButtonDisabled ? styles.buttonActionDisabled : null]}
                  onPress={nextFormStep}
                  disabled={isNextButtonDisabled || isSubmitting}
                >
                  <Text style={styles.buttonText}>Siguiente</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.button, styles.buttonSubmit, isSubmitButtonDisabled ? styles.buttonActionDisabled : null]}
                  onPress={handleSubmit}
                  disabled={isSubmitButtonDisabled}
                >
                  <Text style={styles.buttonText}>{submitButtonText}</Text>
                </Pressable>
              )}
            </View>
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    
  },
  modalView: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: 'rgba(138, 255, 255, 0.4)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  shadowColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.7,
    shadowRadius: 15,
    elevation: 5,
  },
  mainModalTitle: {
    fontSize: 28,
    marginBottom: 15,
    padding: 10,
    color: '#00234B',
    fontFamily: 'Georgia',
    fontWeight: "bold",
    textAlign: 'center',
  },
  formScrollView: {
    width: '100%',
    marginBottom:15,
  },
  stepContainer: {
    width: '100%',
    marginBottom: 1,
  },
  stepTitle: {
   fontSize: 25,
    marginBottom: 2,
    padding: 10,
    color: '#00234B',
    fontFamily: 'Georgia',
    fontWeight: "bold",
    textAlign: 'center',
  },
   inputContainer: {
    width: '100%',
    backgroundColor: '#FFF1D8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D0D9',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  focusedInputContainer: {
    borderColor: '#94C8EF',
    shadowColor: '#94C8EF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  input: {
    padding: 10,
    height: 40,
    color: '#462917',
    fontSize: 16,
    fontFamily: 'Georgia',
  },
  pickerWrapper: {
    width: '100%',
    backgroundColor: '#FFF1D8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D0D9',
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 180 : 50,
    color: '#462917',
  },
  pickerItem: {
    color: '#462917',
    fontFamily: 'Georgia',
    fontSize:16,
  },
  infoText:{
    color: '#F4E3D7',
    textAlign: 'center',
    fontFamily: 'Georgia',
    marginBottom: 10,
  },
  noteText: {
    color: '#00234B',
    textAlign: 'center',
    fontFamily: 'Georgia',
    fontSize: 12,
    paddingBottom: 10,
  },
  progressBarContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 15,
  },
  progressBarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#555',
    marginHorizontal: 5,
  },
  progressBarDotActive: {
    backgroundColor: '#94C8EF',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    minWidth: 100,
    alignItems: 'center',
    marginHorizontal:5,
  },
  buttonText: {
   color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'sans-serif-medium',
    
  },
  buttonBack: {
    backgroundColor: '#00234B',
    borderWidth: 0.8,
    borderColor: '#FFA500',
  },
  buttonNext: {
    backgroundColor: '#00234B',
    borderWidth: 0.8,
    borderColor: '#FFA500',
  },
  buttonSubmit: {
    backgroundColor: '#00234B',
    borderWidth: 0.8,
    borderColor: "#FFA500",
  },
  buttonActionDisabled: {
    backgroundColor: '#00234B',
    opacity: 0.7,
  },
  buttonClose: {
    backgroundColor: '#8C272F',
    marginTop: 10,
    alignSelf: 'center',
    borderWidth: 0.8,
    borderColor: '#FFA500',
  },
});

export default ProveedorFormModal;