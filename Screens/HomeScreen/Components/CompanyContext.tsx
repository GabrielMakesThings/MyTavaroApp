import React, { createContext, useState, useContext } from 'react';

// Definición del tipo para el contexto de la empresa
type CompanyContextType = {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (companyId: string | null) => void;
};

// Creación del contexto de la empresa
const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

// Hook personalizado para usar el contexto de la empresa
export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany debe ser usado dentro de un CompanyProvider');
  }
  return context;
};

// Componente proveedor del contexto de la empresa
export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const value: CompanyContextType = {
    selectedCompanyId,
    setSelectedCompanyId,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};