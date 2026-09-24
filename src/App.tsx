import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

// Páginas Reais
import Index from '@/pages/Index'
import ImovelDetalhes from '@/pages/ImovelDetalhes'
import ImovelForm from '@/pages/ImovelForm'
import DocumentoPrincipal from '@/pages/DocumentoPrincipal'
import Documentos from '@/pages/Documentos'
import DocumentoNovo from '@/pages/DocumentoNovo'
import Login from '@/pages/Login'
import EsqueciSenha from '@/pages/EsqueciSenha'
import RedefinirSenha from '@/pages/RedefinirSenha'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors />
        <Routes>
          {/* Rotas Públicas de Autenticação */}
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />

          {/* Rotas Autenticadas com Isolamento RLS por Família */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* (1) Listagem / Busca de imóveis */}
              <Route path="/" element={<Index />} />
              <Route path="/imoveis" element={<Navigate to="/" replace />} />

              {/* (4) Cadastro de imóvel */}
              <Route path="/imovel/novo" element={<ImovelForm />} />

              {/* (2 e 3) Detalhes do imóvel: ver/alterar situação e documentos */}
              <Route path="/imovel/:id" element={<ImovelDetalhes />} />

              {/* (4) Edição de imóvel */}
              <Route path="/imovel/:id/editar" element={<ImovelForm />} />

              {/* (3) Tela dedicada ao documento principal */}
              <Route path="/imovel/:id/documento-principal" element={<DocumentoPrincipal />} />

              {/* Listagem geral de documentos */}
              <Route path="/documentos" element={<Documentos />} />

              {/* (5) Formulário de vínculo de documento */}
              <Route path="/documento/novo" element={<DocumentoNovo />} />
            </Route>
          </Route>

          {/* 404 para rotas desconhecidas */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
