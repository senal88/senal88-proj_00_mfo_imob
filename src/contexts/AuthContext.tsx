import React, { createContext, useContext, useEffect, useState } from 'react'
import { Usuario } from '@/types/imob'
import { getStoredUser, setStoredUser, resolverUsuarioLogado } from '@/lib/imobDb'
import {
  supabaseSignIn,
  supabaseSignOut,
  getStoredSession,
  getSupabaseConfig,
} from '@/lib/supabaseClient'

interface AuthContextType {
  usuario: Usuario | null
  isLoading: boolean
  login: (email: string, senha?: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(() => getStoredUser())
  const [isLoading, setIsLoading] = useState(false)

  // Ao montar, sincroniza se já houver sessão salva
  useEffect(() => {
    const session = getStoredSession()
    if (session && !usuario) {
      resolverUsuarioLogado(session)
        .then((u) => setUsuario(u))
        .catch(() => {
          // Mantém o armazenado localmente caso a chamada de rede falhe
          setUsuario(getStoredUser())
        })
    }
  }, [usuario])

  useEffect(() => {
    const handleAuthChange = () => {
      setUsuario(getStoredUser())
    }
    window.addEventListener('mfo_auth_changed', handleAuthChange)
    return () => window.removeEventListener('mfo_auth_changed', handleAuthChange)
  }, [])

  const login = async (email: string, senha?: string): Promise<boolean> => {
    setIsLoading(true)
    const cfg = getSupabaseConfig()

    try {
      if (cfg.url && senha) {
        // Autentica diretamente no Supabase self-hosted
        const session = await supabaseSignIn(email.trim(), senha)
        const user = await resolverUsuarioLogado(session)
        setUsuario(user)
        setIsLoading(false)
        return true
      }

      // Se VITE_SUPABASE_URL não estiver configurada no preview, usa operador admin BNI
      const fallbackUser: Usuario = {
        id: 'usr-bni-admin',
        nome: email
          .split('@')[0]
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        email: email.trim(),
        cargo: 'Administrador Family Office',
        familia_id: 'fam-bni',
        familia_nome: 'Família BNI',
      }
      setStoredUser(fallbackUser)
      setUsuario(fallbackUser)
      setIsLoading(false)
      return true
    } catch (err) {
      setIsLoading(false)
      throw err
    }
  }

  const logout = () => {
    supabaseSignOut()
    setStoredUser(null)
    setUsuario(null)
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        isLoading,
        login,
        logout,
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
