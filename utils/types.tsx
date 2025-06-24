export interface User {
    id: string; // Assuming UUID from auth.users table
    email: string;
    // Add other fields from auth.users table if needed.
}

export interface Empresa {
    id: string;
    creado_en: string;  // Keep as string to match Supabase timestamp
    nombre: string;
    plan: string;
    activo: boolean;
}

export interface UsuariosEmpresas {
    id: string;
    user_id: string;
    empresa_id: string;
    rol: string;
    creado_en: string; // Keep as string to match Supabase timestamp
    nombre_usuario: string;
}

// Create a type that combines Empresa and UsuariosEmpresas
export interface EmpresaWithUsuariosEmpresas extends Empresa {
    rol: string;
    user_empresa_id: string; // renombra para evitar colisiones
    user_empresa_creado_en: string;
}