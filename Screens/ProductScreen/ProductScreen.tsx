// ProductScreen.tsx
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../utils/supabase'; // Ensure this path is correct
import RadialProductButton from './Components/RadialProductButton';
import Cortina from './Components/CortinaProductosPage';
import EmpresaFilter from './Components/EmpresaFilter';
import LinearGradient from 'react-native-linear-gradient';
// import { Picker } from '@react-native-picker/picker'; // No longer needed here, so commented out/removed
import { useUserStore } from '../../utils/useUserStore'; // Ensure this path is correct
import Share from 'react-native-share';
import RNFS from 'react-native-fs'; // For saving temporarily if needed
import Papa, { ParseResult, ParseError, ParseConfig } from 'papaparse';
import DocumentPicker, { types } from 'react-native-document-picker';
// Import your icons SVG
import Kitchen from './Assets/Kitchen.svg';
import Bar from './Assets/Bar.svg';
import Coffee from './Assets/Coffee.svg';
import Clean from './Assets/Clean.svg';
import Newproduct from './Assets/Newproduct.svg';
import plantilla from './Assets/Plantilla.svg';
import importcsv from './Assets/Importcsv.svg';

// Import the new Modal and its data type
import ProductFormModal, { ProductFormData } from './Components/ProductFormModal'; // Adjust path if necessary

// Define los tipos para la navegación y el producto
type RootStackParamList = {
  ProductDetail: { productId: string };
  HomeScreen: undefined; // Assuming you have a HomeScreen
};

// Product type remains the same
export type Product = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  iva_tipo: number | null;
  categoria: string;
  stock: number | null;
  proveedor: string; // This is proveedor_id
  proveedores: { // This will hold the related object from the 'proveedores' table
    nombre: string;
    // You can include other fields from the proveedores table here if needed, e.g., id
  } | null;
  creado_en: string;
  empresa_id: string;
  unidad: string | null;
  stock_minimo: number;
  activo: boolean;
  cantidad_pedido: number | null; // Assuming this is a field in your product table
  cantidad_en_unidad?: number | null;// Optional, if you have this field
};

// --- NEW HELPER FUNCTION FOR DECIMAL NORMALIZATION ---
/**
 * Normalizes a string containing a number by replacing a comma decimal separator with a dot.
 * This is crucial before parsing with parseFloat/parseInt in JavaScript.
 * @param text The input string (e.g., "1,5" or "1.5")
 * @returns A string with a dot as the decimal separator (e.g., "1.5")
 */
const normalizeDecimalInput = (text: string | undefined | null): string => {
  if (text === null || typeof text === 'undefined' || text.trim() === '') return '';
  return text.trim().replace(',', '.'); // Replace comma with dot for internal parsing
};
// --- END HELPER FUNCTION ---

const ProductScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [modalVisible, setModalVisible] = useState(false); // This state controls the new modal
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const windowWidth = Dimensions.get('window').width;

  const user = useUserStore((state) => state.user);
  const empresas = useUserStore((state) => state.empresas) || []; // Ensure empresas is always an array

  // selectedEmpresaId is for filtering and initial value for modal
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | undefined>(
    empresas && empresas.length > 0 ? empresas[0].id : undefined
  );

  // Effect to update selectedEmpresaId if empresas list changes (e.g., on initial load)
  useEffect(() => {
    // console.log('NEW selectedEmpresaId:', selectedEmpresaId) // Log removed for cleanliness
    if (!selectedEmpresaId && empresas && empresas.length > 0) {
      setSelectedEmpresaId(empresas[0].id);
    }
  }, [empresas, selectedEmpresaId]);

const getCSVTemplateString = () => {
  const headers = [
    "nombre", "descripcion", "precio", "iva_tipo", "categoria",
    "stock", "unidad", "stock_minimo", "proveedorNombre", "cantidad_pedido", "cantidad_en_unidad"
  ].join(',');

  const exampleRow = [
    "Coca-Cola", "Refresco de cola", "0.78", "21", "Bar",
    "100", "unidad", "10", "Distribuciones XYZ", "24", "1"
  ].join(',');

  return `${headers}\n${exampleRow}\n`; // Header row, example row
};
const handleDownloadTemplate = async () => {
  const csvString = getCSVTemplateString();
  const fileName = 'plantilla_productos.csv';
  const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`; // Temporary path

  try {
    await RNFS.writeFile(filePath, csvString, 'utf8');
    const shareOptions = {
      title: 'Descargar Plantilla de Productos',
      url: `file://${filePath}`, // Important: URI for the local file
      type: 'text/csv', // MIME type
      failOnCancel: false,
    };
    await Share.open(shareOptions);
  } catch (error) {
    console.error('Error sharing CSV template:', error);
    Alert.alert('Error', 'No se pudo generar la plantilla.');
  }
};

const handleUploadCSV = async () => {
  if (!selectedEmpresaId) { // Ensure an empresa is selected in your app
    Alert.alert("Error", "Por favor, seleccione una empresa primero.");
    return;
  }

  try {
    const pickerResult = await DocumentPicker.pickSingle({
      type: [types.csv, 'text/comma-separated-values'], // Allow CSV files
      copyTo: 'cachesDirectory', // Important for react-native-fs to access
    });

    if (!pickerResult.fileCopyUri) {
        Alert.alert("Error", "No se pudo acceder al archivo seleccionado.");
        return;
    }
    // pickerResult.uri is the original, pickerResult.fileCopyUri is the accessible one
    const fileUri = Platform.OS === 'ios' ? pickerResult.uri : pickerResult.fileCopyUri;


    const fileContent = await RNFS.readFile(fileUri, 'utf8');
    parseAndProcessCSV(fileContent, selectedEmpresaId);

  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      console.log('User cancelled the picker');
    } else {
      console.error('Error picking or reading file:', err);
      Alert.alert('Error', 'No se pudo leer el archivo CSV.');
    }
  }
};

const parseAndProcessCSV = (csvString: string, currentEmpresaId: string) => {
  console.log("Attempting to parse CSV string:", csvString.substring(0, 100));
  console.log("For empresa ID:", currentEmpresaId);

  const config: ParseConfig<any> = { // Or ParseConfig<CSVProductRow> if you define that type
    header: true,
    skipEmptyLines: true,
    complete: (results: ParseResult<any>) => { // This callback will be called by Papa.parse
      (async () => {
        // console.log("IIFE: Complete callback executing"); // Log removed for cleanliness
        const data = results.data;
        const parseErrors = results.errors;

        if (parseErrors && parseErrors.length > 0) {
          let errorMessages = "El archivo CSV tiene errores de formato:\n";
          parseErrors.forEach(err => {
            errorMessages += `- Fila ${err.row !== undefined ? err.row + 1 : 'desconocida'}: ${err.message} (Código: ${err.code})\n`;
            console.error(`IIFE: CSV Parsing Error (Row ${err.row !== undefined ? err.row + 1 : 'unknown'}): ${err.message} (Code: ${err.code})`, err);
          });
          Alert.alert("Error de Formato CSV", errorMessages.substring(0, 500));
          return;
        }

        if (!data || data.length === 0) {
          Alert.alert("Información", "IIFE: No se encontraron datos en el CSV para procesar.");
          return;
        }

        // console.log("IIFE: Data found, calling batchImportProducts"); // Log removed for cleanliness
        await batchImportProducts(data, currentEmpresaId);
        // console.log("IIFE: batchImportProducts finished"); // Log removed for cleanliness

      })().catch(iifeError => {
        console.error("Error within IIFE in 'complete' callback:", iifeError);
        Alert.alert("Error de Procesamiento", "Ocurrió un error interno al procesar los datos.");
      });
    }
    // No top-level 'error' callback here, as we resolved that error.
  };

  try {
    // When 'complete' is provided for string input, Papa.parse calls it and
    // also returns the results. The 'complete' callback is the primary handler.
    const results = Papa.parse(csvString, config);

    // Optional: You can inspect 'results' here as well, but 'complete' should have handled it.
    // This can be useful for debugging or if 'complete' wasn't guaranteed to be called
    // in some edge case (though it should be with string input).
    if (results.errors && results.errors.length > 0) {
      console.warn("Papa.parse also returned errors synchronously:", results.errors);
      // Decide if you need to alert again here, or if the 'complete' callback's alert is sufficient.
      // Generally, the 'complete' callback is the main place to handle results.data and results.errors.
    }
    console.log("Papa.parse call finished synchronously.");

  } catch (e: any) {
    // This catch handles truly catastrophic errors if Papa.parse itself throws.
    console.error("CRITICAL ERROR directly from Papa.parse call:", e);
    Alert.alert("Error Crítico de Parseo", `Un error fatal ocurrió durante el parseo: ${e.message}`);
  }
};

interface CSVProductRow {
  nombre: string;
  descripcion?: string;
  precio: string; // PapaParse will give strings initially
  iva_tipo?: string;
  categoria: string;
  stock?: string;
  unidad?: string;
  stock_minimo?: string;
  proveedorNombre: string;
  cantidad_pedido?: string;
  cantidad_en_unidad?: string; // --- MODIFIED: Changed from number to string because PapaParse reads it as string
  [key: string]: any; // To allow other potential columns
}

const batchImportProducts = async (
  parsedProducts: any[], // Or a more specific type like YourCSVRowType[]
  currentEmpresaId: string
) => {
  setLoading(true); // Show some loading indicator
  const productsToInsert = [];
  const importErrors = [];

  for (let i = 0; i < parsedProducts.length; i++) {
    const row: CSVProductRow = parsedProducts[i]; // Cast to CSVProductRow for better type inference
    const rowIndex = i + 2; // +1 for 0-index, +1 for header row

    // --- Basic Validation ---
    if (!row.nombre || !row.precio || !row.categoria || !row.proveedorNombre) {
      importErrors.push(`Fila ${rowIndex}: Faltan campos obligatorios (nombre, precio, categoria, proveedorNombre).`);
      continue;
    }

    // --- BEGIN MODIFICATIONS FOR NUMERIC PARSING WITH NORMALIZATION ---
    // Price: Use parseFloat as it can be decimal
    const rawPrecio = normalizeDecimalInput(row.precio);
    const precio = parseFloat(rawPrecio);
    if (isNaN(precio)) {
      importErrors.push(`Fila ${rowIndex}: Precio inválido '${row.precio}'.`);
      continue;
    }

    // IVA Type: Use parseFloat as it can be decimal (e.g., 21.5% if applicable)
    const rawIvaTipo = normalizeDecimalInput(row.iva_tipo);
    const iva_tipo = row.iva_tipo ? parseFloat(rawIvaTipo) : null;
    if (row.iva_tipo && iva_tipo !== null && isNaN(iva_tipo)) {
      importErrors.push(`Fila ${rowIndex}: Tipo de IVA inválido '${row.iva_tipo}'.`);
      continue;
    }

    // Stock: Use parseInt as it's typically a whole number quantity
    const rawStock = normalizeDecimalInput(row.stock);
    const stock = row.stock ? parseInt(rawStock, 10) : null;
    if (row.stock && stock !== null && isNaN(stock)) {
      importErrors.push(`Fila ${rowIndex}: Stock inválido '${row.stock}'.`);
      continue;
    }
    // Minimum Stock: Use parseInt
    const rawStockMinimo = normalizeDecimalInput(row.stock_minimo);
    const stock_minimo = row.stock_minimo ? parseInt(rawStockMinimo, 10) : 0;
    if (row.stock_minimo && isNaN(stock_minimo)) {
        importErrors.push(`Fila ${rowIndex}: Stock Mínimo inválido '${row.stock_minimo}'.`);
        continue;
    }

    // Quantity per Order/Package: Use parseInt
    const rawCantidadPedido = normalizeDecimalInput(row.cantidad_pedido);
    const cantidad_pedido = row.cantidad_pedido ? parseInt(rawCantidadPedido, 10) : null;
    if (row.cantidad_pedido && (cantidad_pedido === null || isNaN(cantidad_pedido))) {
        importErrors.push(`Fila ${rowIndex}: Cantidad en pedido inválida '${row.cantidad_pedido}'.`);
        continue;
    }

    // Quantity in Unit: Use parseFloat as it can be decimal (e.g., 0.7 L)
    const rawCantidadEnUnidad = normalizeDecimalInput(row.cantidad_en_unidad);
    const cantidad_en_unidad = row.cantidad_en_unidad ? parseFloat(rawCantidadEnUnidad) : null;
    if (row.cantidad_en_unidad && cantidad_en_unidad !== null && isNaN(cantidad_en_unidad)) {
        importErrors.push(`Fila ${rowIndex}: Cantidad en unidad inválida '${row.cantidad_en_unidad}'.`);
        continue;
    }
    // --- END MODIFICATIONS FOR NUMERIC PARSING ---


    // --- Handle Provider (similar to your single add product logic) ---
    let proveedorId;
    try {
      const { data: existingProveedor, error: provError } = await supabase
        .from('proveedores')
        .select('id')
        .eq('nombre', row.proveedorNombre.trim())
        .eq('empresa_id', currentEmpresaId)
        .single();

      if (provError && provError.code !== 'PGRST116') throw provError; // PGRST116: 0 rows

      if (existingProveedor) {
        proveedorId = existingProveedor.id;
      } else {
        const { data: newProv, error: createProvError } = await supabase
          .from('proveedores')
          .insert([{ nombre: row.proveedorNombre.trim(), empresa_id: currentEmpresaId }])
          .select('id')
          .single();
        if (createProvError || !newProv) throw createProvError || new Error("No se pudo crear proveedor.");
        proveedorId = newProv.id;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      importErrors.push(`Fila ${rowIndex}: Error con proveedor '${row.proveedorNombre}': ${errorMessage}`);
      continue;
    }

    productsToInsert.push({
      // id: uuidv4(), // Supabase can auto-generate if not provided and column is PK
      nombre: row.nombre.trim(),
      descripcion: row.descripcion?.trim() || null,
      precio: precio, // <--- Use the parsed number
      iva_tipo: iva_tipo, // <--- Use the parsed number
      categoria: row.categoria.trim(),
      proveedor: proveedorId,
      empresa_id: currentEmpresaId,
      stock: stock, // <--- Use the parsed number
      unidad: row.unidad?.trim() || null,
      cantidad_pedido: cantidad_pedido, // <--- Use the parsed number
      cantidad_en_unidad: cantidad_en_unidad, // <--- Use the parsed number
      stock_minimo: stock_minimo, // <--- Use the parsed number
      activo: true,
      creado_en: new Date().toISOString(), // Or let Supabase default handle it
    });
  }

  // --- Insert into Supabase ---
  if (productsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('productos')
      .insert(productsToInsert);

    if (insertError) {
      console.error("Supabase batch insert error:", insertError);
      Alert.alert("Error al Importar", `Ocurrió un error al guardar los productos: ${insertError.message}`);
    } else {
      Alert.alert("Éxito", `${productsToInsert.length} productos importados correctamente.`);
      loadProducts(); // Refresh your product list
    }
  }

  if (importErrors.length > 0) {
    // Display these errors to the user. Maybe in a modal or a scrollable list.
    Alert.alert("Errores de Importación", `Se encontraron ${importErrors.length} errores:\n- ${importErrors.slice(0, 5).join('\n- ')}${importErrors.length > 5 ? '\n...' : ''}`);
    console.warn("Import Errors:", importErrors);
  } else if (productsToInsert.length === 0 && parsedProducts.length > 0) {
     Alert.alert("Información", "No se importaron productos. Revise los errores o el formato del archivo.");
  }
  setLoading(false);
};

  const getCategoryIcon = useCallback((categoria: string) => {
    switch (categoria) {
      case 'Cocina': return Kitchen;
      case 'Bar': return Bar;
      case 'Café': return Coffee;
      case 'Limpieza': return Clean;
      default: return null;
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Get all empresa IDs the user is associated with
      const userEmpresaIds = empresas.map(emp => emp.id);

      if (userEmpresaIds.length > 0) {
        // Fetch products where empresa_id is in the list of user's empresa IDs
       const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          proveedores (nombre)
        `)
        .in('empresa_id', userEmpresaIds)
        .order('creado_en', { ascending: false });

        if (error) {
        console.error("Supabase error fetching products with provider names:", error);
        throw error;
      }
      if (data) {
        // The 'data' will now have a 'proveedores' property for each product,
        // which is an object like { nombre: 'Provider Name Here' } or null.
        setProducts(data as Product[]);
      }
    } else {
      setProducts([]);
    }
  } catch (error: any) {
    Alert.alert('Error al cargar productos', error.message);
    setProducts([]);
  } finally {
    setLoading(false);
  }
  }, [empresas]); // Depend on `empresas` from the store

  // The useEffect that calls loadProducts remains the same:
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filterProducts = useCallback(() => {
  let tempProducts = products; // Start with all products (from all user's empresas)

  // 1. Filter by selected Empresa ID FIRST
  if (selectedEmpresaId) {
    tempProducts = tempProducts.filter(product => product.empresa_id === selectedEmpresaId);
  } else {
    // If no empresa is selected, show no products.
    setFilteredProducts([]);
    return;
  }

  // 2. Then, filter the (now empresa-filtered) tempProducts by search text
  if (searchText.trim() === '') {
    // If no search text, the tempProducts (already filtered by empresa) is our final list
    setFilteredProducts(tempProducts);
  } else {
    const normalizedSearchText = searchText
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Apply search filter ON TOP OF the empresa-filtered list
    const filtered = tempProducts.filter(product => { // <--- CORRECTED LINE
      // Helper function to check a field's value against the search text
      const checkField = (fieldValue: any): boolean => {
        if (fieldValue === null || fieldValue === undefined) {
          return false;
        }
        const normalizedFieldValue = String(fieldValue)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return normalizedFieldValue.includes(normalizedSearchText);
      };

      // Now, check against all the fields you want to include in the search
      return (
        checkField(product.nombre) ||
        checkField(product.descripcion) ||
        checkField(product.categoria) ||
        checkField(product.proveedor) ||
        checkField(product.proveedores?.nombre) ||
        checkField(product.unidad) ||
        checkField(product.precio) ||
        checkField(product.iva_tipo) ||
        checkField(product.stock) ||
        checkField(product.stock_minimo) ||
        checkField(product.id) ||
        checkField(product.creado_en) ||
        checkField(product.activo)
      );
    });
    setFilteredProducts(filtered);
  }
}, [products, searchText, selectedEmpresaId]);

  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  // --- MODIFIED: addProduct now accepts formData from ProductFormModal ---
  const handleAddProductSubmit = useCallback(async (formData: ProductFormData) => {
    // Validations are now primarily handled inside the modal, but final check or specific logic can be here.
    // The modal already validated these, but if there's a specific check for empresa_id from formData:
    if (!formData.empresa_id) {
      Alert.alert('Error', 'Debe seleccionar una empresa en el formulario.');
      throw new Error('Empresa no seleccionada en el formulario'); // Throw error to be caught by modal's onSubmit
    }

    const newProductId = uuidv4();

    try {
      let proveedorId;
      // Check for existing provider using formData.proveedorNombre
      const { data: existingProveedor, error: proveedorError } = await supabase
        .from('proveedores')
        .select('id')
        .eq('nombre', formData.proveedorNombre)
        .eq('empresa_id', formData.empresa_id) // Ensure provider is for the selected company
        .single();

      if (proveedorError && proveedorError.code !== 'PGRST116') { // PGRST116: 0 rows
         throw proveedorError;
      }

      if (existingProveedor) {
        proveedorId = existingProveedor.id;
      } else {
        const { data: newProveedor, error: createProveedorError } = await supabase
          .from('proveedores')
          .insert([{ nombre: formData.proveedorNombre, empresa_id: formData.empresa_id }])
          .select('id')
          .single();

        if (createProveedorError) throw createProveedorError;
        if (!newProveedor) throw new Error("No se pudo crear el proveedor.");
        proveedorId = newProveedor.id;
      }

      const productToInsert = {
        id: newProductId,
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        precio: parseFloat(formData.precio), // formData.precio already normalized in modal
        iva_tipo: formData.iva_tipo ? parseFloat(formData.iva_tipo) : null, // formData.iva_tipo already normalized in modal
        categoria: formData.categoria,
        proveedor: proveedorId, // This is proveedor_id
        creado_en: new Date().toISOString(),
        stock: formData.stock ? parseInt(formData.stock) : null, // formData.stock already normalized in modal
        empresa_id: formData.empresa_id, // Use empresa_id from form
        unidad: formData.unidad || null,
        stock_minimo: parseInt(formData.stock_minimo), // formData.stock_minimo already normalized in modal
        activo: true,
        cantidad_pedido: formData.cantidad_pedido ? parseInt(formData.cantidad_pedido) : null, // already normalized in modal
        // cantidad_en_unidad is already numeric or null from the modal
        cantidad_en_unidad: formData.cantidad_en_unidad,
      };

      const { data: insertedProduct, error: insertError } = await supabase
        .from('productos')
        .insert([productToInsert])
        .select()
        .single(); // Assuming you want the inserted product back

      if (insertError) throw insertError;
      if (!insertedProduct) throw new Error("No se pudo agregar el producto.");

      // Update local state
      loadProducts(); // Re-fetch all products to ensure data consistency and get any DB-generated values.

      Alert.alert('Éxito', 'Producto agregado correctamente.');
      // The modal will close itself via its onClose prop.
      // setModalVisible(false); // Not needed here, modal handles its own visibility on success via onClose

    } catch (error: any) {
      console.error("Error in handleAddProductSubmit:", error);
      Alert.alert('Error al agregar producto', error.message || 'Ocurrió un error desconocido.');
      throw error; // Re-throw to allow modal to handle its state (e.g., not closing)
    }
  }, [loadProducts]); // Added loadProducts as dependency

  const renderItem = useCallback(({ item }: { item: Product }) => (
    <RadialProductButton
      title={item.nombre}
      icon={getCategoryIcon(item.categoria)}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    />
  ), [navigation, getCategoryIcon]);

  const gradientColors = ['#00336C', '#00234B', '#011F41'];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Text style={styles.title}>Productos</Text>
      <View style={styles.cortinaContainer}>
        <Cortina />

          {/* --- HOME BUTTON START --- */}
                <Pressable
                  onPress={() => navigation.navigate('HomeScreen')} // Navigate to your home screen (e.g., RecetasList)
                  style={styles.homeButton}
                  accessibilityLabel="Go to Home"
                >
                  <Text style={styles.homeButtonText}>Home</Text>
                </Pressable>
                {/* --- HOME BUTTON END --- */}
      </View>
      <RadialProductButton
        title="Agregar Producto"
        icon={Newproduct}
        isAddProductButton={true}
        onPress={() => setModalVisible(true)} // Just open the modal
        style={styles.addproductButton}
      />
      <View style={styles.csvButtonContainer}>
      <RadialProductButton
        title="Plantilla"
       icon={plantilla}
       onPress={handleDownloadTemplate}
       style={styles.csvRadialButtonSide}
       />
       <RadialProductButton title="Subir" icon={importcsv} onPress={handleUploadCSV} style={styles.csvRadialButtonSide} />

</View>
       <EmpresaFilter
      empresas={empresas} // from useUserStore
      selectedEmpresaId={selectedEmpresaId} // your existing state
      onSelectEmpresa={setSelectedEmpresaId} // your existing state setter
    />

      <TextInput
        style={styles.searchBar}
        placeholder="Buscar productos..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#00234B"
      />

      {/* --- NEW: Use ProductFormModal --- */}
      <ProductFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddProductSubmit}
        initialSelectedEmpresaId={selectedEmpresaId} // Pass the current filter's empresaId as initial
        empresas={empresas} // Pass the list of empresas
      />
      {loading ? (
        <Text style={styles.loadingText}>Cargando productos...</Text>
      ) : (
        // Check if any empresa is selected or if there are any empresas at all
        (empresas && empresas.length > 0 && selectedEmpresaId) ? (
          filteredProducts.length > 0 ? (
            <FlatList
              data={filteredProducts}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              numColumns={windowWidth < 600 ? 3 : 4}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <Text style={styles.emptyListText}>No se encontraron productos para "{searchText}".</Text>
          )
        ) : (
          <Text style={styles.disabledText}>
            {empresas && empresas.length === 0 ? "No tiene empresas asignadas." : "Por favor, seleccione una empresa para ver los productos."}
          </Text>
        )
      )}
    </LinearGradient>
  );
};

// Styles might need slight adjustments if there were overlaps, but most modal styles are now in ProductFormModal.tsx
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
  addproductButton: {
    position: 'absolute',
    top: 100, // Adjust as needed
    alignSelf: 'center', // Centering button
    zIndex: 10, // Ensure it's above other elements like Cortina potentially
    shadowColor: '#94C8EF',
    shadowOpacity: 0.8, // Make shadow more visible
    shadowRadius: 15, // Adjust radius
    elevation: 10, // For Android shadow
  },
  csvButtonContainer: {
  position: 'absolute',
  top: 220, // Below Add Product
  alignSelf: 'center',
  flexDirection: 'row', // Arrange children (buttons) horizontally
  justifyContent: 'center', // Center buttons within this row
  zIndex: 9,
},
csvRadialButtonSide: { // Apply this to each RadialProductButton for side-by-side
  marginHorizontal: 10, // Space between the two buttons
  shadowColor: '#94C8EF',
    shadowOpacity: 0.6, // Slightly less prominent shadow
    shadowRadius: 10,
    elevation: 7,
  height: 58, // Adjust height for better touch area
  width: 58, // Adjust width for better touch area
},
  title: {
    fontSize: 50,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#F4E3D7',
    marginTop: 308,
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
    marginTop: 7,
    marginBottom: 7,
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
  pickerItem: {
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

export default ProductScreen;