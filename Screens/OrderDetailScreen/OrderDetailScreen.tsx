// Screens/GestionScreen/OrderDetailScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
  type ViewStyle, // Import these types for more specific checking
  type TextStyle, // Import these types for more specific checking
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import LinearGradient from 'react-native-linear-gradient';

// --- Define Types for this Screen ---
type RootStackParamList = {
  Gestion: undefined;
  OrderDetail: { orderId: string };
};

type OrderDetailRouteParams = {
  orderId: string;
};
type OrderDetailRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;

export type FullOrderDetails = {
  id_pedido: string;
  fecha_pedido: string;
  estado_pedido: string;
  total_gasto: number;
  proveedores: {
    id: string;
    nombre: string;
  } | null;
  historial_pedidos_items: Array<{
    id_item_pedido: string;
    id_pedido: string;
    id_usuario: string;
    id_empresa: string;
    id_producto_original: string | null;
    nombre_producto: string;
    descripcion_producto: string | null;
    precio_unitario_base_snap: number;
    iva_tipo_snap: number | null;
    categoria_snap: string | null;
    unidad_snap: string;
    stock_minimo_snap: number | null;
    id_proveedor_original: string | null;
    nombre_proveedor_snap: string | null;
    cantidad_pedida: number;

  }>;
};

const OrderDetailScreen = () => {
  const route = useRoute<OrderDetailRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { orderId } = route.params;

  const [orderDetails, setOrderDetails] = useState<FullOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: orderError } = await supabase
        .from('historial_pedidos')
        .select(`
          id_pedido,
          fecha_pedido,
          estado_pedido,
          total_gasto,
          proveedor_id,
          historial_pedidos_items (
            id_item_pedido,
            id_pedido,
            id_usuario,
            id_empresa,
            id_producto_original,
            nombre_producto,
            descripcion_producto,
            precio_unitario_base_snap,
            iva_tipo_snap,
            categoria_snap,
            unidad_snap,
            stock_minimo_snap,
            id_proveedor_original,
            nombre_proveedor_snap,
            cantidad_pedida
          )
        `)
        .eq('id_pedido', orderId)
        .single();

      if (orderError) {
        if (orderError.code === 'PGRST116') {
          throw new Error('Pedido no encontrado.');
        }
        throw orderError;
      }

      if (!data) {
        throw new Error('No se encontraron detalles para este pedido.');
      }

      const mappedData: FullOrderDetails = {
        ...data,
        proveedores: null, // or map to an object if you fetch proveedor details
        historial_pedidos_items: Array.isArray(data.historial_pedidos_items) ? data.historial_pedidos_items : []
      };

      setOrderDetails(mappedData);

    } catch (e: any) {
      console.error("Error fetching order details:", e.message);
      setError(e.message || "Error al cargar los detalles del pedido.");
      setOrderDetails(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  if (loading) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
        <ActivityIndicator size="large" color="#F4E3D7" />
        <Text style={styles.loadingText}>Cargando detalles del pedido...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
        <Text style={styles.errorText}>Ha ocurrido un error: {error}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Volver</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  if (!orderDetails) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
        <Text style={styles.errorText}>Detalles del pedido no disponibles.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Volver</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const orderDate = new Date(orderDetails.fecha_pedido).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'< Volver'}</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Detalles del Pedido</Text>
        <Text style={styles.orderId}>ID: {orderDetails.id_pedido.substring(0, 8)}...</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fecha:</Text>
            <Text style={styles.summaryValue}>{orderDate}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estado:</Text>
            {/* THIS IS THE LINE THAT CAUSES THE ERROR */}
            <Text style={[
              styles.summaryValue,
              // Use Type Assertion: This tells TypeScript that 'status_completed' etc.
              // will exist. Combine with satisfies in Stylesheet for best practice.
              styles[`status_${orderDetails.estado_pedido}` as keyof typeof styles]
            ]}>
              {orderDetails.estado_pedido.charAt(0).toUpperCase() + orderDetails.estado_pedido.slice(1)}
            </Text>
          </View>
          {orderDetails.proveedores && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Proveedor:</Text>
              <Text style={styles.summaryValue}>{orderDetails.proveedores.nombre}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total del Pedido:</Text>
            <Text style={styles.totalValue}>€{orderDetails.total_gasto.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.itemsHeader}>Productos Pedidos</Text>
        {orderDetails.historial_pedidos_items.length === 0 ? (
          <Text style={styles.emptyItemsText}>No hay productos en este pedido.</Text>
        ) : (
          <View style={styles.itemsList}>
            {orderDetails.historial_pedidos_items.map((item, index) => (
              <View key={item.id_item_pedido || index} style={styles.itemCard}>
                <Text style={styles.itemName}>{item.nombre_producto}</Text>
                {item.descripcion_producto && (
                  <Text style={styles.itemDescription}>{item.descripcion_producto}</Text>
                )}
                <View style={styles.itemDetailsRow}>
                  <Text style={styles.itemDetail}>Cantidad: {item.cantidad_pedida} {item.unidad_snap}</Text>
                  <Text style={styles.itemDetail}>Precio Ud: €{item.precio_unitario_base_snap.toFixed(2)}</Text>
                </View>
                {item.iva_tipo_snap !== null && (
                  <Text style={styles.itemDetail}>IVA: {item.iva_tipo_snap}%</Text>
                )}
                {item.categoria_snap && (
                  <Text style={styles.itemDetail}>Categoría: {item.categoria_snap}</Text>
                )}
                {item.nombre_proveedor_snap && (
                  <Text style={styles.itemDetail}>Proveedor Item: {item.nombre_proveedor_snap}</Text>
                )}
                <Text style={styles.itemTotalPrice}>
                  Subtotal: €{(item.cantidad_pedida * item.precio_unitario_base_snap).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </LinearGradient>
  );
};

// --- StyleSheet for OrderDetailScreen ---
// Define a type for your specific status styles
type OrderStatusKeys = 'completed' | 'pending' | 'cancelled' | 'received'; // Add all possible status strings here
type StatusStyles = {
  [K in `status_${OrderStatusKeys}`]: TextStyle;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 70 : 40,
        paddingBottom: 40,
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
    button: {
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        backgroundColor: '#94C8EF',
        marginTop: 20,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 20,
        zIndex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(131, 210, 229, 0.2)',
        borderColor: 'rgba(131, 210, 229, 0.4)',
        borderWidth: 1,
    },
    backButtonText: {
        color: '#F4E3D7',
        fontSize: 16,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        color: '#F4E3D7',
        textAlign: 'center',
        marginBottom: 10,
        marginTop: 20,
    },
    orderId: {
        fontSize: 16,
        fontFamily: 'Georgia',
        color: '#D4C2B3',
        textAlign: 'center',
        marginBottom: 20,
    },
    summaryCard: {
        backgroundColor: 'rgba(148, 200, 239, 0.1)',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(148, 200, 239, 0.3)',
        shadowColor: '#83D2E5',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingBottom: 5,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(244, 227, 215, 0.1)',
    },
    summaryLabel: {
        fontSize: 16,
        fontFamily: 'Georgia',
        color: '#D4C2B3',
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 16,
        fontFamily: 'Georgia',
        color: '#F4E3D7',
        textAlign: 'right',
        flexShrink: 1,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(244, 227, 215, 0.2)',
    },
    totalLabel: {
        fontSize: 20,
        fontFamily: 'Georgia',
        color: '#E0CDBB',
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 20,
        fontFamily: 'Georgia',
        color: '#94C8EF',
        fontWeight: 'bold',
    },
    itemsHeader: {
        fontSize: 22,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        color: '#E0CDBB',
        marginBottom: 15,
        marginTop: 10,
        textAlign: 'center',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244, 227, 215, 0.2)',
    },
    itemsList: {
        // This view simply wraps the item cards
    },
    itemCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(148, 200, 239, 0.2)',
    },
    itemName: {
        fontSize: 18,
        fontFamily: 'Georgia',
        color: '#F4E3D7',
        fontWeight: 'bold',
        marginBottom: 5,
    },
    itemDescription: {
        fontSize: 14,
        fontFamily: 'Georgia',
        color: '#B0C4DE',
        marginBottom: 5,
    },
    itemDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    itemDetail: {
        fontSize: 14,
        fontFamily: 'Georgia',
        color: '#D4C2B3',
    },
    itemTotalPrice: {
        fontSize: 16,
        fontFamily: 'Georgia',
        color: '#94C8EF',
        fontWeight: 'bold',
        textAlign: 'right',
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(244, 227, 215, 0.1)',
    },
    emptyItemsText: {
        fontSize: 16,
        fontFamily: 'Georgia',
        color: '#D4C2B3',
        textAlign: 'center',
        marginTop: 20,
    },
    status_completed: {},
    status_pending: {},
    status_cancelled: {},
    status_received: {}
} satisfies StyleSheet.NamedStyles<any> & StatusStyles); // <--- HERE IS THE FIX

export default OrderDetailScreen;