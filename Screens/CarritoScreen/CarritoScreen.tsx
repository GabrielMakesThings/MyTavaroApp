import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  Pressable,
  Alert,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { useUserStore } from '../../utils/useUserStore';

import { Proveedor } from '../../Screens/ProveedoresScreen/ProveedoresScreen';

import LinearGradient from 'react-native-linear-gradient';
import { TabView, TabBar, SceneMap } from 'react-native-tab-view';

// --- TYPES (RawCartItemFromDB, CartItemProcessed, CartSection, RootStackParamList, CarritoScreenNavigationProp) ---

type RawCartItemFromDB = {
  id: string; producto_id: string; cantidad: number; creado_en: string; empresa_id: string; nombre: string | null;
  productos: {
    id: string;
    nombre: string;
    descripcion: string | null;
    precio: number | null;
    iva_tipo: number | null;
    categoria: string;
    unidad: string | null;
    stock_minimo: number | null;
    cantidad_pedido: number | null;
    proveedores: { id: string; nombre: string; canal_pedido: string | null; contacto_telefono: string | null; contacto_email: string | null; } | null; // ADDED contact_email and contact_telefono here
  } | null;
};

type CartItemProcessed = {
  cart_item_id: string; producto_id: string; cantidad: number; creado_en_carrito: string; empresa_id: string;
  nombre_producto: string; carrito_nombre_snap: string | null; descripcion_producto: string | null;
  precio_unitario_base: number; iva_tipo: number | null; categoria_producto: string; unidad_producto: string | null;
  stock_minimo_producto: number; proveedor_id: string | null;
  proveedor_nombre: string;
  proveedor_canal_pedido: string | null;
  proveedor_contacto_telefono: string | null; // ADDED
  proveedor_contacto_email: string | null;    // ADDED
  cantidad_pedido_producto: number | null;
};

type CartSection = {
  title: string;
  proveedor_id: string | null;
  proveedor_canal_pedido: string | null;
  data: CartItemProcessed[];
  total_sum?: number;
};
// END MODIFIED TYPES ---

type RootStackParamList = {
  Carrito: undefined; ProductDetail: { productId: string }; HomeScreen: undefined;
};
type CarritoScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Carrito'>;


// --- EMPRESA TYPE ---
type Empresa = {
  id: string;
  nombre: string;
};


const CarritoScreen = () => {
  const navigation = useNavigation<CarritoScreenNavigationProp>();
  const user = useUserStore((state) => state.user);
  const userEmpresas = useUserStore((state) => state.empresas) || [];
  const isFocused = useIsFocused();

  const [allProcessedCartItems, setAllProcessedCartItems] = useState<CartItemProcessed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const [tabIndex, setTabIndex] = useState(0);
  const [tabRoutes, setTabRoutes] = useState<{ key: string; title: string; empresaId: string }[]>([]);


  // Fetch ALL cart items and process them
  const fetchAndProcessAllCartItems = useCallback(async () => {
    if (!user?.id) {
      setAllProcessedCartItems([]);
      setTabRoutes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data: rawCartData, error: fetchError } = await supabase
        .from('carrito')
        .select(`
          id, producto_id, cantidad, creado_en, empresa_id, nombre,
          productos (
            id, nombre, descripcion, precio, iva_tipo, categoria, unidad, stock_minimo, cantidad_pedido,
            proveedores (id, nombre, canal_pedido, contacto_telefono, contacto_email)
          )
        `)
        .eq('user_id', user.id)
        .returns<RawCartItemFromDB[]>();

      if (fetchError) throw fetchError;

      if (!rawCartData) {
        setAllProcessedCartItems([]);
        setTabRoutes([]);
        return;
      }

      const processedItems: CartItemProcessed[] = rawCartData
        .filter(rawItem => rawItem.productos !== null)
        .map(rawItem => {
          const producto = rawItem.productos!;
          if (!producto.id || !producto.nombre) {
            console.warn(`Skipping cart item ${rawItem.id}: Missing product ID or name.`);
            return null;
          }
          return {
            cart_item_id: rawItem.id, producto_id: producto.id, cantidad: rawItem.cantidad,
            creado_en_carrito: rawItem.creado_en, empresa_id: rawItem.empresa_id,
            nombre_producto: producto.nombre || 'Producto Desconocido',
            carrito_nombre_snap: rawItem.nombre, descripcion_producto: producto.descripcion,
            precio_unitario_base: producto.precio ?? 0,
            iva_tipo: producto.iva_tipo ?? null,
            categoria_producto: producto.categoria || 'N/A',
            unidad_producto: producto.unidad,
            stock_minimo_producto: producto.stock_minimo ?? 0,
            cantidad_pedido_producto: producto.cantidad_pedido ?? null,
            proveedor_id: producto.proveedores?.id || null,
            proveedor_nombre: producto.proveedores?.nombre || 'Proveedor Desconocido',
            proveedor_canal_pedido: producto.proveedores?.canal_pedido || null,
            proveedor_contacto_telefono: producto.proveedores?.contacto_telefono || null, // ADDED
            proveedor_contacto_email: producto.proveedores?.contacto_email || null,    // ADDED
          };
        }).filter((item): item is CartItemProcessed => item !== null);

      setAllProcessedCartItems(processedItems);

      const empresaIdsInCart = [...new Set(processedItems.map(item => item.empresa_id))];
      const activeCartEmpresas = userEmpresas.filter(emp => empresaIdsInCart.includes(emp.id));

      if (activeCartEmpresas.length > 0) {
        setTabRoutes(
          activeCartEmpresas.map(emp => ({
            key: emp.id,
            title: emp.nombre.substring(0, 15),
            empresaId: emp.id,
          }))
        );
        if (activeCartEmpresas.length > 0 && tabIndex >= activeCartEmpresas.length) {
          setTabIndex(0);
        } else if (activeCartEmpresas.length === 0) {
          setTabIndex(0);
        }
      } else {
        setTabRoutes([]);
        setTabIndex(0);
      }

    } catch (e: any) {
      console.error("Error fetching all cart items:", e);
      setError(e.message || "No se pudo cargar el carrito.");
      setAllProcessedCartItems([]);
      setTabRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userEmpresas, tabIndex]);

  useEffect(() => {
    if (isFocused && user?.id) {
      fetchAndProcessAllCartItems();
    } else if (!user?.id) {
      setAllProcessedCartItems([]);
      setTabRoutes([]);
      setLoading(false);
    }
  }, [isFocused, user?.id, fetchAndProcessAllCartItems]);


  const activeEmpresaId = tabRoutes[tabIndex]?.empresaId;
  const activeCartSections = useMemo(() => {
    if (!activeEmpresaId) return [];

    const itemsForActiveEmpresa = allProcessedCartItems.filter(
      item => item.empresa_id === activeEmpresaId
    );

    const groups: Record<string, CartItemProcessed[]> = {};
    itemsForActiveEmpresa.forEach(item => {
      const key = item.proveedor_id || 'sin_proveedor_asignado';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return Object.keys(groups)
      .map(providerKey => {
        const itemsInGroup = groups[providerKey];
        const firstItem = itemsInGroup[0];

        const groupTotal = itemsInGroup.reduce((sum, item) => {
          const precioConIva = item.precio_unitario_base * (1 + (item.iva_tipo || 0) / 100);
          const totalActualBaseUnits = item.cantidad * (item.cantidad_pedido_producto || 1);
          return sum + (precioConIva * totalActualBaseUnits);
        }, 0);

        return {
          title: providerKey === 'sin_proveedor_asignado'
            ? 'Productos Sin Proveedor Asignado'
            : (firstItem.proveedor_nombre || 'Proveedor Desconocido'),
          proveedor_id: providerKey === 'sin_proveedor_asignado' ? null : firstItem.proveedor_id,
          proveedor_canal_pedido: providerKey === 'sin_proveedor_asignado' ? null : (firstItem.proveedor_canal_pedido || null),
          data: itemsInGroup,
          total_sum: groupTotal,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allProcessedCartItems, activeEmpresaId]);


  const handleUpdateQuantity = async (cart_item_id: string, newQuantity: number) => {
    if (newQuantity < 1) { await handleRemoveItem(cart_item_id); return; }
    try {
      const { error } = await supabase.from('carrito').update({ cantidad: newQuantity }).eq('id', cart_item_id).eq('user_id', user?.id);
      if (error) throw error;
      fetchAndProcessAllCartItems();
    } catch (e: any) { Alert.alert("Error", `No se pudo actualizar la cantidad: ${e.message}`); }
  };
  const handleRemoveItem = async (cart_item_id: string) => {
    try {
      const { error } = await supabase.from('carrito').delete().eq('id', cart_item_id).eq('user_id', user?.id);
      if (error) throw error;
      fetchAndProcessAllCartItems();
      Alert.alert("Éxito", "Producto eliminado del carrito.");
    } catch (e: any) { Alert.alert("Error", `No se pudo eliminar el producto: ${e.message}`); }
  };


  // --- NEW HELPER FUNCTION: generate HTML for email ---
  const generateOrderEmailHtml = (orderSummaryText: string, companyName: string, providerName: string) => {
    // Basic conversion of plain text into HTML paragraphs and bolding where appropriate
    const htmlContent = orderSummaryText
      .replace(/\n/g, '<br/>') // Convert newlines to HTML breaks
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>'); // Convert *text* to <strong>text</strong>

    return `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
              .header { background-color: #f0f0f0; padding: 10px; border-bottom: 1px solid #ddd; text-align: center; }
              .footer { margin-top: 20px; font-size: 0.8em; color: #777; text-align: center; }
              strong { font-weight: bold; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h2>Nuevo Pedido de ${companyName}</h2>
              </div>
              <p>Hola ${providerName},</p>
              <p>Has recibido un nuevo pedido de ${companyName}. Aquí están los detalles:</p>
              <p>${htmlContent}</p>
              <p>Si tienes alguna pregunta, no dudes en contactar con ${companyName}.</p>
              <div class="footer">
                  <p>Este email fue enviado automáticamente desde tu aplicación.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  };

  // MODIFIED: createOrderFromItemsAndClearCart now encapsulates the notification logic
  const createOrderFromItemsAndClearCart = async (
    itemsToOrder: CartItemProcessed[],
    proveedorId: string | null, // The provider ID associated with this specific order batch
    empresaIdForOrder: string // The current company's ID for the order
  ): Promise<boolean> => { // Returns true on success, false on failure
    if (!user?.id) {
        Alert.alert("Error", "Usuario no identificado.");
        return false;
    }
    setIsProcessingOrder(true);

    const rpcItemsData = itemsToOrder.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        id_item_carrito: item.cart_item_id,
    }));

    if (!empresaIdForOrder) {
        Alert.alert("Error", "Empresa asociada al pedido no encontrada.");
        setIsProcessingOrder(false);
        return false;
    }

    let newOrderId: string | null = null;

    try {
        // Step 1: Process order in DB via RPC (Critical for order persistence & stock)
        const { data: generatedOrderId, error: rpcError } = await supabase.rpc('procesar_pedido_y_actualizar_stock', {
            p_id_usuario: user.id,
            p_items_pedido: rpcItemsData,
            p_empresa_id: empresaIdForOrder,
        });

        if (rpcError) {
            console.error("Error al llamar a la función RPC 'procesar_pedido_y_actualizar_stock':", rpcError);
            throw rpcError;
        }
        if (!generatedOrderId) {
            throw new Error("RPC did not return an order ID.");
        }
        newOrderId = generatedOrderId;

        let notificationSent = false;
        let providerChannel: string | null = null;
        let providerPhoneNumber: string | null = null;
        let providerEmail: string | null = null;

        // Fetch contact details of the specific provider for this order batch
        if (proveedorId) {
            const { data: providerData, error: providerFetchError } = await supabase
                .from('proveedores')
                .select('canal_pedido, contacto_telefono, contacto_email, nombre')
                .eq('id', proveedorId)
                .single();
            if (providerFetchError) console.warn("Could not fetch provider details for notification:", providerFetchError.message);
            else {
                providerChannel = providerData?.canal_pedido || null;
                providerPhoneNumber = providerData?.contacto_telefono || null;
                providerEmail = providerData?.contacto_email || null;
            }
        }

        // --- Build the Order Message ---
        const companyNameForMessage = tabRoutes.find(r => r.empresaId === empresaIdForOrder)?.title || 'Tu Empresa';
        const providerNameForMessage = (proveedorId && itemsToOrder[0]?.proveedor_nombre) ? itemsToOrder[0].proveedor_nombre : 'Proveedor Desconocido'; // Use actual provider name

        let orderSummaryMessage = `📋 Nuevo Pedido para ${providerNameForMessage} de ${companyNameForMessage}:\n\n`;
        itemsToOrder.forEach(item => {
            orderSummaryMessage += `📦 ${item.nombre_producto}: *${item.cantidad} ${item.unidad_producto}*\n`;
        });
        orderSummaryMessage += `\nTotal Estimado: *€${itemsToOrder.reduce((sum, item) => sum + (item.precio_unitario_base * (1 + (item.iva_tipo || 0) / 100)) * (item.cantidad_pedido_producto || 1), 0).toFixed(2)}*\n`;
        orderSummaryMessage += `Fecha del Pedido: ${new Date().toLocaleDateString('es-ES')}\n`;
        orderSummaryMessage += `\n¡Gracias!`;

        let orderSummaryHtmlBody = generateOrderEmailHtml(orderSummaryMessage, companyNameForMessage, providerNameForMessage);


        // --- A. Handle Provider Notification (Automated Email via Resend OR Manual WhatsApp) ---
        if (proveedorId) {
            // Case 1: Provider uses Email channel -> Send via Resend Edge Function
            if (providerChannel === 'Email' && providerEmail) {
                try {
                    const providerSubject = `Nuevo Pedido de ${companyNameForMessage}`;
                    const { data: edgeFunctionResponse, error: edgeFunctionError } = await supabase.functions.invoke('send_admin_email_notification', { // Reusing the admin email function, ensure it's generic
                        body: {
                            to: providerEmail,
                            subject: providerSubject,
                            htmlBody: orderSummaryHtmlBody,
                            textBody: orderSummaryMessage,
                        },
                    });

                    if (edgeFunctionError) throw edgeFunctionError;
                    notificationSent = true;
                    console.log(`Email sent to provider ${providerEmail}:`, edgeFunctionResponse);
                } catch (emailErr: any) {
                    console.error(`Error sending email to provider ${providerEmail}: ${emailErr.message}`);
                    Alert.alert("Error", `No se pudo enviar email al proveedor ${providerNameForMessage}: ${emailErr.message}`);
                }
            }
            // Case 2: Provider uses WhatsApp channel -> Manual via Linking.openURL
            else if (providerChannel === 'WhatsApp' && providerPhoneNumber) {
                const cleanPhoneNumber = providerPhoneNumber.replace(/\D/g, ''); // Remove non-digits
                const whatsappUrl = `whatsapp://send?phone=${cleanPhoneNumber}&text=${encodeURIComponent(orderSummaryMessage)}`;
                const supported = await Linking.canOpenURL(whatsappUrl);
                if (supported) {
                    await Linking.openURL(whatsappUrl);
                    notificationSent = true; // Still counts as a manual notification prepared
                    Alert.alert("Acción Requerida", `WhatsApp abierto para ${providerNameForMessage}. Pulsa 'Enviar' para confirmar el pedido al proveedor.`);
                } else {
                    Alert.alert("Error", "WhatsApp no está instalado o no se puede abrir.");
                }
            }
            // Case 3: Provider uses 'Encargado' channel OR No specific contact method set for provider
            // Fall through to send email to Admins (handled below)
        }


        // --- B. Handle Admin Notification (AUTOMATED Email via Resend) ---
        // This should apply in two scenarios:
        // 1. If a specific provider is marked as 'Encargado' (manual action needed by admin).
        // 2. If it's a general company order (proveedorId is null), the admins should also be notified.

        const shouldNotifyAdmins = (proveedorId && providerChannel === 'Encargado') || proveedorId === null; // New condition

        if (shouldNotifyAdmins) {
            console.log(`Sending email to admins for company ${empresaIdForOrder}. (Source: ${proveedorId ? 'Encargado Provider' : 'Overall Company Order'})`);

            // Fetch admins with their emails from usuarios_empresas
            const { data: admins, error: adminsError } = await supabase
                .from('usuarios_empresas')
                .select(`email, recibe_pedido, rol`)
                .eq('empresa_id', empresaIdForOrder)
                .eq('rol', 'Admin') // Filter for Admin role
                .eq('recibe_pedido', true) // Filter for those who want order notifications
                .not('email', 'is', null); // Only admins who have an email

            if (adminsError) {
                console.error("Error fetching admins for email notification:", adminsError.message);
                Alert.alert("Error", "No se pudieron obtener los contactos de email de los administradores.");
            } else if (admins && admins.length > 0) {
                let emailsSentCount = 0;
                for (const admin of admins) {
                    const adminEmail = admin.email;
                    if (adminEmail) {
                        try {
                            let adminSubject = `[ADMIN] Nuevo Pedido para ${providerNameForMessage} (${companyNameForMessage})`;
                            if (proveedorId && providerChannel === 'Encargado') { // If it's an 'Encargado' order, add special note
                                adminSubject = `[ADMIN - ENCARGADO] ${adminSubject}`;
                                orderSummaryHtmlBody += '<p><strong>Nota: Este pedido ha sido marcado como \'Encargado\' y requiere una acción manual.</strong></p>';
                                orderSummaryMessage += '\n\nNota: Este pedido ha sido marcado como \'Encargado\' y requiere una acción manual.';
                            }

                            const { data: edgeFunctionResponse, error: edgeFunctionError } = await supabase.functions.invoke('send_admin_email_notification', {
                                body: {
                                    to: adminEmail,
                                    subject: adminSubject,
                                    htmlBody: orderSummaryHtmlBody,
                                    textBody: orderSummaryMessage,
                                },
                            });

                            if (edgeFunctionError) throw edgeFunctionError;
                            emailsSentCount++;
                            console.log(`Email sent to admin ${adminEmail}:`, edgeFunctionResponse);
                        } catch (emailErr: any) {
                            console.error(`Error sending email to admin ${adminEmail}: ${emailErr.message}`);
                        }
                    }
                }
                if (emailsSentCount > 0) {
                    Alert.alert("Éxito", `Email(s) de notificación enviado(s) a ${emailsSentCount} administrador(es)`);
                    notificationSent = true;
                } else {
                    Alert.alert("Info", "No hay administradores configurados con un email válido en esta empresa para recibir notificaciones de pedido.");
                }
            } else {
                Alert.alert("Info", "No hay administradores configurados para recibir notificaciones de pedido en esta empresa.");
            }
        }

        // Final Alert for the user
        Alert.alert("Éxito", notificationSent ? "Pedido guardado y notificaciones preparadas." : "Pedido guardado, no se enviaron notificaciones automáticas (ni manuales con WhatsApp/Email).");
        return true; // <<< Return true on successful RPC outcome and notification handling

    } catch (e: any) {
        console.error("Error al procesar el pedido o notificar:", e);
        const errorMessage = e?.message || "Ocurrió un error desconocido al procesar el pedido o enviar notificaciones.";
        Alert.alert("Error", errorMessage);
        return false; // <<< Return false on any error
    } finally {
        setIsProcessingOrder(false);
        // fetchAndProcessAllCartItems(); // MOVED THIS CALL
    }
  };

  const handleMakeOrderForProvider = async (proveedor_id: string | null) => {
    const section = activeCartSections.find(s => s.proveedor_id === proveedor_id);
    if (!section || section.data.length === 0) { Alert.alert("Info", "No hay productos para este proveedor."); return; }

    const empresaIdForCurrentSection = section.data[0].empresa_id;

    const success = await createOrderFromItemsAndClearCart(
        section.data,
        section.proveedor_id,
        empresaIdForCurrentSection
    );
    if (success) { // <<< Added check here
        fetchAndProcessAllCartItems(); // <<< Call only on success
    }
  };

  const handleEnviarPedidoParaEmpresaActual = async () => {
    if (!activeEmpresaId || activeCartSections.length === 0 || activeCartSections.every(s => s.data.length === 0)) {
      Alert.alert("Info", "No hay items en el carrito para esta empresa.");
      return;
    }
    const itemsForCurrentEmpresa = activeCartSections.reduce((acc, section) => acc.concat(section.data), [] as CartItemProcessed[]);

    // For the overall company order, it implies a single order for the current active tab's company.
    // In this scenario, there's no single provider, so `proveedorId` should be `null`.
    const success = await createOrderFromItemsAndClearCart(
        itemsForCurrentEmpresa,
        null, // No specific vendor for this overall company order
        tabRoutes[tabIndex]?.empresaId // The current active company's ID
    );
    if (success) { // <<< Added check here
        fetchAndProcessAllCartItems(); // <<< Call only on success
    }
  };


  const renderCartItem = ({ item }: { item: CartItemProcessed }) => {
    const precioConIvaItem = item.precio_unitario_base * (1 + (item.iva_tipo || 0) / 100);
    const totalActualBaseUnits = item.cantidad * (item.cantidad_pedido_producto || 1);
    const totalItem = precioConIvaItem * totalActualBaseUnits;

    return (
      <View style={styles.cartItemRow}>
        <View style={styles.itemDetails}>
          <Pressable onPress={() => navigation.navigate('ProductDetail', { productId: item.producto_id })}>
            <Text style={styles.productName}>{item.nombre_producto}</Text>
          </Pressable>
          <Text style={styles.itemPriceSmall}>
            {`€${precioConIvaItem.toFixed(2)}/${item.unidad_producto || 'u'}`}
            {item.cantidad_pedido_producto && item.cantidad_pedido_producto > 1
                ? ` (${item.cantidad_pedido_producto} ${item.unidad_producto}s/paquete)`
                : ''}
            {` | Total: €${totalItem.toFixed(2)}`}
          </Text>
        </View>
        <View style={styles.quantityControls}>
          <Pressable style={styles.quantityButton} onPress={() => handleUpdateQuantity(item.cart_item_id, item.cantidad - 1)} disabled={isProcessingOrder}><Text style={styles.quantityButtonText}>-</Text></Pressable>
          <Text style={styles.quantityText}>{item.cantidad}</Text>
          <Pressable style={styles.quantityButton} onPress={() => handleUpdateQuantity(item.cart_item_id, item.cantidad + 1)} disabled={isProcessingOrder}><Text style={styles.quantityButtonText}>+</Text></Pressable>
        </View>
        <Pressable style={styles.removeItemButton} onPress={() => handleRemoveItem(item.cart_item_id)} disabled={isProcessingOrder}><Text style={styles.removeItemButtonText}>✕</Text></Pressable>
      </View>
    );
  };
  const renderSectionHeader = ({ section }: { section: CartSection }) => {
    return (
      <View style={[styles.providerSectionHeader, styles.section]}>
        <Text style={styles.providerNameText}>
          {section.title}
          {section.total_sum !== undefined ? (
            <Text style={styles.providerTotalSum}> - €{section.total_sum.toFixed(2)}</Text>
          ) : null}
        </Text>
        <Pressable
          style={[styles.makeOrderButton, (isProcessingOrder || section.data.length === 0) ? styles.buttonDisabled : null]}
          onPress={() => handleMakeOrderForProvider(section.proveedor_id)}
          disabled={isProcessingOrder || section.data.length === 0}
        >
          <Text style={styles.makeOrderButtonText}>Pedir a Proveedor</Text>
        </Pressable>
      </View>
    );
  }

 const EmpresaCartView = ({ empresaId }: { empresaId: string }) => {
    return (
      <View style={{ flex: 1 }}>
        <SectionList
          sections={activeCartSections}
          keyExtractor={(item) => item.cart_item_id}
          renderItem={renderCartItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={
            (!loading && !isProcessingOrder) ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyCartText}>No hay productos en el carrito para esta empresa.</Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContentContainerPerTab}
          stickySectionHeadersEnabled={false}
        />

        {activeCartSections.length > 0 && activeCartSections.some(s => s.data.length > 0) ? (
          <Pressable
            style={[styles.sendOverallOrderButton, isProcessingOrder ? styles.buttonDisabled : null]}
            onPress={handleEnviarPedidoParaEmpresaActual}
            disabled={isProcessingOrder}
          >
            <Text style={styles.sendOverallOrderButtonText}>
              Enviar Pedido ({tabRoutes[tabIndex]?.title || ''})
            </Text>
          </Pressable>
        ) : null}
      </View>
    );

  };

  const renderScene = SceneMap(
    tabRoutes.reduce((scenes, route) => {
      scenes[route.key] = () => <EmpresaCartView empresaId={route.empresaId} />;
      return scenes;
    }, {} as Record<string, () => React.ReactElement>)
  );


  if (loading && !isProcessingOrder && tabRoutes.length === 0) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centeredLoader}>
        <ActivityIndicator size="large" color="#FFF1D8" />
        <Text style={styles.loadingText}>Cargando carrito...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.centeredLoader}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={fetchAndProcessAllCartItems} style={styles.button}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </Pressable>
      </LinearGradient>
    );
  }

    return (
    <LinearGradient colors={['#00336C', '#00234B', '#011F41']} style={styles.container}>
      <Text style={styles.pageTitle}>Tu Pedido</Text>

      {/* Overlay de procesamiento (siempre visible sobre todo lo demás si está activo) */}
      {isProcessingOrder ? (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FFF1D8" />
          <Text style={styles.processingText}>Procesando...</Text>
        </View>
      ) : null}

      {/* MENSAJE DE CARRITO VACÍO GLOBAL (Nuevo lugar) */}
      {tabRoutes.length === 0 && !loading && !isProcessingOrder ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyCartText}>Tu carrito está vacío para todas tus empresas.</Text>
        </View>
      ) : null}
      {tabRoutes.length > 0 ? (
        <TabView
          navigationState={{ index: tabIndex, routes: tabRoutes }}
          renderScene={renderScene}
          onIndexChange={setTabIndex}
          initialLayout={{ width: Dimensions.get('window').width }}
          renderTabBar={props => (
            <TabBar
              {...props}
              indicatorStyle={styles.tabIndicator}
              style={styles.tabBar}
              scrollEnabled={tabRoutes.length > 3}
              tabStyle={styles.tabStyle}
            />
          )}
        />
      ) : null}
    </LinearGradient>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#F4E3D7',
    fontFamily: 'Georgia',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'Georgia',
  },
  pageTitle: {
    fontSize: 28,
    top: 100,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#F4E3D7',
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 15,
  },
  listContentContainer: {
    paddingHorizontal: 10,
    paddingBottom: 80,
  },
  section: {
    backgroundColor: 'rgba(244, 227, 215, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  providerSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 227, 215, 0.2)',
    marginTop: 50,
    paddingBottom: 8,
    marginBottom: 8,
  },
  providerNameText: {
    fontSize: 18,
    fontFamily: 'Georgia',
    fontWeight: '600',
    color: '#E0CDBB',
    flex: 1,
    marginRight: 10,
  },
  providerTotalSum: {
    fontSize: 14,
    color: '#94C8EF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  makeOrderButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  makeOrderButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 227, 215, 0.1)',
  },
  itemDetails: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#F4E3D7',
    marginBottom: 3,
  },
  itemPriceSmall: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#D4C2B3',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  quantityButton: {
    backgroundColor: 'rgba(148, 200, 239, 0.3)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  quantityButtonText: {
    color: '#FFF1D8',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Georgia',
  },
  quantityText: {
    fontSize: 16,
    color: '#F4E3D7',
    fontFamily: 'Georgia',
    minWidth: 20,
    textAlign: 'center',
  },
  removeItemButton: {
    padding: 8,
  },
  removeItemButtonText: {
    color: '#E74C3C',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyCartText: {
    fontSize: 18,
    color: '#B0C4DE',
    fontFamily: 'Georgia',
    textAlign: 'center',
  },
  sendOverallOrderButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    margin: 15,
    alignItems: 'center',
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  sendOverallOrderButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: '#6c757d',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFA500',
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Georgia',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingText: {
    color: '#F4E3D7',
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Georgia',
  },
  tabBar: {
    backgroundColor: 'rgba(0, 35, 75, 0.7)',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 200, 239, 0.3)'
  },
  tabIndicator: {
    backgroundColor: '#94C8EF',
    height: 3,
  },
  tabLabel: {
    color: '#F4E3D7',
    fontFamily: 'Georgia',
    fontSize: 13,
    textTransform: 'none',
  },
  tabStyle: {
    paddingHorizontal: 10,
  },
  listContentContainerPerTab: {
    paddingHorizontal: 5,
    paddingBottom: 80,
  },
});

export default CarritoScreen;