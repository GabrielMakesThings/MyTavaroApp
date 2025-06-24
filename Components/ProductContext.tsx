import React, { createContext, useContext, useState } from "react";
import Coffee from "../Screens/ProductScreen/Assets/Coffee.svg";
import Clean from "../Screens/ProductScreen/Assets/Clean.svg";
import Kitchen from "../Screens/ProductScreen/Assets/Kitchen.svg";
import Bar from "../Screens/ProductScreen/Assets/Bar.svg";

// Definimos el tipo de los productos
interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  icono: React.FC<any>;
}

// Definimos el tipo de contexto
interface ProductContextType {
  productos: Producto[];
  agregarProducto: (nombre: string, categoria: string, proveedor: string, unidadesPaquete: string, precioUnidad: string, precioPaquete: string ) => void;
}

// Mapeo de iconos por categoría
const categoryIcons: { [key: string]: React.FC<any> } = {
    cafeteria: Coffee,
    limpieza: Clean,
    cocina: Kitchen,
    bar: Bar,
  };

// Creamos el contexto con un valor inicial `undefined`
const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Proveedor de contexto
export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [productos, setProductos] = useState<Producto[]>([]);

 // Función para agregar productos con icono
 const agregarProducto = (nombre: string, categoria: string) => {
    const nuevoProducto: Producto = {
      id: Date.now(),
      nombre,
      categoria,
      icono: categoryIcons[categoria.toLowerCase()] || Coffee, // Icono por defecto

    };
    setProductos((prevProductos) => [...prevProductos, nuevoProducto]);
  };

  return (
    <ProductContext.Provider value={{ productos, agregarProducto }}>
      {children}
    </ProductContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProduct debe usarse dentro de un ProductProvider");
  }
  return context;
};
