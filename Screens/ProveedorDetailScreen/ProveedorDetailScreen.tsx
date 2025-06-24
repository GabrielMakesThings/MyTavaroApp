// Screens/ProveedorDetailScreen/ProveedorDetailScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  Linking,
  Platform,
  // Removed TextInput as it's no longer used for inline editing
} from 'react-native';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { Proveedor } from '../ProveedoresScreen/ProveedoresScreen'; // Import Proveedor type
import LinearGradient from 'react-native-linear-gradient';
// Removed Picker as it's not used directly here anymore

// Import ProveedorFormModal and its FormData type
import ProveedorFormModal, { ProveedorFormData } from '../ProveedoresScreen/Components/ProveedorFormModal.tsx'; // Adjust path as needed

// --- TYPES ---
export type RootStackParamList = {
  ProveedorDetail: { proveedorId: string; empresaId: string };
  ProductDetail: { productId: string };
  HomeScreen: undefined;
};

type ProveedorDetailRouteParams = {
  proveedorId: string;
  empresaId: string;
};
type ProveedorDetailRouteProp = RouteProp<RootStackParamList, 'ProveedorDetail'>;

type SuppliedProductInfo = {
    id: string;
    nombre: string;
};

const ProveedorDetailScreen = () => {
  const route = useRoute<ProveedorDetailRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { proveedorId, empresaId } = route.params;
  const isFocused = useIsFocused();

  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [suppliedProducts, setSuppliedProducts] = useState<SuppliedProductInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [canDeleteProveedor, setCanDeleteProveedor] = useState(false);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const fetchProveedorDetails = useCallback(async () => {
    if (!proveedorId) {
      setFetchError("ID de proveedor no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setProveedor(null);
    setSuppliedProducts([]);
    setCanDeleteProveedor(false);

    try {
      const { data: proveedorData, error: proveedorError } = await supabase
        .from('proveedores')
        .select('*')
        .eq('id', proveedorId)
        .single();

      if (proveedorError) throw proveedorError;
      if (!proveedorData) throw new Error('Proveedor no encontrado.');
      setProveedor(proveedorData as Proveedor);

      setLoadingProducts(true);
      const { data: productsForDisplay, error: productsDisplayError } = await supabase
          .from('productos')
          .select('id, nombre')
          .eq('proveedor', proveedorId)
          .eq('empresa_id', empresaId);

      if (productsDisplayError) {
          console.warn("Error fetching supplied products for display:", productsDisplayError.message);
          setSuppliedProducts([]);
      } else if (productsForDisplay) {
          setSuppliedProducts(productsForDisplay as SuppliedProductInfo[]);
      }
      setLoadingProducts(false);

      const { count: totalProductCount, error: countError } = await supabase
          .from('productos')
          .select('id', { count: 'exact', head: true })
          .eq('proveedor', proveedorId);

      if (countError) {
          console.warn("Error counting total products for supplier:", countError.message);
          setCanDeleteProveedor(false);
      } else {
          setCanDeleteProveedor(totalProductCount === 0);
      }

    } catch (e: any) {
      console.error("Error during fetch:", e.message);
      setFetchError(e.message || 'Error al cargar el proveedor.');
    } finally {
      setLoading(false);
    }
  }, [proveedorId, empresaId]);

  useEffect(() => {
    if (isFocused) {
      fetchProveedorDetails();
    }
  }, [isFocused, proveedorId, empresaId, fetchProveedorDetails]);

  const handleUpdateProveedor = useCallback(async (formData: ProveedorFormData, isEditing: boolean, proveedorIdToUpdate?: string) => {
    if (!proveedorIdToUpdate) {
        Alert.alert('Error', 'ID de proveedor no proporcionado para la actualización.');
        throw new Error('ID de proveedor missing.');
    }
    
    const updateData = {
        nombre: formData.nombre,
        contacto_nombre: formData.contacto_nombre || null,
        contacto_telefono: formData.contacto_telefono || null,
        contacto_email: formData.contacto_email || null,
        canal_pedido: formData.canal_pedido || null,
    };

    try {
      const { error } = await supabase
        .from('proveedores')
        .update(updateData)
        .eq('id', proveedorIdToUpdate);

      if (error) {
        throw error;
      }
      Alert.alert('Éxito', 'Proveedor actualizado correctamente.');
      fetchProveedorDetails();
      return Promise.resolve();
    } catch (e: any) {
      console.error("Error updating provider:", e.message);
      Alert.alert('Error', `No se pudo actualizar el proveedor: ${e.message}`);
      return Promise.reject(e);
    }
  }, [fetchProveedorDetails]);


  const handleDeleteProveedor = async () => {
    if (!proveedor) return;
    
    if (!canDeleteProveedor) {
        Alert.alert("Acción Bloqueada", "Este proveedor tiene productos asociados y no puede ser eliminado.");
        return;
    }

    Alert.alert(
      "Confirmar Eliminación",
      `¿Está seguro de que desea eliminar al proveedor "${proveedor.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar", style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('proveedores')
                .delete()
                .eq('id', proveedor.id);
              if (error) throw error;
              Alert.alert('Éxito', 'Proveedor eliminado correctamente.');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', `No se pudo eliminar el proveedor: ${e.message}`);
            }
          },
        },
      ]
    );
  };

  const handleEditProveedor = () => {
    setIsEditModalVisible(true);
  };

  if (loading) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
        <ActivityIndicator size="large" color="#FFF1D7" />
        <Text style={styles.loadingText}>Cargando proveedor...</Text>
      </LinearGradient>
    );
  }

  if (fetchError) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
        <Text style={styles.errorText}>{fetchError}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.button}><Text style={styles.buttonText}>Volver</Text></Pressable>
      </LinearGradient>
    );
  }

  if (!proveedor) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
        <Text style={styles.errorText}>Proveedor no disponible.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.button}><Text style={styles.buttonText}>Volver</Text></Pressable>
      </LinearGradient>
    );
  }

  const DetailItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <View style={styles.detailItemContainer}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value ? String(value) : 'N/A'}</Text>
    </View>
  );

  return (
  <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.container}>
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>{proveedor.nombre}</Text>

        {/* --- HOME BUTTON START --- */}
              <Pressable
                onPress={() => navigation.navigate('HomeScreen')}
                style={styles.homeButton}
                accessibilityLabel="Go to Home"
              >
                <Text style={styles.homeButtonText}>Home</Text>
              </Pressable>
              {/* --- HOME BUTTON END --- */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de Contacto</Text>
        <DetailItem label="Nombre Contacto" value={proveedor.contacto_nombre} />
        <DetailItem label="Teléfono Contacto" value={proveedor.contacto_telefono} />
        <DetailItem label="Email Contacto" value={proveedor.contacto_email} />
        <DetailItem label="Canal de Pedido" value={proveedor.canal_pedido} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Productos Suministrados</Text>

        {loadingProducts ? (
          <ActivityIndicator color="#FFF1D8" size="small" style={{ marginVertical: 10 }} />
        ) : suppliedProducts.length === 0 ? (
          <Text style={styles.infoText}>Este proveedor no tiene productos registrados para esta empresa.</Text>
        ) : (
          suppliedProducts.map(prod => (
            <Pressable
              key={prod.id}
              style={styles.linkedItem}
              onPress={() => navigation.navigate('ProductDetail', { productId: prod.id })}
            >
              <Text style={styles.linkedItemText}>{prod.nombre}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Otros Datos</Text>
        <DetailItem label="Días de Reparto" value={proveedor.dias_reparto} />
        <DetailItem label="Notas" value={proveedor.notas} />
        <DetailItem label="Registrado el" value={new Date(proveedor.creado_en).toLocaleDateString()} />
      </View>

      <View style={styles.actionsContainer}>
        {/* Style applied directly to the button */}
        <Pressable 
          style={[styles.button, styles.editButton, {marginBottom: 10}]} 
          onPress={handleEditProveedor}>
          <Text style={styles.buttonText}>Editar Proveedor</Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.deleteButton,
            (!canDeleteProveedor || loadingProducts) ? styles.buttonDisabled : null
          ]}
          onPress={handleDeleteProveedor}
          disabled={!canDeleteProveedor || loadingProducts || loading}
        >
          <Text style={styles.buttonText}>Eliminar Proveedor</Text>
        </Pressable>
      </View>
    </ScrollView>

    {proveedor && (
      <ProveedorFormModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSubmit={handleUpdateProveedor}
        initialData={proveedor}
        empresas={[]} // IMPORTANT: Pass the actual list of companies from useUserStore here if needed for selection
                      // The current modal disables Empresa picker in edit mode, so empty array might be fine.
                      // If you want to allow changing company, you need to provide that data.
        initialSelectedEmpresaId={proveedor.empresa_id}
      />
    )}
  </LinearGradient>
);
};
const styles = StyleSheet.create({

  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    },
  container: { 
    flex: 1, 
    },
  scrollContainer: { 
    padding: 20, 
    paddingBottom: 50, 
    },

  title: {
  top: 50,
  fontSize: 32, 
  fontFamily: 'Georgia', 
  fontWeight: 'bold', 
  color: '#F4E3D7',
  marginBottom: 75,
  textAlign: 'center',
  },

  section: { backgroundColor: 'rgba(244, 227, 215, 0.1)', borderRadius: 8, padding: 15, marginBottom: 20, },
  sectionTitle: { fontSize: 20, fontFamily: 'Georgia', fontWeight: '600', color: '#E0CDBB', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(244, 227, 215, 0.3)', paddingBottom: 5, },
  detailItemContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingVertical: 4, },
  detailLabel: { fontSize: 16, fontFamily: 'Georgia', color: '#D4C2B3', fontWeight: '500', flexShrink: 1, marginRight: 10, },
  detailValue: { fontSize: 16, fontFamily: 'Georgia', color: '#F4E3D7', textAlign: 'right', flexGrow: 1, },
  infoText: { 
      color: '#B0C4DE',
      fontFamily: 'Georgia',
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 10,
  },
  linkedItem: { 
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 200, 239, 0.1)',
  },
  linkedItemText: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#94C8EF', 
  },
   buttonDisabled: { 
    backgroundColor: '#6c757d',
    opacity: 0.7,
   },
  actionsContainer: { 
    marginTop: 20, 
    flexDirection: 'column', // Changed to column for vertical stacking
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center buttons horizontally
  },
  button: { 
    paddingVertical: 12, 
    paddingHorizontal: 25, 
    borderRadius: 8, 
    alignItems: 'center', 
    minWidth: 120, 
    shadowColor: '#94C8EF', 
    shadowOffset: { 
        width: 0, 
        height: 2 }, 
    shadowOpacity: 0.6, 
    shadowRadius: 4, 
    elevation: 5, 
    },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontFamily: 'Georgia', 
    fontWeight: 'bold', 
    },
  editButton: { 
    backgroundColor: '#FFA500', 
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
    top: Platform.OS === 'ios' ? 50 : 20, 
    left: 20,
    zIndex: 10, 
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(131, 210, 229, 0.2)', 
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

export default ProveedorDetailScreen;