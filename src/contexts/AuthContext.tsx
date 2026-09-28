import React, { createContext, useContext, useEffect, useState } from 'react'
import { Usuario } from '@/types/imob'
import { getStoredUser, setStoredUser, resolverUsuarioLogado } from '@/lib/imobDb'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

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

  useEffect(() => {
    let isMounted = true

    // Verifica sessão existente ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      if (session?.user) {
        resolverUsuarioLogado(session.user)
          .then((u) => {
            if (isMounted) setUsuario(u)
          })
          .catch(() => {
            if (isMounted) setUsuario(getStoredUser())
          })
      } else {
        setStoredUser(null)
        setUsuario(null)
      }
    })

    // Ouve mudanças de auth do Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
      if (!isMounted) return
      if (session?.user) {
        try {
          const u = await resolverUsuarioLogado(session.user)
          if (isMounted) setUsuario(u)
        } catch {
          if (isMounted) setUsuario(getStoredUser())
        }
      } else {
        setStoredUser(null)
        if (isMounted) setUsuario(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const handleAuthChange = () => {
      setUsuario(getStoredUser())
    }
    window.addEventListener('mfo_auth_changed', handleAuthChange)
    return () => window.removeEventListener('mfo_auth_changed', handleAuthChange)
  }, [])

  const login = async (email: string, senha?: string): Promise<boolean> => {
    setIsLoading(true)

    try {
      if (!senha) {
        throw new Error('Informe sua senha de acesso.')
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      })

      if (error) {
        throw error
      }

      if (!data.user) {
        throw new Error('Usuário não retornado após autenticação.')
      }

      const user = await resolverUsuarioLogado(data.user)
      setUsuario(user)
      setIsLoading(false)
      return true
    } catch (err) {
      setIsLoading(false)
      throw err
    }
  }

  const logout = () => {
    supabase.auth.signOut().catch(() => {
      // noop
    })
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
