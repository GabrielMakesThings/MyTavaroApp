import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';

// Definición del tipo para la información de la empresa
type Company = {
  id: string;
  nombre: string;
};

// Definición del tipo para las propiedades del SideMenu
type SideMenuProps = {
  companies: Company[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
  onClose: () => void;
  onGoToSettings: () => void; // Nueva prop para ir a la pantalla de ajustes
};

const SideMenu: React.FC<SideMenuProps> = ({ companies, selectedCompanyId, onSelectCompany, onClose, onGoToSettings }) => {
  const { width, height } = Dimensions.get('window'); // Obtiene el ancho y alto de la pantalla

  return (
    <View style={[styles.container, { width: width * 0.7 }]}>  {/* Menú ocupa el 70% del ancho */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>X</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Seleccionar Empresa</Text>
      <ScrollView>
        {companies.map((company) => (
          <TouchableOpacity
            key={company.id}
            style={[
              styles.companyButton,
              company.id === selectedCompanyId && styles.selectedCompanyButton,
            ]}
            onPress={() => onSelectCompany(company.id)}
          >
            <Text style={styles.companyText}>{company.nombre}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.settingsButton} onPress={onGoToSettings}>
          <Text style={styles.settingsButtonText}>Ajustes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#222',
    padding: 20,
    height: '100%',
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  companyButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  selectedCompanyButton: {
    backgroundColor: '#444',
  },
  companyText: {
    fontSize: 16,
    color: '#fff',
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 20,
  },
  settingsButton: {
    backgroundColor: '#555',
    padding: 15,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
});

export default SideMenu;