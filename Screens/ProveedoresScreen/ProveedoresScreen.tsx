// Screens/ProveedoresScreen/ProveedoresScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  Dimensions,
  Platform, // Keep if needed for other platform specific styles/logic
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation, useIsFocused } from '@react-navigation/native';
// import { v4 as uuidv4 } from 'uuid'; // Not needed if Supabase handles ID generation
import { supabase } from '../../utils/supabase';
import RadialButton from '../ProductScreen/Components/RadialProductButton.tsx';
import Cortina from './Components/CortinaProveedorPage';
import EmpresaFilter from '../ProductScreen/Components/EmpresaFilter.tsx';
import LinearGradient from 'react-native-linear-gradient';
import { useUserStore } from '../../utils/useUserStore';

// Import your NEW icons for ProveedoresScreen
import NewItemIcon from './Assets/NewSupplier.svg'; // Ensure you have this or similar
import DefaultSupplierIcon from './Assets/Proveedores.svg'; // Ensure you have this

// Import the new Modal and its data type for Proveedores
import ProveedorFormModal, { ProveedorFormData } from './Components/ProveedorFormModal';

// --- TYPES --- (RootStackParamList, Proveedor type remain the same)
type RootStackParamList = {
  ProveedorDetail: { proveedorId: string; empresaId: string };
   HomeScreen: undefined;
};

export type Proveedor = {
  notas: string | number | null | undefined;
  dias_reparto: string | number | null | undefined;
  canal_pedido: string | number | null | undefined; /* ... your Proveedor type definition ... */
  id: string;
  nombre: string;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  creado_en: string;
  empresa_id: string;
};


const ProveedoresScreen = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredProveedores, setFilteredProveedores] = useState<Proveedor[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const windowWidth = Dimensions.get('window').width;

  const user = useUserStore((state) => state.user);
  const empresas = useUserStore((state) => state.empresas) || [];
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | undefined>(
    empresas.length > 0 ? empresas[0].id : undefined
  );

  useEffect(() => {
    if (empresas.length > 0) {
      const currentSelectionIsValid = empresas.some(emp => emp.id === selectedEmpresaId);
      if (!selectedEmpresaId || !currentSelectionIsValid) {
        setSelectedEmpresaId(empresas[0].id);
      }
    } else {
      setSelectedEmpresaId(undefined);
    }
  }, [empresas, selectedEmpresaId]);

  const loadProveedores = useCallback(async () => {
    // ... (loadProveedores logic remains the same as previously discussed) ...
    if (!user?.id) { setProveedores([]); setLoading(false); return; }
    setLoading(true);
    try {
      const userEmpresaIds = empresas.map(emp => emp.id);
      if (userEmpresaIds.length > 0) {
        const { data, error } = await supabase
          .from('proveedores')
          .select('*')
          .in('empresa_id', userEmpresaIds)
          .order('nombre', { ascending: true });
        if (error) throw error;
        setProveedores(data as Proveedor[] || []);
      } else {
        setProveedores([]);
      }
    } catch (e: any) { Alert.alert('Error', e.message); setProveedores([]);
    } finally { setLoading(false); }
  }, [user?.id, empresas]);

  useEffect(() => {
    if (isFocused) { loadProveedores(); }
  }, [isFocused, loadProveedores]);

  const filterProveedores = useCallback(() => {
    // ... (filterProveedores logic remains the same) ...
    let tempProveedores = proveedores;
    if (selectedEmpresaId) {
      tempProveedores = tempProveedores.filter(prov => prov.empresa_id === selectedEmpresaId);
    } else {
      if (empresas.length > 0) { setFilteredProveedores([]); return;}
    }
    if (searchText.trim() === '') {
      setFilteredProveedores(tempProveedores);
    } else {
      const normalizedSearchText = searchText.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const filtered = tempProveedores.filter(prov => 
        Object.values(prov).some(val => 
          val ? String(val).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedSearchText) : false
        )
      );
      setFilteredProveedores(filtered);
    }
  }, [proveedores, searchText, selectedEmpresaId, empresas]);

  useEffect(() => { filterProveedores(); }, [filterProveedores]);

  const handleAddProveedorSubmit = useCallback(async (formData: ProveedorFormData) => {
    // ... (handleAddProveedorSubmit logic remains the same) ...
    if (!formData.empresa_id) { Alert.alert('Error', 'Debe seleccionar una empresa.'); throw new Error('Empresa no seleccionada'); }
    try {
      const newProveedorData = {
        nombre: formData.nombre,
        contacto_nombre: formData.contacto_nombre || null,
        contacto_telefono: formData.contacto_telefono || null,
        contacto_email: formData.contacto_email || null,
        empresa_id: formData.empresa_id,
      };
      const { error } = await supabase.from('proveedores').insert([newProveedorData]);
      if (error) throw error;
      Alert.alert('Éxito', 'Proveedor agregado.');
      loadProveedores();
    } catch (e: any) { console.error("Error adding proveedor:", e); Alert.alert('Error', e.message); throw e; }
  }, [loadProveedores]);

  const renderItem = useCallback(({ item }: { item: Proveedor }) => (
    <RadialButton
      title={item.nombre}
      icon={DefaultSupplierIcon}
      onPress={() => navigation.navigate('ProveedorDetail', { proveedorId: item.id, empresaId: item.empresa_id })}
    />
  ), [navigation]);

  const gradientColors = ['#00336C', '#00234B', '#011F41'];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Text style={styles.title}>Proveedores</Text>
      <View style={styles.cortinaContainer}><Cortina /></View>
              <Pressable
                onPress={() => navigation.navigate('HomeScreen')} // Navigate to your home screen (e.g., RecetasList)
                style={styles.homeButton}
                accessibilityLabel="Go to Home"
              >
                <Text style={styles.homeButtonText}>Home</Text>
              </Pressable>

      <RadialButton
        title="Agregar Proveedor"
        icon={NewItemIcon}
        isAddProductButton={true}
        onPress={() => setModalVisible(true)}
        style={styles.addproveedorButton}
      />

      <EmpresaFilter
        empresas={empresas}
        selectedEmpresaId={selectedEmpresaId}
        onSelectEmpresa={setSelectedEmpresaId}
      />

      <TextInput
        style={styles.searchBar}
        placeholder="Buscar proveedores..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#00234B"
      />

      <ProveedorFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddProveedorSubmit}
        initialSelectedEmpresaId={selectedEmpresaId}
        empresas={empresas}
      />

      {loading ? (
        <Text style={styles.loadingText}>Cargando proveedores...</Text>
      ) : (
        (empresas.length > 0 && selectedEmpresaId) ? (
          filteredProveedores.length > 0 ? (
            <FlatList
              data={filteredProveedores}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              numColumns={windowWidth < 600 ? 3 : 4}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <Text style={styles.emptyListText}>
              {searchText ? `No se encontraron proveedores para "${searchText}".` : "No hay proveedores para esta empresa."}
            </Text>
          )
        ) : (
          <Text style={styles.disabledText}>
            {empresas.length === 0 ? "No tiene empresas asignadas." : "Por favor, seleccione una empresa."}
          </Text>
        )
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cortinaContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    shadowColor: '#94C8EF',
    shadowOffset: { width: 1, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 8,
  },
  addproveedorButton: {
   position: 'absolute',
    top: 140, // Adjust as needed
    alignSelf: 'center', // Centering button
    zIndex: 10, // Ensure it's above other elements like Cortina potentially
    shadowColor: '#94C8EF',
    shadowOpacity: 0.8, // Make shadow more visible
    shadowRadius: 15, // Adjust radius
    elevation: 10, // For Android shadow
  },
  title: {
    fontSize: 40,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#F4E3D7',
    marginTop: 317,
    textAlign: 'center',
  },
  listContainer: {
    alignItems: 'center',
    paddingBottom: 20, // Ensure space at the bottom of the list
  },
  searchBar: {
    fontFamily: 'Georgia',
    height: 38, 
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10, 
    borderWidth: 1,
    paddingHorizontal: 15,
    backgroundColor: '#FFF1D8',
    color: '#462917',
    borderColor: '#C9D0D9',
    borderRadius: 8, // Rounded corners
    fontSize: 16,
     shadowColor: '#94C8EF',          // Your existing glow color
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,                    // Android shadow
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    color: '#F4E3D7',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#F4E3D7',
  },
  disabledText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#aaa', // A more subdued color for disabled/empty states
    paddingHorizontal: 20,
  },
  // Styles for the main screen's Empresa Picker (if you keep it)
  pickerContainer: {
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#F4E3D7',
    marginBottom: 5,
    fontFamily: 'Georgia',
  },
  empresaPicker: {
    height: 50,
    width: '100%',
    color: Platform.OS === 'android' ? '#333' : '#000', // Picker text color
    backgroundColor: Platform.OS === 'android' ? '#FFF1D8' : undefined, // Background for Android picker
    borderRadius: Platform.OS === 'android' ? 8 : undefined,
  },
  pickerItem: { // For iOS item styling
    // color: '#000', // Example: ensure text is visible
    // backgroundColor: '#FFF1D8', // Example: item background
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

export default ProveedoresScreen;
