import React, { createContext, useContext, useEffect, useState } from 'react'
import { Usuario } from '@/types/imob'
import { getStoredUser, setStoredUser } from '@/lib/imobDb'
import { USUARIOS_INICIAIS } from '@/lib/mockData'

interface AuthContextType {
  usuario: Usuario | null
  isLoading: boolean
  login: (email: string, senha?: string) => Promise<boolean>
  logout: () => void
  trocarFamiliaTeste: (familiaId: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(
    () => getStoredUser() || USUARIOS_INICIAIS[0],
  )
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const handleAuthChange = () => {
      setUsuario(getStoredUser())
    }
    window.addEventListener('mfo_auth_changed', handleAuthChange)
    return () => window.removeEventListener('mfo_auth_changed', handleAuthChange)
  }, [])

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 400)) // Simulação de handshake seguro

    // Localiza usuário cadastrado ou cria perfil de equipe da família
    const encontrado = USUARIOS_INICIAIS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim(),
    )

    if (encontrado) {
      setStoredUser(encontrado)
      setUsuario(encontrado)
      setIsLoading(false)
      return true
    }

    // Se digitou outro e-mail válido, autentica no family office Oliveira como padrão
    const novoUsuario: Usuario = {
      id: 'usr-' + Date.now().toString(36),
      nome: email
        .split('@')[0]
        .replace('.', ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      email: email.trim(),
      cargo: 'Operação Family Office',
      familia_id: 'fam-oliveira',
      familia_nome: 'Família Oliveira & Associados',
      avatar_url: 'https://img.usecurling.com/ppl/medium?gender=female&seed=15',
    }

    setStoredUser(novoUsuario)
    setUsuario(novoUsuario)
    setIsLoading(false)
    return true
  }

  const logout = () => {
    setStoredUser(null)
    setUsuario(null)
  }

  const trocarFamiliaTeste = (familiaId: string) => {
    const target = USUARIOS_INICIAIS.find((u) => u.familia_id === familiaId)
    if (target) {
      setStoredUser(target)
      setUsuario(target)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        isLoading,
        login,
        logout,
        trocarFamiliaTeste,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
