// Screens/RecetasScreen/RecetasScreen.tsx
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
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import RadialButton from '../ProductScreen/Components/RadialProductButton.tsx';
import Cortina from './Components/CortinaRecetasPage.tsx';
import EmpresaFilter from '../ProductScreen/Components/EmpresaFilter.tsx'; 
import LinearGradient from 'react-native-linear-gradient';
import { useUserStore } from '../../utils/useUserStore'; 

// --- NEW: Recipe-specific SVG Icons ---
import BarIcon from '../ProductScreen/Assets/Bar.svg';
import CocinaIcon from '../ProductScreen/Assets/Kitchen.svg';
import AddRecetaIcon from '../ProductScreen/Assets/Newproduct.svg'

// <--- NEW: Import RecetaFormModal and its FormData type ---
import RecetaFormModal, { RecetaFormData } from './Components/RecetaFormModal';


// --- RootStackParamList: Updated for RecetaDetail ---
type RootStackParamList = {
  RecetasDetail: { recetaId: string; empresaId: string };
  HomeScreen: undefined // New route for recipe details
  // Add other common routes here if needed for navigation
};

// --- NEW: Receta Type Definition ---
export type Receta = {
  id: string;
  nombre: string;
  descripcion: string | null;
  empresa_id: string;
  activo: boolean;
  precio_total: number | null;
  margen_beneficio: number | null;
  actualizado_en: string | null;
  creado_en: string;
  categoria: string | null;
  cantidad_total: number | null; // This is your yield_quantity
  unidad_de_medida: string | null; // This is your yield_unit
  costo_por_rendimiento: number | null; // <--- RENAMED HERE!
};

export type Ingrediente = {
  id: string;
  receta_id: string;
  producto_id: string | null;       // Now nullable
  receta_ingrediente_id: string | null; // ID of the sub-recipe used as ingredient
  cantidad: number; // Amount of this product/sub-recipe used in the parent recipe
  unidad: string;   // Unit for the amount used in the parent recipe (e.g., 'L' of Simple Syrup)

  productos: {
    nombre: string;
    precio: number;
    unidad: string;
    cantidad_pedido: number;
    cantidad_en_unidad: number | null;
  } | null;
  sub_recetas: {
    nombre: string;
    cantidad_total: number; // The quantity the sub-recipe yields
    unidad_de_medida: string;     // The unit the sub-recipe yields in
    costo_por_rendimiento: number; // <--- RENAMED HERE!
  } | null;
};

const RecetasScreen = () => {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredRecetas, setFilteredRecetas] = useState<Receta[]>([]);
  const [modalVisible, setModalVisible] = useState(false); // To control visibility of the future modal
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

  // --- loadRecetas: Adapted from loadProveedores ---
  const loadRecetas = useCallback(async () => {
    if (!user?.id) {
      setRecetas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const userEmpresaIds = empresas.map(emp => emp.id);
      if (userEmpresaIds.length > 0) {
        const { data, error } = await supabase
          .from('recetas') 
          .select('id, nombre, descripcion, empresa_id, activo, precio_total, margen_beneficio, actualizado_en, creado_en, categoria, cantidad_total, unidad_de_medida') 
          .in('empresa_id', userEmpresaIds)
          .order('nombre', { ascending: true });
        if (error) throw error;
        setRecetas(data as Receta[] || []);
      } else {
        setRecetas([]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setRecetas([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, empresas]);

  useEffect(() => {
    if (isFocused) {
      loadRecetas();
    }
  }, [isFocused, loadRecetas]);

  // --- filterRecetas: Adapted from filterProveedores ---
  const filterRecetas = useCallback(() => {
    let tempRecetas = recetas;
    if (selectedEmpresaId) {
      tempRecetas = tempRecetas.filter(rec => rec.empresa_id === selectedEmpresaId);
    } else {
      if (empresas.length > 0) {
        setFilteredRecetas([]);
        return;
      }
    }
    if (searchText.trim() === '') {
      setFilteredRecetas(tempRecetas);
    } else {
      const normalizedSearchText = searchText.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const filtered = tempRecetas.filter(rec =>
        // Search across relevant string fields of a recipe
        rec.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedSearchText) ||
        (rec.descripcion && rec.descripcion.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedSearchText)) ||
        (rec.categoria && rec.categoria.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedSearchText))
      );
      setFilteredRecetas(filtered);
    }
  }, [recetas, searchText, selectedEmpresaId, empresas]);

  useEffect(() => { filterRecetas(); }, [filterRecetas]);

  // <--- MODIFIED: handleAddRecetaSubmit to use RecetaFormData ---
  const handleAddRecetaSubmit = useCallback(async (formData: RecetaFormData) => {
    if (!formData.empresa_id) { Alert.alert('Error', 'Debe seleccionar una empresa.'); throw new Error('Empresa no seleccionada'); }

    try {
      const newRecetaData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null, // Ensure empty string becomes null
        empresa_id: formData.empresa_id,
        categoria: formData.categoria || null, // Ensure empty string becomes null
        precio_total: formData.precio_total ? parseFloat(formData.precio_total) : null,
        // NEW: Add cantidad_total and unidad_de_medida from form data
        cantidad_total: formData.cantidad_total ? parseFloat(formData.cantidad_total) : null,
        unidad_de_medida: formData.unidad_de_medida || null,
        // margen_beneficio won't be set here, it's calculated on RecetasDetailScreen
      };

      const { error } = await supabase.from('recetas').insert([newRecetaData]);
      if (error) throw error;
      Alert.alert('Éxito', 'Receta agregada.');
      loadRecetas(); // Reload the list
    } catch (e: any) {
      console.error("Error adding receta:", e);
      Alert.alert('Error', e.message);
      throw e; // Re-throw to propagate error to the modal
    }
  }, [loadRecetas]);

  const getCategoryIcon = useCallback((categoria: string) => {
    switch (categoria) {
      case 'Cocina': return CocinaIcon;
      case 'Bar': return BarIcon;
      default: return CocinaIcon;
    }
  }, []);

  // --- renderItem: Adapted for Receta ---
  const renderItem = useCallback(({ item }: { item: Receta }) => (
    <RadialButton
      title={item.nombre}
      icon={getCategoryIcon(item.categoria ?? 'Cocina')} // Pass a default if category is null/undefined
      onPress={() => navigation.navigate('RecetasDetail', { recetaId: item.id, empresaId: item.empresa_id })}
    />
  ),[navigation, getCategoryIcon]);

  const gradientColors = ['#00336C', '#00234B', '#011F41'];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Text style={styles.title}>Recetas</Text>
      <View style={styles.cortinaContainer}><Cortina /></View>

        {/* --- HOME BUTTON START --- */}
              <Pressable
                onPress={() => navigation.navigate('HomeScreen')} // Navigate to your home screen (e.g., RecetasList)
                style={styles.homeButton}
                accessibilityLabel="Go to Home"
              >
                <Text style={styles.homeButtonText}>Home</Text>
              </Pressable>
              {/* --- HOME BUTTON END --- */}

      {/* Add Receta Button */}
      <RadialButton
        title="Agregar Receta" 
        icon={AddRecetaIcon}
        isAddProductButton={true}
        onPress={() => setModalVisible(true)}
        style={styles.addRecetaButton} 
      />

      <EmpresaFilter
        empresas={empresas}
        selectedEmpresaId={selectedEmpresaId}
        onSelectEmpresa={setSelectedEmpresaId}
      />

      <TextInput
        style={styles.searchBar}
        placeholder="Buscar recetas..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#00234B"
      />

      {/* <--- NEW: RecetaFormModal Integration --- */}
        <RecetaFormModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleAddRecetaSubmit}
          initialSelectedEmpresaId={selectedEmpresaId}
          empresas={empresas}
        />
      {/* --- END NEW: RecetaFormModal Integration --- */}

      {loading ? (
        <Text style={styles.loadingText}>Cargando recetas...</Text>
      ) : (
        (empresas.length > 0 && selectedEmpresaId) ? (
          filteredRecetas.length > 0 ? (
            <FlatList
              data={filteredRecetas}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              numColumns={windowWidth < 600 ? 3 : 4}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <Text style={styles.emptyListText}>
              {searchText ? `No se encontraron recetas para "${searchText}".` : "No hay recetas para esta empresa."} 
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
  addRecetaButton: { 
   position: 'absolute',
    top: 140,
    alignSelf: 'center',
    zIndex: 10,
    shadowColor: '#94C8EF',
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 40,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#F4E3D7',
    marginTop: 318,
    textAlign: 'center',
  },
  listContainer: {
    alignItems: 'center',
    paddingBottom: 20,
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
    borderRadius: 8,
    fontSize: 16,
    shadowColor: '#94C8EF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
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
    color: '#aaa',
    paddingHorizontal: 20,
  },
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
    color: Platform.OS === 'android' ? '#333' : '#000',
    backgroundColor: Platform.OS === 'android' ? '#FFF1D8' : undefined,
    borderRadius: Platform.OS === 'android' ? 8 : undefined,
  },
  pickerItem: {},
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

export default RecetasScreen;