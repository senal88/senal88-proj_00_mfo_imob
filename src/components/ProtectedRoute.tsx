import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const ProtectedRoute: React.FC = () => {
  const { usuario, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2C4A6E] border-t-transparent" />
          <p className="text-sm font-medium text-gray-600">Carregando permissões...</p>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
