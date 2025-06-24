// EmpresaFilter.tsx
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';

// --- Configuration Constants ---
const TAB_ITEM_HEIGHT = 25;
const TAB_MARGIN_BOTTOM = 8;
const NUM_VISIBLE_TABS = 3;
const SCROLLVIEW_MAX_HEIGHT =
  (NUM_VISIBLE_TABS * TAB_ITEM_HEIGHT) + ((NUM_VISIBLE_TABS - 1) * TAB_MARGIN_BOTTOM);

// --- Type Definitions ---
interface Empresa { // Updated to match your provided structure
  id: string;
  nombre: string;
  plan: string; // Assuming 'plan' is a string, adjust if it's another type (e.g., an enum or specific literals)
  activo: boolean;
  creado_en: string; // timestamptz usually comes as an ISO string
}

interface EmpresaFilterProps {
  empresas: Empresa[] | undefined;
  selectedEmpresaId: string | undefined;
  onSelectEmpresa: (id: string) => void;
}

const EmpresaFilter: React.FC<EmpresaFilterProps> = ({
  empresas,
  selectedEmpresaId,
  onSelectEmpresa,
}) => {
  if (!empresas || empresas.length === 0) {
    return null;
  }
  return (
    <View style={styles.filterOuterContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContentContainer}
        showsVerticalScrollIndicator={empresas.length > NUM_VISIBLE_TABS} // Show indicator only if actually scrollable
        nestedScrollEnabled={true} // Good for potential nesting, though likely not an issue here
      >
        {empresas.map((empresa, index) => (
          <Pressable
            key={empresa.id}
            style={[
              styles.tab,
              selectedEmpresaId === empresa.id && styles.activeTab,
              // No need to remove last margin if ScrollView handles content overflow correctly
            ]}
            onPress={() => onSelectEmpresa(empresa.id)}
          >
            <Text
              style={[
                styles.tabText,
                selectedEmpresaId === empresa.id && styles.activeTabText,
              ]}
              numberOfLines={1} // Prevent text wrapping from breaking height
              ellipsizeMode="tail" // Add "..." if text is too long
            >
              {empresa.nombre}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  filterOuterContainer: {
    position: 'absolute',
    // --- Adjust these to position the filter block on your ProductScreen ---
    left: 20,
    top: 110, // Example: below "Nuevo Producto" button
    width: 115, // Adjust width to fit business names comfortably
    // The height of this container will be constrained by the ScrollView's maxHeight
  },
  scrollView: {
    maxHeight: SCROLLVIEW_MAX_HEIGHT,
    borderRadius: 10, // Optional: if you want the scrollable area to have rounded corners
    // backgroundColor: 'rgba(255,0,0,0.1)', // Uncomment for debugging layout
  },
  scrollViewContentContainer: {
    // Padding inside the scrollable area, if needed (e.g., if tabs don't have their own full margin)
    // For instance, if the first tab should have some space above it within the scroll.
    // paddingTop: 4,
    // paddingBottom: 4,
  },
  tab: {
    height: TAB_ITEM_HEIGHT,         // Fixed height for each tab item
    paddingHorizontal: 12,           // Horizontal padding within the tab
    borderRadius: 8,                 // Rounded corners for each tab
    marginBottom: TAB_MARGIN_BOTTOM,
    backgroundColor: 'rgba(0, 35, 75, 0.7)', // Dark, slightly transparent base
    borderWidth: 1,
    borderColor: 'rgba(148, 200, 239, 0.3)', // Subtle border
    justifyContent: 'center',        // Vertically center text
    // alignItems: 'center',         // Horizontally center text if desired
  },
  activeTab: {
    backgroundColor: 'rgba(0, 51, 108, 0.9)', // More prominent dark blue for active
    shadowColor: '#94C8EF',          // Your existing glow color
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 8,                    // Android shadow
    borderColor: '#94C8EF',          // Border matches glow
  },
  tabText: {
    fontFamily: 'Georgia',
    color: '#D0E0F0',               // Light, muted blue/grey for inactive text
    fontSize: 12,                    // Adjust for readability
  },
  activeTabText: {
    color: '#F4E3D7',               // Brighter, active text color
    fontWeight: 'bold',
  },
});

export default EmpresaFilter;