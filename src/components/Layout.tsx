import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Building2,
  FolderOpen,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
  ShieldCheck,
  Building,
  UserCheck,
  Landmark,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export default function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [buscaRapida, setBuscaRapida] = useState('')

  const handleBuscaRapidaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (buscaRapida.trim()) {
      navigate(`/?q=${encodeURIComponent(buscaRapida.trim())}`)
      setBuscaRapida('')
    }
  }

  // Identificação do título da tela baseado na rota atual
  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/') return 'Imóveis'
    if (path === '/imovel/novo') return 'Novo Imóvel'
    if (path.startsWith('/imovel/') && path.endsWith('/editar')) return 'Editar Imóvel'
    if (path.startsWith('/imovel/') && path.endsWith('/documento-principal'))
      return 'Documento Principal'
    if (path.startsWith('/imovel/')) return 'Detalhes do Imóvel'
    if (path === '/contas') return 'Gestão de Contas & Subledger'
    if (path === '/documentos') return 'Documentos'
    if (path === '/documento/novo') return 'Vincular Documento'
    return 'MFO Imob'
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-[#111827]">
      {/* Overlay escuro no mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Fixa Esquerda - Apex Navy #00205b */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#00205b] text-white transition-transform duration-250 ease-in-out md:static md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Topo / Logo */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div
            onClick={() => {
              navigate('/')
              setMobileMenuOpen(false)
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0052cc] text-white shadow-md group-hover:bg-[#0041a8] transition-colors">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">MFO Imob</span>
              <span className="block text-[10px] uppercase tracking-wider text-blue-200 font-medium">
                Family Office
              </span>
            </div>
          </div>
          {/* Botão fechar mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded p-1 text-gray-300 hover:bg-white/10 md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicador de RLS / Família Ativa */}
        <div className="mx-4 mt-4 rounded-lg bg-black/20 p-3 border border-white/10 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>RLS Supabase • Isolamento</span>
          </div>
          <p className="text-gray-100 font-medium truncate" title={usuario?.familia_nome}>
            {usuario?.familia_nome || 'Família BNI'}
          </p>
          <div className="mt-1 text-[11px] text-blue-200 truncate">
            {usuario?.email || 'Conectado'}
          </div>
        </div>

        {/* Menu de navegação */}
        <nav className="mt-4 flex-1 space-y-1.5 px-3">
          <NavLink
            to="/"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-[#0052cc] text-white shadow-sm font-semibold'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Building className="h-5 w-5 shrink-0" />
            <span>Imóveis</span>
          </NavLink>

          <NavLink
            to="/contas"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-[#0052cc] text-white shadow-sm font-semibold'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Landmark className="h-5 w-5 shrink-0" />
            <span>Contas & Subledger</span>
          </NavLink>

          <NavLink
            to="/documentos"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-[#0052cc] text-white shadow-sm font-semibold'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <FolderOpen className="h-5 w-5 shrink-0" />
            <span>Documentos</span>
          </NavLink>

          {/* Atalho de ação rápida */}
          <div className="pt-4 mt-4 border-t border-white/10">
            <button
              onClick={() => {
                navigate('/imovel/novo')
                setMobileMenuOpen(false)
              }}
              className="w-full flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-3.5 py-2 text-xs font-semibold text-white border border-white/10 transition-colors"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              <span>Cadastrar Imóvel</span>
            </button>
          </div>
        </nav>

        {/* Rodapé da Sidebar - Usuário Logado e Sair */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 border border-white/20">
                <AvatarImage src={usuario?.avatar_url} alt={usuario?.nome} />
                <AvatarFallback className="bg-[#0052cc] text-xs font-bold text-white">
                  {usuario?.nome?.substring(0, 2).toUpperCase() || 'OP'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {usuario?.nome || 'Operador'}
                </p>
                <p className="truncate text-[11px] text-blue-200">{usuario?.email || ''}</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-200 hover:bg-white/10 hover:text-white"
                  title="Opções da conta"
                >
                  <UserCheck className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border border-gray-200 shadow-lg"
              >
                <DropdownMenuLabel className="text-xs text-gray-500">
                  Sessão Operacional
                </DropdownMenuLabel>
                <div className="px-2 py-1.5 text-xs">
                  <div className="font-semibold text-gray-800">{usuario?.nome}</div>
                  <div className="text-gray-500">{usuario?.cargo}</div>
                  <div className="mt-1 text-[11px] text-[#0052cc] font-medium">
                    {usuario?.familia_nome}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  onClick={() => setLogoutDialogOpen(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair da conta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLogoutDialogOpen(true)}
            className="mt-3 w-full justify-start text-xs text-blue-200 hover:bg-white/10 hover:text-red-300"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            <span>Encerrar sessão</span>
          </Button>
        </div>
      </aside>

      {/* Conteúdo Principal + Header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Superior Fino */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#00205b]">
              {getPageTitle()}
            </h1>
          </div>

          {/* Busca Rápida no Topo (Global) */}
          <div className="flex items-center gap-3">
            <form
              onSubmit={handleBuscaRapidaSubmit}
              className="relative hidden sm:block w-64 md:w-72"
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Busca rápida por nome..."
                value={buscaRapida}
                onChange={(e) => setBuscaRapida(e.target.value)}
                className="h-9 w-full bg-[#f8fafc] pl-9 pr-3 text-xs sm:text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#0052cc] border-gray-200"
              />
            </form>

            <Button
              onClick={() => navigate('/imovel/novo')}
              size="sm"
              className="bg-[#00205b] hover:bg-[#001742] text-white shadow-xs hidden xs:inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span className="font-semibold text-xs sm:text-sm">Novo Imóvel</span>
            </Button>
          </div>
        </header>

        {/* Área de Visualização com Scroll Próprio */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-[1200px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Modal de confirmação de Logout */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#111827]">
              Deseja encerrar a sessão?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Você sairá da área operacional do family office. Para acessar novamente, será
              necessário fazer login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200 text-gray-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar e Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
