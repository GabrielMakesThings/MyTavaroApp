// Screens/GestionScreen/GestionScreen.tsx
import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  Dimensions, // <-- IMPORTANT: Needed for Dimensions.get('window').width
  Animated,
  Platform,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase'; // Adjust path
import { useUserStore } from '../../utils/useUserStore'; // Adjust path
import LinearGradient from 'react-native-linear-gradient';
import EmpresaFilter from '../ProductScreen/Components/EmpresaFilter'; // Adjust path
import { GlowingInput } from './Components/GlowingInput';
import { BarChart, LineChart } from 'react-native-chart-kit'; // Make sure you have react-native-svg installed too!

// --- LOCALIZED TYPES (for this screen's data) ---
type RootStackParamList = {
  Gestion: undefined;
  ProductDetail: { productId: string };
  HomeScreen: undefined;
  OrderDetail: { orderId: string };
  // Add other navigation types as needed
};

// Type for a simplified order for display in history
export type OrderHistoryItem = {
  id: string;
  created_at: string;
  total_amount: number;
  supplier_name: string; // From join or snap
  item_count: number;
  empresa_id: string;
  status: 'pending' | 'completed' | 'cancelled'; // Example statuses
};

// Type for a product in stock update
export type ProductStockItem = {
  id: string;
  nombre: string;
  current_stock: number;
  min_stock: number;
  isDirty: boolean; // Custom flag for unsaved changes
};

// --- CUSTOM SEGMENTED CONTROL COMPONENT ---
interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onSegmentPress: (index: number) => void;
}

const SegmentedControl = memo(({ segments, selectedIndex, onSegmentPress }: SegmentedControlProps) => {
  return (
    <View style={gestionStyles.segmentedControlContainer}>
      {segments.map((segment, index) => (
        <Pressable
          key={segment}
          style={[
            gestionStyles.segmentedButton,
            selectedIndex === index && gestionStyles.segmentedButtonSelected,
          ]}
          onPress={() => onSegmentPress(index)}
        >
          <Text
            style={[
              gestionStyles.segmentedButtonText,
              selectedIndex === index && gestionStyles.segmentedButtonTextSelected,
            ]}
          >
            {segment}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

// --- SECTION 1: Historial de Pedidos View ---
interface HistorialPedidosViewProps {
  empresaId: string;
}

const HistorialPedidosView = memo(({ empresaId }: HistorialPedidosViewProps) => {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('historial_pedidos')
        .select(`
          id_pedido,
          fecha_pedido,
          estado_pedido,
          total_gasto,
          proveedores (nombre)
        `)
        .eq('empresa_id', empresaId)
        .order('fecha_pedido', { ascending: false });

      if (supabaseError) throw supabaseError;

      const mappedOrders: OrderHistoryItem[] = data ? data.map((order: any) => ({
        id: order.id_pedido,
        created_at: new Date(order.fecha_pedido).toLocaleDateString(),
        total_amount: order.total_gasto || 0,
        supplier_name: order.proveedores ? order.proveedores.nombre : 'Desconocido',
        item_count: 0,
        empresa_id: empresaId,
        status: order.estado_pedido || 'unknown'
      })) : [];

      setOrders(mappedOrders);
    } catch (e: any) {
      console.error("Error fetching orders:", e);
      setError(e.message || "Error al cargar historial de pedidos.");
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresaId) {
      fetchOrders();
    } else {
      setOrders([]);
      setLoading(false);
    }
  }, [empresaId, fetchOrders]);

  const renderOrderItem = ({ item }: { item: OrderHistoryItem }) => (
    <Pressable
      style={gestionStyles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })} // <--- NAVIGATE TO NEW SCREEN HERE
    >
      <View style={gestionStyles.orderCardHeader}>
        <Text style={gestionStyles.orderIdText}>Pedido: {item.id.substring(0, 8)}...</Text>
        <Text style={gestionStyles.orderDateText}>{item.created_at}</Text>
      </View>
      <View style={gestionStyles.orderCardBody}>
        <Text style={gestionStyles.orderDetailText}>Proveedor: {item.supplier_name}</Text>
        {/* <Text style={gestionStyles.orderDetailText}>Cantidad Items: {item.item_count}</Text> */}
      </View>
      <View style={gestionStyles.orderCardFooter}>
        <Text style={gestionStyles.orderTotalText}>Total: €{item.total_amount.toFixed(2)}</Text>
        <Text style={[gestionStyles.orderStatus, gestionStyles[`orderStatus_${item.status}`]]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>
    </Pressable>
  );

  if (loading) return <ActivityIndicator size="large" color="#FFF1D8" style={gestionStyles.sectionLoader} />;
  if (error) return <Text style={gestionStyles.sectionErrorText}>{error}</Text>;
  if (orders.length === 0) return <Text style={gestionStyles.emptySectionText}>No hay pedidos para esta empresa.</Text>;

  return (
    <FlatList
      data={orders}
      renderItem={renderOrderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={gestionStyles.listContentContainer}
    />
  );
});

// --- SECTION 2: Insights View ---
interface InsightsViewProps {
  empresaId: string;
}

const InsightsView = memo(({ empresaId }: InsightsViewProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null); // State to hold actual chart data
  const [totalSpend, setTotalSpend] = useState<string>('0.00'); // State for total spend
  const [avgOrderValue, setAvgOrderValue] = useState<string>('0.00'); // State for average order value

  // Month names for labels
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // This is the correct useEffect for fetching and processing chart data
  useEffect(() => {
    setLoading(true);
    setError(null);
    setChartData(null); // Clear previous chart data when company changes
    setTotalSpend('0.00'); // Reset totals
    setAvgOrderValue('0.00');

    const fetchInsightsData = async () => {
      if (!empresaId) {
        setError("Seleccione una empresa para ver los insights.");
        setLoading(false);
        return;
      }
      try {
        // --- Fetch Orders for Line Chart and Financial Summary ---
        const { data: ordersData, error: ordersError } = await supabase
          .from('historial_pedidos')
          .select('id_pedido, fecha_pedido, total_gasto')
          .eq('empresa_id', empresaId)
          .order('fecha_pedido', { ascending: true }); // Need all relevant orders

        if (ordersError) throw ordersError;

        let calculatedTotalSpend = 0;
        let totalOrders = 0;
        const monthlySalesMap = new Map<string, number>(); // Key: YYYY-MM
        const currentYear = new Date().getFullYear();

        ordersData.forEach(order => {
          const orderDate = new Date(order.fecha_pedido);
          const orderMonth = orderDate.getMonth(); // 0-11
          const orderYear = orderDate.getFullYear();
          const orderTotal = parseFloat(order.total_gasto);

          // Only consider orders from the current year for monthly trends
          if (orderYear === currentYear) {
            const monthKey = `${orderYear}-${String(orderMonth + 1).padStart(2, '0')}`; // "YYYY-MM"
            monthlySalesMap.set(monthKey, (monthlySalesMap.get(monthKey) || 0) + orderTotal);
          }

          calculatedTotalSpend += orderTotal;
          totalOrders++;
        });

        // Prepare data for the Line Chart (last 6 months or all months in current year)
        const lineChartLabels: string[] = [];
        const lineChartData: number[] = [];
         let lastSixMonthsDate = new Date();
         lastSixMonthsDate.setMonth(lastSixMonthsDate.getMonth() - 5); // Start 5 months ago for a 6 month range


         for (let i = 0; i < 6; i++) { // Iterate for last 6 months
             const month = lastSixMonthsDate.getMonth();
             const year = lastSixMonthsDate.getFullYear();
             const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
             lineChartLabels.push(monthNames[month]);
             lineChartData.push(monthlySalesMap.get(monthKey) || 0);
             lastSixMonthsDate.setMonth(lastSixMonthsDate.getMonth() + 1); // Move to next month
         }


        setTotalSpend(calculatedTotalSpend.toFixed(2));
        setAvgOrderValue(totalOrders > 0 ? (calculatedTotalSpend / totalOrders).toFixed(2) : '0.00');

        // --- Fetch Order Items for Bar Chart (Top Products) ---
        const { data: itemData, error: itemError } = await supabase
          .from('historial_pedidos_items')
          .select('nombre_producto, cantidad_pedida')
           // Filter by empresa_id (needs to be joined or passed from main order)
           // If historial_pedidos_items does not have empresa_id, you'd need to join:
           // If historial_pedidos_items can't be directly filtered by empresa_id:
           // You would need a more complex query using RPC or two queries and client-side filtering.
           // For simplicity, let's assume historial_pedidos_items has id_empresa or can be joined.
           // If id_pedido is the FK for historial_pedidos, it has emp_id:
           .in('id_pedido', ordersData.map(o => o.id_pedido)) // Only items from fetched orders
          .order('nombre_producto', { ascending: true }); // Order for consistent grouping

        if (itemError) throw itemError;

        const productQuantitiesMap = new Map<string, number>();
        itemData.forEach(item => {
          productQuantitiesMap.set(item.nombre_producto, (productQuantitiesMap.get(item.nombre_producto) || 0) + item.cantidad_pedida);
        });

        // Convert map to array, sort by quantity, take top 5
        const sortedProducts = Array.from(productQuantitiesMap.entries())
          .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
          .slice(0, 5); // Top 5

        const barChartLabels = sortedProducts.map(([name]) => name);
        const barChartData = sortedProducts.map(([, qty]) => qty);

        setChartData({
            line: { labels: lineChartLabels, datasets: [{ data: lineChartData }] },
            bar: { labels: barChartLabels, datasets: [{ data: barChartData }] }
        });

      } catch (e: any) {
        console.error("Error fetching insights data:", e);
        setError(e.message || "Error al cargar los datos de insights.");
      } finally {
        setLoading(false);
      }
    };

    fetchInsightsData();
  }, [empresaId]); // Dependency on empresaId to re-fetch when chosen company changes

  // Only render loading/error/empty state messages if NO chartData exists yet
  // If chartData is null, it means data hasn't been fetched yet or there was an error.
  if (loading) return <ActivityIndicator size="large" color="#FFF1D8" style={gestionStyles.sectionLoader} />;
  if (error) return <Text style={gestionStyles.sectionErrorText}>{error}</Text>;
  if (!empresaId) return <Text style={gestionStyles.emptySectionText}>Por favor, seleccione una empresa para ver los insights.</Text>;
  // If no chartData but not loading or error, it means the fetch succeeded but returned no data
  if (!chartData || chartData.line.labels.length === 0 || chartData.bar.labels.length === 0) return <Text style={gestionStyles.emptySectionText}>No hay datos de insights disponibles para esta empresa.</Text>;


  return (
    <ScrollView contentContainerStyle={gestionStyles.insightsContainer}>
      <Text style={gestionStyles.insightHeader}>Resumen Financiero</Text>
      <View style={gestionStyles.metricCardContainer}>
        <View style={gestionStyles.metricCard}>
          <Text style={gestionStyles.metricLabel}>Gasto Total</Text>
          <Text style={gestionStyles.metricValue}>€{totalSpend}</Text>
        </View>
        <View style={gestionStyles.metricCard}>
          <Text style={gestionStyles.metricLabel}>Valor Medio Pedido</Text>
          <Text style={gestionStyles.metricValue}>€{avgOrderValue}</Text>
        </View>
      </View>

      <View style={gestionStyles.chartCard}>
        <Text style={gestionStyles.chartTitle}>Pedidos por Mes</Text>
        <LineChart
          data={chartData.line} // Use fetched data
          width={Dimensions.get('window').width - 60} // (Total screen width - horizontal_padding*2)
          height={200}
          chartConfig={{
            backgroundColor: '#00234B',
            backgroundGradientFrom: '#00234B',
            backgroundGradientTo: '#011F41',
            decimalPlaces: 0, // No decimals for quantities/counts
            color: (opacity = 1) => `rgba(148, 200, 239, ${opacity})`, // Your blue accent
            labelColor: (opacity = 1) => `rgba(244, 227, 215, ${opacity})`, // Your text color
            style: { borderRadius: 16 },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: 'rgba(255, 165, 0, 0.8)', // Orange accent
            },
          }}
          bezier // Smooth curve
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>

      <View style={gestionStyles.chartCard}>
        <Text style={gestionStyles.chartTitle}>Top 5 Productos Pedidos</Text>
        <BarChart
          data={chartData.bar} // Use fetched data
          width={Dimensions.get('window').width - 60}
          height={200}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#00234B',
            backgroundGradientFrom: '#00234B',
            backgroundGradientTo: '#011F41',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(148, 200, 239, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(244, 227, 215, ${opacity})`
          }}
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>
    </ScrollView>
  );
});

// --- SECTION 3: Actualizar Stock View ---
interface StockUpdateViewProps {
  empresaId: string;
}

const StockUpdateView = memo(({ empresaId }: StockUpdateViewProps) => {
  const [products, setProducts] = useState<ProductStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProductsForStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('productos')
        .select('id, nombre, stock, stock_minimo')
        .eq('empresa_id', empresaId)
        .order('nombre', { ascending: true });

      if (supabaseError) throw supabaseError;

      const mappedProducts: ProductStockItem[] = data ? data.map(p => ({
        id: p.id,
        nombre: p.nombre,
        current_stock: p.stock ?? 0, // Fallback for null
        min_stock: p.stock_minimo ?? 0, // Fallback for null
        isDirty: false, // Flag for unsaved changes
      })) : [];
      setProducts(mappedProducts);
    } catch (e: any) {
      console.error("Error fetching stock:", e);
      setError(e.message || "Error al cargar el stock.");
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresaId) {
      fetchProductsForStock();
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [empresaId, fetchProductsForStock]);

  const handleStockChange = useCallback((productId: string, newValue: string) => {
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId
          ? { ...p, current_stock: parseInt(newValue) || 0, isDirty: true }
          : p
      )
    );
  }, []);

  const handleSaveAllChanges = useCallback(async () => {
    if (!empresaId) {
      Alert.alert("Error", "Seleccione una empresa para guardar los cambios.");
      return;
    }
    const productsToUpdate = products.filter(p => p.isDirty);
    if (productsToUpdate.length === 0) {
      Alert.alert("Info", "No hay cambios pendientes para guardar.");
      return;
    }

    setIsSaving(true);
    try {
      const updates = productsToUpdate.map(p => ({
        id: p.id,
        nombre: p.nombre, // <--- ADD THIS LINE!
        stock: p.current_stock,
        stock_minimo: p.min_stock,
      }));

      // The rest of your code remains the same
      const { error: supabaseError } = await supabase.from('productos').upsert(updates, { onConflict: 'id' });

      if (supabaseError) throw supabaseError;

      Alert.alert("Éxito", `${productsToUpdate.length} productos actualizados.`);
      // Reset dirty flags
      setProducts(prevProducts => prevProducts.map(p => ({ ...p, isDirty: false })));
      fetchProductsForStock(); // Re-fetch to confirm or get latest
    } catch (e: any) {
      console.error("Error saving stock changes:", e);
      Alert.alert("Error", `No se pudieron guardar los cambios: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [products, empresaId, fetchProductsForStock]);

  const filteredProducts = products.filter(p =>
    p.nombre.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderStockItem = ({ item }: { item: ProductStockItem }) => (
    <View style={gestionStyles.stockItemRow}>
      <View style={gestionStyles.stockItemLeft}>
        <Text style={gestionStyles.productNameText}>{item.nombre}</Text>
        <Text style={gestionStyles.minStockText}>Mín: {item.min_stock}</Text>
      </View>
      <View style={gestionStyles.stockItemRight}>
        <GlowingInput
          value={String(item.current_stock)}
          onChangeText={(text) => handleStockChange(item.id, text)}
          placeholder="Stock"
          keyboardType="numeric"
          style={gestionStyles.stockInput}
          glowColor={item.current_stock < item.min_stock ? '#E74C3C' : '#94C8EF'} // Red glow for low stock
        />
        {item.isDirty && <Text style={gestionStyles.dirtyFlag}>*Modificado</Text>}
        {item.current_stock < item.min_stock && (
          <Text style={gestionStyles.lowStockWarning}>¡Bajo!</Text>
        )}
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#FFF1D8" style={gestionStyles.sectionLoader} />;
  if (error) return <Text style={gestionStyles.sectionErrorText}>{error}</Text>;
  if (!empresaId) return <Text style={gestionStyles.emptySectionText}>Por favor, seleccione una empresa para gestionar el stock.</Text>;


  return (
    <View style={{ flex: 1 }}>
      <TextInput
        style={gestionStyles.searchBar}
        placeholder="Buscar producto..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#00234B"
      />
      {filteredProducts.length === 0 && !searchText && (
        <Text style={gestionStyles.emptySectionText}>No hay productos para esta empresa.</Text>
      )}
      {filteredProducts.length === 0 && searchText && (
        <Text style={gestionStyles.emptySectionText}>No se encontraron productos para "{searchText}".</Text>
      )}
      <FlatList
        data={filteredProducts}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={gestionStyles.listContentContainer}
      />
      {products.some(p => p.isDirty) && (
        <Pressable
          style={[gestionStyles.saveChangesButton, isSaving && gestionStyles.buttonDisabled]}
          onPress={handleSaveAllChanges}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={gestionStyles.saveChangesButtonText}>Guardar Cambios</Text>
          )}
        </Pressable>
      )}
    </View>
  );
});


// --- MAIN GestionScreen COMPONENT ---
const GestionScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const user = useUserStore((state) => state.user);
  const userEmpresas = useUserStore((state) => state.empresas) || [];
  const isFocused = useIsFocused(); // To re-fetch data when screen is focused

  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | undefined>(
    userEmpresas?.length > 0 ? userEmpresas[0].id : undefined
  );
  const [selectedIndex, setSelectedIndex] = useState(0); // 0: Pedidos, 1: Insights, 2: Stock
  const segments = ['Pedidos', 'Insights', 'Stock'];

  // Effect to update selectedEmpresaId if userEmpresas change
  useEffect(() => {
    if (userEmpresas.length > 0) {
      if (!selectedEmpresaId || !userEmpresas.some(emp => emp.id === selectedEmpresaId)) {
        setSelectedEmpresaId(userEmpresas[0].id);
      }
    } else {
      setSelectedEmpresaId(undefined);
    }
  }, [userEmpresas, selectedEmpresaId]);

  const viewOpacity = useRef(new Animated.Value(0)).current;

  // Fade in animation for content when selectedIndex changes
  useEffect(() => {
    viewOpacity.setValue(0); // Reset opacity
    Animated.timing(viewOpacity, {
      toValue: 1,
      duration: 300, // Quick fade
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, viewOpacity, selectedEmpresaId]); // Depend on selectedIndex & empresaId

  const renderContent = useCallback(() => {
    if (!selectedEmpresaId) {
      return (
        <Text style={gestionStyles.emptySectionText}>
          {userEmpresas.length === 0 ? "No tienes empresas asignadas." : "Por favor, selecciona una empresa para ver la gestión."}
        </Text>
      );
    }
    const commonProps = { empresaId: selectedEmpresaId };

    switch (selectedIndex) {
      case 0:
        return <HistorialPedidosView {...commonProps} />;
      case 1:
        return <InsightsView {...commonProps} />;
      case 2:
        return <StockUpdateView {...commonProps} />;
      default:
        return null;
    }
  }, [selectedIndex, selectedEmpresaId, userEmpresas]);


  return (
    <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={gestionStyles.container}>
      <Text style={gestionStyles.pageTitle}>Gestión</Text>

       {/* --- HOME BUTTON START --- */}
              <Pressable
                onPress={() => navigation.navigate('HomeScreen')} // Navigate to your home screen (e.g., RecetasList)
                style={gestionStyles.homeButton}
                accessibilityLabel="Go to Home"
              >
                <Text style={gestionStyles.homeButtonText}>Home</Text>
              </Pressable>
              {/* --- HOME BUTTON END --- */}

      {/* Empresa Filter */}
      <EmpresaFilter
        empresas={userEmpresas}
        selectedEmpresaId={selectedEmpresaId}
        onSelectEmpresa={setSelectedEmpresaId}
      />

      {/* Segmented Control */}
      <SegmentedControl
        segments={segments}
        selectedIndex={selectedIndex}
        onSegmentPress={setSelectedIndex}
      />

      {/* Animated Content Area */}
      <Animated.View style={[gestionStyles.contentContainer, { opacity: viewOpacity }]}>
        {renderContent()}
      </Animated.View>

    </LinearGradient>
  );
};

// --- STYLESHEET (all styles localized here) ---
const gestionStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 32,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#F4E3D7',
    marginTop: 70,
    marginBottom: 20,
    textAlign: 'center',
  },
  // --- Segmented Control Styles ---
  segmentedControlContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 90,
    overflow: 'hidden',
    borderColor: 'rgba(148, 200, 239, 0.3)',
    borderWidth: 1,
    top: 60,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(148, 200, 239, 0.2)',
  },
  segmentedButtonSelected: {
    backgroundColor: 'rgba(148, 200, 239, 0.5)',
    shadowColor: '#94C8EF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  segmentedButtonText: {
    color: '#D4C2B3',
    fontSize: 16,
    fontFamily: 'Georgia',
    fontWeight: '500',
  },
  segmentedButtonTextSelected: {
    color: '#F4E3D7',
    fontWeight: 'bold',
  },
  // --- Content Area ---
  contentContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 20, // Space for potentially fixed buttons at bottom
  },
  sectionLoader: {
    marginTop: 50,
  },
  sectionErrorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    fontFamily: 'Georgia',
  },
  emptySectionText: {
    color: '#B0C4DE',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    fontFamily: 'Georgia',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  // --- Order History Styles ---
  orderCard: {
    backgroundColor: 'rgba(244, 227, 215, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 200, 239, 0.3)',
    shadowColor: '#94C8EF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(244, 227, 215, 0.2)',
    paddingBottom: 5,
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F4E3D7',
    fontFamily: 'Georgia',
  },
  orderDateText: {
    fontSize: 14,
    color: '#D4C2B3',
    fontFamily: 'Georgia',
  },
  orderCardBody: {
    marginBottom: 8,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#B0C4DE',
    fontFamily: 'Georgia',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94C8EF',
    fontFamily: 'Georgia',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  orderStatus_pending: { backgroundColor: '#FFA500', color: '#FFF' },
  orderStatus_completed: { backgroundColor: '#28a745', color: '#FFF' },
  orderStatus_cancelled: { backgroundColor: '#E74C3C', color: '#FFF' },

  // --- Insights Styles ---
  insightsContainer: {
    paddingBottom: 20,
  },
  insightHeader: {
    fontSize: 20,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#E0CDBB',
    marginBottom: 15,
    textAlign: 'center',
  },
  metricCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: 'rgba(148, 200, 239, 0.2)',
    borderRadius: 10,
    padding: 15,
    width: '48%', // Approx half with some space
    alignItems: 'center',
    shadowColor: '#94C8EF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#D4C2B3',
    fontFamily: 'Georgia',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F4E3D7',
    fontFamily: 'Georgia',
  },
  chartCard: {
    backgroundColor: 'rgba(244, 227, 215, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#94C8EF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0CDBB',
    fontFamily: 'Georgia',
    marginBottom: 10,
  },
  chartPlaceholder: {
    height: 180,
    backgroundColor: 'rgba(0, 35, 75, 0.4)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 200, 239, 0.3)',
  },
  chartPlaceholderText: {
    color: '#B0C4DE',
    fontSize: 18,
    fontFamily: 'Georgia',
  },
  chartPlaceholderSmallText: {
    color: '#B0C4DE',
    fontSize: 14,
    fontFamily: 'Georgia',
    marginTop: 5,
  },

  // --- Stock Update Styles ---
  searchBar: {
    fontFamily: 'Georgia',
    height: 40,
    marginVertical: 10,
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
  stockItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 227, 215, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 200, 239, 0.2)',
  },
  stockItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  stockItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productNameText: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#F4E3D7',
    fontWeight: 'bold',
  },
  minStockText: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#D4C2B3',
    marginTop: 3,
  },
  stockInput: {
    width: 80, // Fixed width for stock input
    textAlign: 'center',
    // GlowingInput applies its own styles. This is just for its container.
  },
  lowStockWarning: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#E74C3C',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  dirtyFlag: {

    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#FFA500',
    marginRight: 5,
  },
  saveChangesButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginHorizontal: 15, // To match general screen padding
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  saveChangesButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: '#6c757d',
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

export default GestionScreen;