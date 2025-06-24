// Screens/RecetasScreen/Components/AdminFinancialsDisplay.tsx
import React from 'react';
import { StyleSheet, Text, View, Animated, Platform } from 'react-native';

interface AdminFinancialsDisplayProps {
  isAdminFadeAnim: Animated.Value; // Animated value from parent
  totalCost: number;
  profitMargin: number | null;
  sellingPrice: number | null; // From `receta.precio_total`
}

const AdminFinancialsDisplay: React.FC<AdminFinancialsDisplayProps> = ({
  isAdminFadeAnim,
  totalCost,
  profitMargin,
  sellingPrice,
}) => {
  return (
    <Animated.View style={[styles.container, { opacity: isAdminFadeAnim }]}>
      <Text style={styles.sectionTitle}>Análisis Financiero (Admin)</Text>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Costo Total de Ingredientes:</Text>
        <Text style={styles.costValue}>€{totalCost.toFixed(2)}</Text>
      </View>

      {sellingPrice !== null && sellingPrice > 0 && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Precio de Venta (Receta):</Text>
          <Text style={styles.sellingPriceValue}>€{sellingPrice.toFixed(2)}</Text>
        </View>
      )}

      {profitMargin !== null && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Margen de Beneficio:</Text>
          <Text style={[styles.marginValue, profitMargin < 0 && styles.negativeMargin]}>
            {profitMargin.toFixed(2)}%
          </Text>
        </View>
      )}

      {/* Optional "digital" data style */}
      <View style={styles.digitalDataContainer}>
        <Text style={styles.digitalDataText}>Access Level: <Text style={styles.adminStatus}>AUTHORIZED</Text></Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(131, 210, 229, 0.15)', // Slightly more pronounced transparency
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(136, 231, 255, 0.4)',
    // Sharper glow for admin section
    shadowColor: '#83D2E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, // More intense glow
    shadowRadius: 15,
    elevation: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: 'rgb(104, 214, 241)', // Bright blue for title
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: 'rgb(193, 243, 255)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 80,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  detailLabel: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#D4C2B3',
  },
  costValue: {
    fontSize: 18,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#FFD700', // Gold color for cost
    textAlign: 'right',
  },
  sellingPriceValue: {
    fontSize: 18,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#7FFF00', // Green for selling price
    textAlign: 'right',
  },
  marginValue: {
    fontSize: 18,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: '#00FF7F', // Spring green for margin
    textAlign: 'right',
  },
  negativeMargin: {
    color: '#FF6B6B', // Red for negative margin
  },
  digitalDataContainer: {
    marginTop: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#00FFFF', // Cyan border
  },
  digitalDataText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', 
    color: '#00FFFF', // Cyan text
  },
  adminStatus: {
    fontWeight: 'bold',
    textShadowColor: '#00FFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
});

export default AdminFinancialsDisplay;