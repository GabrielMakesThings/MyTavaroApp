import { create } from 'zustand';

import { 
    User, 
    EmpresaWithUsuariosEmpresas, 
    Empresa, 
    UsuariosEmpresas 
} from './types';

interface UserState {
    user: User | null;
    empresas: EmpresaWithUsuariosEmpresas[] | null;
    setUser: (user: User | null) => void;
    setEmpresas: (empresas: EmpresaWithUsuariosEmpresas[] | null) => void;
    clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    empresas: null,
    setUser: (user) => set({ user }),
    setEmpresas: (empresas) => set({ empresas }),
    clearUser: () => set({ user: null, empresas: null }),
}));