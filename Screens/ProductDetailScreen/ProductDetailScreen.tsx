// ProductDetailScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert, Linking, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase'; // Adjust path
import { useUserStore } from '../../utils/useUserStore'; // Adjust path
import LinearGradient from 'react-native-linear-gradient';
import Carrito from './Assets/Carrito.svg';

// Re-define Product interface to include cantidad_pedido and its types
// Add 'proveedores' type for the nested data
export interface Product {
    id: string;
    empresa_id: string;
    nombre: string;
    descripcion: string | null;
    precio: number; // Make sure it's number
    iva_tipo: number | null; // Make sure it's number | null
    categoria: string;
    proveedor: string | null; // This is the ID of the supplier
    stock: number | null; // Make sure it's number | null
    stock_minimo: number | null; // Make sure it's number | null
    unidad: string;
    cantidad_pedido: number | null; // <--- NEW: Added cantidad_pedido
    cantidad_en_unidad: number | null; // <--- ADDED: assuming this applies here too
    activo: boolean; // boolean
    creado_en: string;
    // Nested supplier data from join
    proveedores: {
        nombre: string;
    } | null;
}

// Assuming RootStackParamList is defined and accessible
type RootStackParamList = {
    ProductDetail: { productId: string };
    EditProduct: { product: Product }; // Example if you add an edit screen/modal
    ProveedorDetail: { proveedorId: string; empresaId: string };
    HomeScreen: undefined;
};

type ProductDetailRouteParams = {
    productId: string;
};
type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

// --- NEW HELPER FUNCTIONS FOR NUMBER FORMATTING ---
/**
 * Normalizes a string containing a number by replacing a comma decimal separator with a dot.
 * This is crucial before parsing with parseFloat/parseInt.
 * @param text The input string (e.g., "1,5" or "1.5")
 * @returns A string with a dot as the decimal separator (e.g., "1.5")
 */
const normalizeInputForParsing = (text: string | undefined | null): string => {
  if (text === null || typeof text === 'undefined' || text.trim() === '') return '';
  return text.trim().replace(',', '.');
};

/**
 * Formats a number for display using the es-ES locale, which uses a comma for decimals.
 * @param num The number to format.
 * @param options Intl.NumberFormatOptions to customize formatting (e.g., maximumFractionDigits).
 * @returns A formatted string (e.g., "1,50") or 'N/A' if the input is not a valid number.
 */
const formatNumberForDisplay = (
  num: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string => {
  if (num === null || typeof num === 'undefined' || isNaN(num)) return 'N/A';

  // Default options for general numbers (e.g., price)
  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2, // Default to 2 decimal places
    ...options, // Allow overriding default options
  };

  // Using 'es-ES' locale for comma as decimal separator
  return new Intl.NumberFormat('es-ES', defaultOptions).format(num);
};
// --- END NEW HELPER FUNCTIONS ---


// --- Helper Component for Editable Details ---
interface EditableDetailItemProps {
    label: string;
    value: string | number | null | undefined;
    isEditing: boolean;
    onValueChange: (newValue: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'url';
    multiline?: boolean;
    // Add originalProductValue to check if value changed for highlight
    originalProductValue?: string | number | null | undefined; // This will receive the raw number (e.g., 1.5)
}

const EditableDetailItem: React.FC<EditableDetailItemProps> = ({
    label,
    value, // This 'value' will now be a pre-formatted string (e.g., "1,50" for numbers)
    isEditing,
    onValueChange,
    placeholder,
    keyboardType = 'default',
    multiline = false,
    originalProductValue // Original value will still be the raw number (e.g., 1.5)
}) => {
    // Determine if the value has changed from its original for styling
    // The originalProductValue is a raw number (e.g., 1.5), so it needs to be formatted for comparison
    // Use a high maximumFractionDigits for comparison to catch subtle float differences
    const formattedOriginalValue = (typeof originalProductValue === 'number' && keyboardType === 'numeric')
        ? formatNumberForDisplay(originalProductValue, { minimumFractionDigits: 0, maximumFractionDigits: 5 })
        : String(originalProductValue ?? ''); // Convert to string for non-numeric or null/undefined

    // Compare the formatted original with the current value (which is already formatted)
    // Only highlight if in editing mode and values differ
    const hasChanged = isEditing && (formattedOriginalValue !== (value ?? ''));

    return (
        <View style={styles.detailItemContainer}>
            <Text style={styles.detailLabel}>{label}:</Text>
            {isEditing ? (
                <TextInput
                    style={styles.detailInput}
                    onChangeText={onValueChange} // This receives the raw string from TextInput
                    value={value !== null && value !== undefined ? String(value) : ''} // Display the pre-formatted string
                    placeholder={placeholder || `Enter ${label}`}
                    placeholderTextColor="#999"
                    keyboardType={keyboardType}
                    multiline={multiline}
                />
            ) : (
                // When not editing, 'value' is already formatted and ready for display
                <Text style={[styles.detailValue, hasChanged && styles.valueChanged]}>{value ?? 'N/A'}</Text>
            )}
        </View>
    );
};

const ProductDetailScreen = () => {
    const route = useRoute<ProductDetailRouteProp>();
    console.log('ProductDetailScreen mounted. Route params:', JSON.stringify(route.params, null, 2));
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>(); // For navigation actions
    const { productId } = route.params;

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const user = useUserStore((state) => state.user);

    // --- NEW: State for quantity selector ---
    const [quantity, setQuantity] = useState(1); // Default quantity to 1

    // --- State for Section Editing ---
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [tempProduct, setTempProduct] = useState<Product | null>(null);
    const originalProductRef = useRef<Product | null>(null);

    // --- Data Fetching ---
    useEffect(() => {
        // ... (existing useEffect for data fetching logic) ...
         if (!productId) {
            console.error("ProductDetailScreen: useEffect - productId is FALSY. Aborting fetch. Value:", productId);
            setLoading(false);
            setFetchError("Product ID not available to load details.");
            setProduct(null);
            return;
        }

        let isMounted = true;

        const fetchProduct = async () => {
            console.log(`ProductDetailScreen: Attempting to fetch product with ID: ${productId}`);
            setLoading(true);
            setFetchError(null);
            setProduct(null);

            try {
                const { data, error: supabaseError } = await supabase
                    .from('productos')
                    .select('*, proveedores (nombre)') // Ensure 'cantidad_en_unidad' is selected if it's a DB column
                    .eq('id', productId)
                    .single();

                if (!isMounted) return;

                if (supabaseError) {
                    console.error(`ProductDetailScreen: Supabase error for ID ${productId}:`, supabaseError.message);
                    throw supabaseError;
                }

                if (!data) {
                    console.warn(`ProductDetailScreen: No data returned from Supabase for ID ${productId}. Data object:`, data);
                    throw new Error('Producto no encontrado o datos no válidos.');
                }

                const fetchedProduct: Product = {
                    ...data,
                    proveedores: data.proveedores ? { nombre: data.proveedores.nombre as string } : null,
                    // Ensure all numeric fields are correctly converted from potentially string to number
                    // Supabase 'select' *should* cast to numbers if column type is number, but explicit check
                    stock: typeof data.stock === 'number' ? data.stock : (data.stock ? Number(data.stock) : null),
                    stock_minimo: typeof data.stock_minimo === 'number' ? data.stock_minimo : (data.stock_minimo ? Number(data.stock_minimo) : null),
                    cantidad_pedido: typeof data.cantidad_pedido === 'number' ? data.cantidad_pedido : (data.cantidad_pedido ? Number(data.cantidad_pedido) : null),
                    cantidad_en_unidad: typeof data.cantidad_en_unidad === 'number' ? data.cantidad_en_unidad : (data.cantidad_en_unidad ? Number(data.cantidad_en_unidad) : null), // Add this too
                };
                setProduct(fetchedProduct);
                originalProductRef.current = fetchedProduct;
                setTempProduct(fetchedProduct); // Initialize tempProduct with fetched data

            } catch (e: any) {
                if (!isMounted) return;
                console.error(`ProductDetailScreen: CATCH block for ID ${productId}. Error:`, e.message, e);
                setFetchError(String(e.message || 'Ocurrió un error al cargar el producto.'));
            } finally {
                if (isMounted) {
                    console.log(`ProductDetailScreen: FINALLY block for ID ${productId}. Setting loading to false.`);
                    setLoading(false);
                }
            }
        };

        fetchProduct();

        return () => {
            isMounted = false;
            console.log(`ProductDetailScreen: useEffect CLEANUP for ID ${productId}.`);
        };
    }, [productId]);


    // --- Section Editing Functions ---
    const handleEditSection = useCallback((sectionName: string) => {
        if (!product) return;
        setEditingSection(sectionName);
        setTempProduct({ ...product }); // Clone product for editing
    }, [product]);

    const handleCancelEdit = useCallback(() => {
        setEditingSection(null);
        setTempProduct(product); // Revert tempProduct to original product
    }, [product]);

    const handleSaveSection = useCallback(async () => {
        if (!tempProduct || !product || !editingSection) return Alert.alert("Error", "No hay cambios para guardar o sección inválida.");

        setLoading(true);
        setFetchError(null);

        try {
            const payload: Partial<Product> = {};

            if (editingSection === 'main') {
                if (tempProduct.nombre.trim() === '') throw new Error('El nombre del producto es obligatorio.');
                // Validations now work with the already normalized (dot-separated) numbers in tempProduct
                if (isNaN(Number(tempProduct.precio)) || Number(tempProduct.precio) <= 0) throw new Error('El precio debe ser un número válido mayor que 0.');
                if (isNaN(Number(tempProduct.iva_tipo)) && tempProduct.iva_tipo !== null && tempProduct.iva_tipo !== undefined) throw new Error('El tipo de IVA debe ser un número válido o nulo.');
                if (tempProduct.unidad.trim() === '') throw new Error('La unidad es obligatoria.');
                if (isNaN(Number(tempProduct.cantidad_pedido)) || Number(tempProduct.cantidad_pedido) <= 0) throw new Error('La cantidad por paquete debe ser un número mayor que 0.');
                if (isNaN(Number(tempProduct.cantidad_en_unidad)) && tempProduct.cantidad_en_unidad !== null && tempProduct.cantidad_en_unidad !== undefined) throw new Error('La cantidad en unidad debe ser un número válido o nulo.');


                payload.nombre = tempProduct.nombre.trim();
                payload.descripcion = tempProduct.descripcion ? tempProduct.descripcion.trim() : null;
                payload.precio = tempProduct.precio; // Directly use the number (already float-parsed with dot)
                payload.iva_tipo = tempProduct.iva_tipo; // Directly use the number
                payload.categoria = tempProduct.categoria;
                payload.unidad = tempProduct.unidad.trim();
                payload.cantidad_pedido = tempProduct.cantidad_pedido; // Directly use the number
                payload.cantidad_en_unidad = tempProduct.cantidad_en_unidad; // Directly use the number

            } else if (editingSection === 'inventory') {
                // Validations work with normalized numbers
                if (isNaN(Number(tempProduct.stock)) && tempProduct.stock !== null && tempProduct.stock !== undefined) throw new Error('El stock debe ser un número válido o nulo.');
                if (isNaN(Number(tempProduct.stock_minimo)) || Number(tempProduct.stock_minimo) < 0) throw new Error('El stock mínimo debe ser un número válido y mayor o igual a 0.');

                payload.stock = tempProduct.stock; // Directly use the number
                payload.stock_minimo = tempProduct.stock_minimo; // Directly use the number
            } else if (editingSection === 'other') {
                // tempProduct.activo here is already a boolean from EditableDetailItem's onValueChange
                payload.activo = tempProduct.activo as boolean;
            }

            const { data, error } = await supabase
                .from('productos')
                .update(payload)
                .eq('id', product.id)
                .select('*, proveedores (nombre)')
                .single();

            if (error) {
                console.error("Supabase update error:", error);
                throw error;
            }
            if (!data) {
                throw new Error('No se pudo actualizar el producto o no se recibió confirmación.');
            }

            const updatedProduct: Product = {
                ...data, // Supabase should return correct number types if column is numeric
                proveedores: data.proveedores ? { nombre: String(data.proveedores.nombre) } : null,
                 // Explicitly ensure type correctness for numeric fields returned from Supabase
                precio: Number(data.precio),
                iva_tipo: data.iva_tipo !== null ? Number(data.iva_tipo) : null,
                stock: data.stock !== null ? Number(data.stock) : null,
                stock_minimo: data.stock_minimo !== null ? Number(data.stock_minimo) : null,
                cantidad_pedido: data.cantidad_pedido !== null ? Number(data.cantidad_pedido) : null,
                cantidad_en_unidad: data.cantidad_en_unidad !== null ? Number(data.cantidad_en_unidad) : null,
                activo: typeof data.activo === 'boolean' ? data.activo : (data.activo === 'true' || data.activo === 1), // Robust boolean conversion
            };

            setProduct(updatedProduct);
            originalProductRef.current = updatedProduct; // Update original reference
            setTempProduct(updatedProduct); // Update tempProduct to match saved state
            setEditingSection(null); // Exit editing mode
            Alert.alert('Éxito', 'Producto actualizado correctamente.');

        } catch (e: any) {
            console.error('Error al guardar cambios:', e);
            setFetchError(String(e.message || 'Ocurrió un error al guardar los cambios.'));
            Alert.alert('Error', `No se pudieron guardar los cambios: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [tempProduct, product, editingSection]);


    // --- Cart Handling ---
    const handleIncrement = () => {
        setQuantity(prev => prev + 1);
    };

    const handleDecrement = () => {
        setQuantity(prev => Math.max(0, prev - 1)); // Quantity cannot go below 0
    };

    const handleQuantityChange = useCallback((text: string) => {
        // Normalize input as it's a number field potentially
        const normalizedText = normalizeInputForParsing(text);
        const num = parseInt(normalizedText, 10);
        if (isNaN(num) || num < 0) {
            setQuantity(0); // If input is invalid, set to 0. You could also keep the last valid.
        } else {
            setQuantity(num);
        }
    }, []);

    const handleAddToCart = async () => {
        if (!product) {
            Alert.alert('Error', 'No hay producto seleccionado.');
            return;
        }
        if (!user || !user.id) {
            Alert.alert('Error', 'Debe iniciar sesión para agregar productos al carrito.');
            return;
        }
        // <--- NEW: Validate quantity before adding to cart
        if (quantity <= 0) {
            Alert.alert('Cantidad Inválida', 'Debe seleccionar una cantidad mayor a cero para agregar al carrito.');
            return;
        }

        setIsAddingToCart(true);
        try {
            const { data, error } = await supabase
                .from('carrito')
                .insert([
                    {
                        user_id: user.id,
                        producto_id: product.id,
                        nombre: product.nombre,
                        cantidad: quantity, // Use the selected quantity
                        creado_en: new Date().toISOString(),
                        empresa_id: product.empresa_id,
                        // Price of ONE *package* (e.g., 24-pack of Coke)
                        // Uses the internally stored (dot-separated) price directly
                        precio_total: (product.precio || 0) * (product.cantidad_pedido || 1),
                    },
                ])
                .select();

            if (error) {
                throw error;
            }

            Alert.alert('Éxito', `${quantity} ${product.nombre}(s) agregado(s) a tu pedido.`);

        } catch (e: any) {
            console.error('Error adding to cart:', e);
            Alert.alert('Error', `No se pudo agregar el producto al pedido: ${e.message}`);
        } finally {
            setIsAddingToCart(false);
        }
    };

    const handleDeleteProduct = async () => {
        if (!product) return;
        Alert.alert(
            "Confirmar Eliminación",
            `¿Está seguro de que desea eliminar "${product.nombre}"? Esta acción no se puede deshacer.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('productos')
                                .delete()
                                .eq('id', product.id);
                            if (error) throw error;
                            Alert.alert('Éxito', 'Producto eliminado correctamente.');
                            navigation.goBack(); // Go back to the product list
                        } catch (e: any) {
                            Alert.alert('Error', `No se pudo eliminar el producto: ${e.message}`);
                        }
                    },
                },
            ]
        );
    };

    // Helper for rendering section header with edit/save/cancel buttons
    const renderSectionHeader = (title: string, sectionName: string) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {editingSection === sectionName ? (
                <View style={styles.sectionButtonContainer}>
                    <Pressable style={[styles.sectionButton, styles.saveButton]} onPress={handleSaveSection}>
                        <Text style={styles.buttonText}>Guardar</Text>
                    </Pressable>
                    <Pressable style={[styles.sectionButton, styles.cancelButton]} onPress={handleCancelEdit}>
                        <Text style={styles.buttonText}>Cancelar</Text>
                    </Pressable>
                </View>
            ) : (
                <Pressable style={[styles.sectionButton, styles.editSectionButton]} onPress={() => handleEditSection(sectionName)}>
                    <Text style={styles.buttonText}>Editar</Text>
                </Pressable>
            )}
        </View>
    );

    // --- Render Logic ---
    if (loading && !product) {
        return (
            <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
                <ActivityIndicator size="large" color="#FFF1D8" />
                <Text style={styles.loadingText}>Cargando producto...</Text>
            </LinearGradient>
        );
    }

    if (fetchError) {
        return (
            <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
                <Text style={styles.errorText}>{fetchError}</Text>
                <Pressable onPress={() => navigation.goBack()} style={styles.button}>
                    <Text style={styles.buttonText}>Volver</Text>
                </Pressable>
            </LinearGradient>
        );
    }

    if (!product) {
        return (
            <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centered}>
                <Text style={styles.errorText}>Producto no disponible.</Text>
                <Pressable onPress={() => navigation.goBack()} style={styles.button}>
                    <Text style={styles.buttonText}>Volver</Text>
                </Pressable>
            </LinearGradient>
        );
    }

     // Calculate price with VAT for display
    const precioConIvaCalculado = (product.precio || 0) * (1 + (product.iva_tipo || 0) / 100);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
        >
            <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <Text style={styles.title}>{product.nombre}</Text>

                    <Pressable
                        onPress={() => navigation.navigate('HomeScreen')}
                        style={styles.homeButton}
                        accessibilityLabel="Go to Home"
                    >
                        <Text style={styles.homeButtonText}>Home</Text>
                    </Pressable>

                    <View style={styles.cartActionsContainer}>
                        <Pressable
                            style={[
                                styles.addToCartButton,
                                isAddingToCart || quantity <= 0 ? styles.buttonDisabled : null,
                            ]}
                            onPress={handleAddToCart}
                            disabled={isAddingToCart || quantity <= 0} 
                        >
                            {isAddingToCart ? (
                                <ActivityIndicator size="small" color="#FFF1D8" />
                            ) : (
                                <Carrito width={30} height={30} fill="#FFF1D8" />
                            )}
                        </Pressable>

                        <View style={styles.quantitySelectorContainer}>
                            <Pressable
                                onPress={handleDecrement}
                                style={[
                                    styles.quantityButton,
                                    quantity <= 0 ? styles.buttonDisabled : null,
                                ]}
                                disabled={quantity <= 0}
                            >
                                <Text style={styles.quantityButtonText}>-</Text>
                            </Pressable>
                            <TextInput
                                style={styles.quantityInput}
                                keyboardType="numeric"
                                value={String(quantity)} 
                                onChangeText={handleQuantityChange} 
                                onBlur={() => { 
                                    const num = parseInt(String(quantity), 10);
                                    if (isNaN(num) || num < 0) {
                                        setQuantity(0); 
                                    }
                                }}
                            />
                            <Pressable onPress={handleIncrement} style={styles.quantityButton}>
                                <Text style={styles.quantityButtonText}>+</Text>
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.section}>
                        {renderSectionHeader('Información Principal', 'main')}
                        <EditableDetailItem
                            label="Nombre"
                            value={editingSection === 'main' ? tempProduct?.nombre : product.nombre}
                            isEditing={editingSection === 'main'}
                            onValueChange={(text) => setTempProduct(prev => prev ? { ...prev, nombre: text } : null)}
                            originalProductValue={originalProductRef.current?.nombre}
                        />
                        <EditableDetailItem
                            label="Descripción"
                            value={editingSection === 'main' ? tempProduct?.descripcion : product.descripcion}
                            isEditing={editingSection === 'main'}
                            onValueChange={(text) => setTempProduct(prev => prev ? { ...prev, descripcion: text } : null)}
                            multiline={true}
                            originalProductValue={originalProductRef.current?.descripcion}
                        />
                        <EditableDetailItem
                            label="Precio"
                            value={editingSection === 'main' ? formatNumberForDisplay(tempProduct?.precio) : formatNumberForDisplay(product.precio)}
                            isEditing={editingSection === 'main'}
                            onValueChange={(text) => setTempProduct(prev => prev ? { ...prev, precio: parseFloat(normalizeInputForParsing(text)) || 0 } : null)}
                            keyboardType="numeric"
                            originalProductValue={originalProductRef.current?.precio}
                        />

                        <DetailItem label="Precio con IVA" value={`€${formatNumberForDisplay(precioConIvaCalculado)}`} />
                        <EditableDetailItem
                            label="IVA"
                            value={editingSection === 'main' ? formatNumberForDisplay(tempProduct?.iva_tipo, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : formatNumberForDisplay(product.iva_tipo, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            isEditing={editingSection === 'main'}
                            onValueChange={(text) => setTempProduct(prev => prev ? { ...prev, iva_tipo: parseFloat(normalizeInputForParsing(text.replace('%', ''))) || null } : null)}
                            keyboardType="numeric"
                            originalProductValue={originalProductRef.current?.iva_tipo}
                        />
                        <EditableDetailItem
                            label="Categoría"
                            value={editingSection === 'main' ? tempProduct?.categoria : product.categoria}
                            isEditing={editingSection === 'main'}
                            onValueChange={(text) => setTempProduct(prev => prev ? { ...prev, categoria: text } : null)}
                            originalProductValue={originalProductRef.current?.categoria}
                        />
                        <EditableDetailItem
                            label="Unidad"
                            value={editingSection === 'main' ? tempProduct?.unidad : product.unidad}
                            isEditing={editingSection === 'main'}
                            onValueChange={(text) => setTempProduct(prev => prev ? { ...prev, unidad: text } : null)}
                            originalProductValue={originalProductRef.current?.unidad}
                        />
                        <EditableDetailItem
                            label="Cant. por Pedido"
                            value={editingSection === 'main' ? formatNumberForDisplay(tempProduct?.cantidad_pedido, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : formatNumberForDisplay(product.cantidad_pedido, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            isEditing={editingSection === 'main'}
                            onValueChange={(text) => setTempProduct(prev => prev ? { ...prev, cantidad_pedido: parseFloat(normalizeInputForParsing(text)) || null } : null)}
                            keyboardType="numeric"
                            originalProductValue={originalProductRef.current?.cantidad_pedido}
                        />
                        <EditableDetailItem
                            label="Cant. en Unidad"
                            value={editingSection === 'main' ? formatNumberForDisplay(tempProduct?.cantidad_en_unidad) : formatNumberForDisplay(product.cantidad_en_unidad)}
                            isEditing={editingSection === 'main'}
                            onValueChange={(text) => setTempProduct(prev => prev ? { ...prev, cantidad_en_unidad: parseFloat(normalizeInputForParsing(text)) || null } : null)}
                            keyboardType="numeric"
                            originalProductValue={originalProductRef.current?.cantidad_en_unidad}
                        />
                    </View>

                    <View style={styles.section}>
                        {renderSectionHeader('Inventario', 'inventory')}
                        <EditableDetailItem
                            label="Stock Actual"
                            value={editingSection === 'inventory' ? formatNumberForDisplay(tempProduct?.stock, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : formatNumberForDisplay(product.stock, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            isEditing={editingSection === 'inventory'}
                            onValueChange={(text) => setTempProduct(prev => prev ? { ...prev, stock: parseFloat(normalizeInputForParsing(text)) || null } : null)}
                            keyboardType="numeric"
                            originalProductValue={originalProductRef.current?.stock}
                        />
                        <EditableDetailItem
                            label="Stock Mínimo"
                            value={editingSection === 'inventory' ? formatNumberForDisplay(tempProduct?.stock_minimo, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : formatNumberForDisplay(product.stock_minimo, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            isEditing={editingSection === 'inventory'}
                            onValueChange={(text) => setTempProduct(prev => prev ? { ...prev, stock_minimo: parseFloat(normalizeInputForParsing(text)) || null } : null)}
                            keyboardType="numeric"
                            originalProductValue={originalProductRef.current?.stock_minimo}
                        />
                        {(product.stock !== null && product.stock_minimo !== null && product.stock < product.stock_minimo) ? (
                            <Text style={styles.lowStockWarning}>¡Stock bajo!</Text>
                        ) : null}
                    </View>

                    <View style={styles.section}>
                        {renderSectionHeader('Proveedor', 'supplier')}
                        <DetailItem label="Nombre" value={product.proveedores?.nombre} />
                        {(product.proveedor && product.proveedores?.nombre && product.empresa_id) ? (
                            <Pressable
                                style={styles.linkButton}
                                onPress={() => {
                                    if (product.proveedor && product.empresa_id) {
                                        navigation.navigate('ProveedorDetail', {
                                            proveedorId: product.proveedor,
                                            empresaId: product.empresa_id
                                        });
                                    } else {
                                        Alert.alert("Error de Datos", "No se pudo obtener la información completa para navegar al proveedor.");
                                    }
                                }}
                            >
                                <Text style={styles.linkText}>Ver más sobre {product.proveedores.nombre}</Text>
                            </Pressable>
                        ) : null}
                        {editingSection === 'supplier' && (
                            <Text style={styles.editNote}>
                                Para cambiar el proveedor, por favor edite desde la sección principal o el producto.
                            </Text>
                        )}
                    </View>

                    <View style={styles.section}>
                        {renderSectionHeader('Otros Datos', 'other')}

                        <DetailItem label="Creado el" value={new Date(product.creado_en).toLocaleDateString("es-ES")} />
                        <EditableDetailItem
                            label="Activo"

                            value={editingSection === 'other' ? (tempProduct?.activo ? 'Sí' : 'No') : (product.activo ? 'Sí' : 'No')}
                            isEditing={editingSection === 'other'}

                            onValueChange={(newVal) => setTempProduct(prev => prev ? { ...prev, activo: newVal.toLowerCase() === 'sí' || newVal.toLowerCase() === 'si' || newVal === 'true' } : null)}
                            placeholder="Sí / No"
                            originalProductValue={originalProductRef.current?.activo ? 'Sí' : 'No'}
                        />
                    </View>

                    <View style={styles.actionsContainer}>
                        <Pressable style={[styles.button, styles.deleteButton]} onPress={handleDeleteProduct}>
                            <Text style={styles.buttonText}>Eliminar Producto</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
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
        fontSize: 32,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        color: '#F4E3D7',
        marginTop: 60, // Adjust this as needed
        marginBottom: 20, // Add margin to separate from new cart actions
        textAlign: 'center',
    },
    // <--- NEW: Styles for Cart Actions and Quantity Selector ---
    cartActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center', // Center content horizontally
        alignItems: 'center', // Align items vertically
        marginBottom: 20, // Space below these actions
        width: '100%', // Take full width
    },
    addToCartButton: {
        backgroundColor: 'rgba(131, 210, 229, 0.5)',
        borderRadius: 30,
        padding: 12, // Reduced padding as it's part of a row now
        width: 60, // Fixed width for icon button
        height: 60, // Fixed height for icon button
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#94C8EF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 5,
        marginRight: 10, // Space between button and selector
    },
    quantitySelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    quantityButton: {
        backgroundColor: '#00234B',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
        marginHorizontal: 3,
        minWidth: 40, // Ensure button size
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonText: {
        color: '#F4E3D7',
        fontSize: 20,
        fontWeight: 'bold',
    },
    quantityInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        color: '#333',
        fontSize: 18,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 5,
        marginHorizontal: 3,
        minWidth: 60,
        textAlign: 'center',
    },
    // <--- END NEW Styles ---

    buttonDisabled: {
        opacity: 0.5, // Make disabled buttons grey/faded
        backgroundColor: '#5a6268',
    },
    section: {
        backgroundColor: 'rgba(244, 227, 215, 0.1)',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244, 227, 215, 0.3)',
        paddingBottom: 5,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Georgia',
        fontWeight: '600',
        color: '#E0CDBB',
    },
    sectionButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
        marginLeft: 10,
        backgroundColor: '#007bff',
    },
    editSectionButton: {
        backgroundColor: '#FFA500',
    },
    saveButton: {
        backgroundColor: '#28a745',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    detailItemContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 16,
        fontFamily: 'Georgia',
        color: '#D4C2B3',
        fontWeight: '500',
        flexShrink: 1,
        marginRight: 10,
    },
    detailValue: {
        fontSize: 16,
        fontFamily: 'Georgia',
        color: '#F4E3D7',
        textAlign: 'right',
        flexGrow: 1,
    },
    valueChanged: {
        color: '#83D2E5',
        fontWeight: 'bold',
    },
    detailInput: {
        flexGrow: 1,
        borderWidth: 1,
        borderColor: '#C9D0D9',
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        color: '#333',
        fontSize: 16,
        fontFamily: 'Georgia',
        textAlign: 'right',
    },
    lowStockWarning: {
        color: '#FF6347',
        fontSize: 15,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        marginTop: 5,
        textAlign: 'center',
    },
    linkButton: {
        marginTop: 10,
        paddingVertical: 8,
        backgroundColor: 'rgba(148, 200, 239, 0.2)',
        borderRadius: 5,
        alignItems: 'center',
    },
    linkText: {
        fontSize: 16,
        fontFamily: 'Georgia',
        color: '#94C8EF',
        textDecorationLine: 'underline',
    },
    editNote: {
        fontSize: 14,
        color: '#D4C2B3',
        marginTop: 10,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    actionsContainer: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        alignItems: 'center',
        minWidth: 120,
        shadowColor: '#94C8EF',
        shadowOffset: { width: 0, height: 2 },
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

const DetailItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <View style={styles.detailItemContainer}>
        <Text style={styles.detailLabel}>{label}:</Text>
        <Text style={styles.detailValue}>{value ?? 'N/A'}</Text>
    </View>
);

export default ProductDetailScreen;