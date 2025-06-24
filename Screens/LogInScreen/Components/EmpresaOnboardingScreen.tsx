import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, FlatList } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../../../utils/supabase'; // Adjust path
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useUserStore } from '../../../utils/useUserStore';
import { RootStackParamList } from './types';
import { StackScreenProps } from '@react-navigation/stack';

type Props = StackScreenProps<RootStackParamList, 'EmpresaOnboardingScreen'>;

const EmpresaOnboardingScreen: React.FC<Props> = ({ navigation, route }) => {
    // Get userId passed from LoginScreen or SignUpScreen
    const { userId } = route.params;

    const [newEmpresaName, setNewEmpresaName] = useState('');
    const [searchEmpresaQuery, setSearchEmpresaQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]); // Consider a more specific type for Empresa
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');


    const setEmpresas = useUserStore((state) => state.setEmpresas); // To update Zustand global state

    // Function to re-fetch and update user's companies in Zustand
    const fetchUserEmpresasAndUpdateStore = async (currentUserId: string) => {
        try {
            const { data: userEmpresasData, error: userEmpresasError } = await supabase
                .from('usuarios_empresas')
                .select('*, empresas(*)')
                .eq('usuario_id', currentUserId);

            if (userEmpresasError) {
                console.error('Error fetching user companies for store update:', userEmpresasError);
                return;
            }

            const empresas = userEmpresasData || [];
            const mappedEmpresas = empresas.map((item) => ({
                ...item.empresas,
                rol: item.rol,
                user_empresa_id: item.id,
                user_empresa_creado_en: item.creado_en,
            }));
            setEmpresas(mappedEmpresas); // Update global state
        } catch (err: any) {
            console.error('Error in fetchUserEmpresasAndUpdateStore:', err);
        }
    };

    // Debounce search input for existing companies
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (searchEmpresaQuery.length > 2) { // Only search if query is at least 3 chars
                handleSearchEmpresas();
            } else {
                setSearchResults([]); // Clear results if query is too short
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(delaySearch);
    }, [searchEmpresaQuery]);

    // Handle creating a brand new company
    const handleCreateNewEmpresa = async () => {
        setError('');
        if (!newEmpresaName.trim()) {
            setError('Por favor, ingresa el nombre de la nueva empresa.');
            return;
        }
        setLoading(true);

        try {
            // 1. Create the new company in the 'empresas' table
            const { data: empresaData, error: empresaError } = await supabase
                .from('empresas')
                .insert([{ nombre: newEmpresaName.trim(), plan: 'basic', activo: true }]) // Default plan and active status
                .select('*') // Select the newly created row to get its ID
                .single(); // Expecting one row

            if (empresaError || !empresaData) {
                throw empresaError || new Error('No se pudo crear la empresa. Datos no devueltos.');
            }

            // 2. Link the current user to this new company in 'usuarios_empresas' with 'admin' role
            const { error: userEmpresaLinkError } = await supabase
                .from('usuarios_empresas')
                .insert([{
                    usuario_id: userId,
                    empresa_id: empresaData.id,
                    rol: 'admin', // The creator of the company is an admin by default
                    email: useUserStore.getState().user?.email || '' // Assuming user email is available in Zustand
                }]);

            if (userEmpresaLinkError) {
                throw userEmpresaLinkError;
            }

            Alert.alert('Éxito', `'${newEmpresaName}' creada y asociada ¡Bienvenido!`);
            await fetchUserEmpresasAndUpdateStore(userId); // Update Zustand store
            navigation.navigate('HomeScreen'); // Navigate to home

        } catch (err: any) {
            setError(err.message);
            Alert.alert('Error al crear empresa', err.message);
            console.error('Error creating new empresa:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle searching for existing companies
    const handleSearchEmpresas = async () => {
        setError('');
        if (!searchEmpresaQuery.trim() || searchEmpresaQuery.length < 3) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        try {
            const { data, error: searchError } = await supabase
                .from('empresas')
                .select('*')
                .ilike('nombre', `%${searchEmpresaQuery.trim()}%`); // Case-insensitive partial match search

            if (searchError) {
                throw searchError;
            }
            setSearchResults(data || []);
        } catch (err: any) {
            setError(err.message);
            Alert.alert('Error al buscar empresas', err.message);
            console.error('Error searching empresas:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle joining an existing company
    const handleJoinExistingEmpresa = async (empresaId: string, empresaNombre: string) => {
        setError('');
        setLoading(true);

        try {
            // Optional: Check if user is already linked to this company to prevent duplicates
            const { data: existingLink, error: checkError } = await supabase
                .from('usuarios_empresas')
                .select('id')
                .eq('usuario_id', userId)
                .eq('empresa_id', empresaId)
                .single();

            // Supabase returns a specific code for No Rows Found (PGRST116).
            // Only throw error if it's not a 'no rows found' error.
            if (checkError && checkError.code !== 'PGRST116') {
                 throw checkError;
            }

            if (existingLink) {
                Alert.alert('Alerta', 'Ya estás asociado a esta empresa.');
                setLoading(false);
                return;
            }

            // Link the current user to the selected existing company with 'member' role
            const { error: userEmpresaLinkError } = await supabase
                .from('usuarios_empresas')
                .insert([{
                    usuario_id: userId,
                    empresa_id: empresaId,
                    rol: 'member', // Default role for joining an existing company
                    email: useUserStore.getState().user?.email || ''
                }]);

            if (userEmpresaLinkError) {
                throw userEmpresaLinkError;
            }

            Alert.alert('Éxito', `Te has unido a '${empresaNombre}'`);
            await fetchUserEmpresasAndUpdateStore(userId); // Update Zustand state
            navigation.navigate('HomeScreen'); // Navigate to home

        } catch (err: any) {
            setError(err.message);
            Alert.alert('Error al unirse a empresa', err.message);
            console.error('Error joining empresa:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle skipping company association
    const handleSkip = () => {
        Alert.alert(
            'Atención',
            'No podrás interactuar con las funciones principales de la aplicación hasta que te asocies a una empresa. Puedes hacerlo más tarde desde tu perfil si la aplicación lo permite.',
            [
                {
                    text: 'Entendido',
                    onPress: () => navigation.navigate('HomeScreen') // Allow user to proceed without company
                }
            ]
        );
    };

    return (
        <LinearGradient
            colors={['#003978', '#012349', '#00152C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            <View style={styles.container}>
                <Image source={require('/Users/nachorojas/Documents/TavaroApp/Screens/LogInScreen/Assets/Logo.png')} style={styles.logo} />
                <Text style={styles.title}>Configura tu Empresa</Text>
                <Text style={styles.description}>
                    ¿Tu cuenta pertenece a una empresa existente o vas a crear una nueva?
                </Text>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Crear Nueva Empresa</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre de la nueva empresa"
                        value={newEmpresaName}
                        onChangeText={setNewEmpresaName}
                        placeholderTextColor="#A0A0A0"
                    />
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleCreateNewEmpresa}
                        disabled={loading}
                    >
                        {loading && !searchEmpresaQuery ? ( // Only show if loading for creation
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Crear y Unirse</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Unirse a Empresa Existente</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Buscar nombre de empresa"
                        value={searchEmpresaQuery}
                        onChangeText={setSearchEmpresaQuery}
                        placeholderTextColor="#A0A0A0"
                    />
                    {loading && searchEmpresaQuery.length > 2 ? <ActivityIndicator color="#ffffff" /> : null}
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.searchResultItem}
                                onPress={() => handleJoinExistingEmpresa(item.id, item.nombre)}
                            >
                                <Text style={styles.searchResultText}>{item.nombre}</Text>
                                <Text style={styles.joinButtonText}>Unirse</Text>
                            </TouchableOpacity>
                        )}
                        style={styles.searchResultsContainer}
                        ListEmptyComponent={
                            searchEmpresaQuery.length > 2 && !loading && searchResults.length === 0 ? (
                                <Text style={styles.noResultsText}>No se encontraron empresas con ese nombre.</Text>
                            ) : null
                        }
                    />
                </View>

                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipButtonText}>Omitir por ahora</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: 'transparent' as the gradient covers it
        alignItems: 'center',
        padding: 16,
        paddingTop: 50, // Give some space from the top for the logo
    },
    logo: {
        width: 150, // Adjust size as needed for this screen
        height: 100,
        marginBottom: 20,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#E0E0E0',
        marginBottom: 30,
        textAlign: 'center',
        width: '90%',
    },
    section: {
        width: '90%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle background for sections
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 15,
    },
    input: {
        width: '100%',
        backgroundColor: '#ffffff',
        padding: 12,
        marginBottom: 15,
        borderRadius: 10,
        color: '#000', // Ensure text is visible
    },
    button: {
        backgroundColor: '#58A6FF',
        padding: 15,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontFamily: 'Marcellus-Regular', // Ensure this font is properly linked
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#FFD700', // Yellowish for better visibility on dark backgrounds
        marginBottom: 12,
        textAlign: 'center',
        width: '90%',
    },
    // Search Results Specific Styles
    searchResultsContainer: {
        maxHeight: 150, // Limit height to prevent a very long list
        width: '100%',
        marginTop: 10,
        // borderColor: '#ccc', // Optional: for debugging layout
        // borderWidth: 1,
    },
    searchResultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)', // Slightly different background for items
        padding: 10,
        borderRadius: 5,
        marginBottom: 5,
    },
    searchResultText: {
        color: '#ffffff',
        fontSize: 16,
        flex: 1, // Allows text to take available space
    },
    joinButtonText: {
        color: '#58A6FF',
        fontWeight: 'bold',
        marginLeft: 10, // Space from text
    },
    noResultsText: {
        color: '#E0E0E0',
        textAlign: 'center',
        marginTop: 10,
    },
    // Skip Button Styles
    skipButton: {
        marginTop: 20,
        padding: 10,
    },
    skipButtonText: {
        color: '#AAAAAA', // Muted color
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    gradient: {
        flex: 1,
    },
});

export default EmpresaOnboardingScreen;