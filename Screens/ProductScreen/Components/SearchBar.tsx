import React, {useState, useRef} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  Keyboard,
} from 'react-native';
import {useSearch} from '/Users/nachorojas/Documents/TavaroApp/Components/SearchContext.jsx';
import SearchBarFilter from '/Users/nachorojas/Documents/TavaroApp/Screens/ProductScreen/Assets/searchbarFilter.svg';
import {Picker} from '@react-native-picker/picker';

const {width} = Dimensions.get('window');

interface CustomSearchBarStyles {
  container?: object;
  searchBar?: object;
  input?: object;
}

const SearchBar = ({
  customStyles,
  products,
  setFilteredProducts,
}: {
  customStyles: CustomSearchBarStyles;
  products: any[];
  setFilteredProducts: (filtered: any[]) => void;
}) => {
  const {searchText, setSearchText} = useSearch();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const textInputRef = useRef<TextInput>(null);

  const toggleModal = () => setIsModalVisible(!isModalVisible);

  const handleSearchTextChange = (text: string) => {
    console.log('Texto ingresado:', text); // Debugging log
    setSearchText(text); // Update searchText in context
    filterProducts(text); // Call filterProducts with the new search text
  };

  const filterProducts = (query: string) => {
    const lowercasedQuery = query.toLowerCase();
    const filtered = products.filter(product => {
      return (
        product.nombre.toLowerCase().includes(lowercasedQuery) ||
        product.proveedor.toLowerCase().includes(lowercasedQuery) ||
        product.precio.toString().includes(lowercasedQuery)
      );
    });

    console.log('Filtered products:', filtered); // Log filtered results
    setFilteredProducts(filtered); // Update the filtered products
  };

  const applyFilters = () => {
    let filtered = products;

    // Apply search text filter
    if (searchText) {
      filtered = filtered.filter(
        product =>
          product.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
          product.proveedor.toLowerCase().includes(searchText.toLowerCase()) ||
          product.precio.toString().includes(searchText.toLowerCase()),
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(
        product => product.categoria === selectedCategory,
      );
    }

    // Apply price range filter
    if (minPrice) {
      filtered = filtered.filter(
        product => product.precio >= parseFloat(minPrice),
      );
    }
    if (maxPrice) {
      filtered = filtered.filter(
        product => product.precio <= parseFloat(maxPrice),
      );
    }

    setFilteredProducts(filtered);
    toggleModal(); // Close the modal after applying filters
  };

  const resetFilters = () => {
    setSelectedCategory(null);
    setMinPrice('');
    setMaxPrice('');
    setFilteredProducts(products); // Reset to the full list
    toggleModal(); // Close the modal after resetting filters
  };

  return (
    <View style={[styles.container, customStyles?.container]}>
      <View style={[styles.searchBarContainer, customStyles?.searchBar]}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            if (textInputRef.current) {
              textInputRef.current.focus(); // Focus the TextInput when clicked
            }
          }}>
          <SearchBarFilter width={24} height={24} />
        </TouchableOpacity>
        <TextInput
          ref={textInputRef} // Add a ref to the TextInput
          style={[styles.input, customStyles?.input]}
          placeholder="Buscar producto..."
          placeholderTextColor="#EDA46A"
          value={searchText}
          onChangeText={handleSearchTextChange} // Call handleSearchTextChange on text change
          onBlur={() => Keyboard.dismiss()} // Dismiss keyboard when losing focus
        />
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={toggleModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtros de búsqueda</Text>

            {/* Filter by Category */}
            <Text style={styles.filterLabel}>Categoría:</Text>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={(itemValue: string | null) =>
                setSelectedCategory(itemValue)
              } // Add type for itemValue
            >
              <Picker.Item label="Todas" value={null} />
              <Picker.Item label="Bar" value="Bar" />
              <Picker.Item label="Kitchen" value="Kitchen" />
              <Picker.Item label="Coffee" value="Coffee" />
              <Picker.Item label="Clean" value="Clean" />
            </Picker>

            {/* Filter by Price Range */}
            <Text style={styles.filterLabel}>Rango de precios:</Text>
            <TextInput
              style={styles.input}
              placeholder="Precio mínimo"
              keyboardType="numeric"
              value={minPrice}
              onChangeText={(text: string) => setMinPrice(text)} // Add type for text
            />
            <TextInput
              style={styles.input}
              placeholder="Precio máximo"
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={(text: string) => setMaxPrice(text)} // Add type for text
            />

            {/* Apply Filters Button */}
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>

            {/* Reset Filters Button */}
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Restablecer Filtros</Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity onPress={toggleModal}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 40,
    shadowOffset: {width: 0, height: 4},
    elevation: 5,
    shadowColor: '#94C8EF',
    shadowOpacity: 0.4,
    shadowRadius: 7,
    marginTop: 20,
  },
  filterButton: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    color: '#00234B',
    fontFamily: 'Georgia',
    fontWeight: 'normal',
    fontStyle: 'italic',
    backgroundColor: 'transparent',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: width * 0.8,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00234B',
    marginBottom: 20,
  },
  filterLabel: {
    fontFamily: 'Georgia',
    fontSize: 14,
    color: '#00234B',
    marginTop: 10,
  },
  applyButton: {
    backgroundColor: '#00234B',
    padding: 10,
    borderRadius: 6,
    marginTop: 20,
  },
  applyButtonText: {
    color: '#F4E3D7',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#E74C3C',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
  },
});

export default SearchBar;
