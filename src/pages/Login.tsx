import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, LogIn, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!email.trim() || !email.includes('@')) {
      setErro('Informe um e-mail válido para acessar.')
      return
    }

    if (!senha) {
      setErro('Informe sua senha de acesso.')
      return
    }

    try {
      const ok = await login(email, senha)
      if (ok) {
        toast.success('Sessão iniciada com sucesso!')
        navigate('/')
      } else {
        setErro('Credenciais inválidas. Verifique seu e-mail e senha.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro de conexão com o Supabase.'
      setErro(msg || 'Erro de conexão com o Supabase. Tente novamente.')
    }
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#F5F7FA] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2C4A6E] text-white shadow-md">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">MFO Imob</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Gestão Operacional de Imóveis do Family Office
          </p>
        </div>

        {/* Card de Formulário de Login */}
        <Card className="border border-gray-200 bg-white shadow-md rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold text-gray-900">Acesso Restrito</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Digite suas credenciais do Supabase para visualizar os imóveis da família com
              isolamento RLS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {erro && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 font-medium">
                  {erro}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-gray-700">
                  E-mail institucional
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@mfotrust.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (erro) setErro('')
                    }}
                    className="pl-9 h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha" className="text-xs font-bold text-gray-700">
                    Senha de acesso
                  </Label>
                  <Link
                    to="/esqueci-senha"
                    className="text-[11px] font-medium text-[#2C4A6E] hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="senha"
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value)
                      if (erro) setErro('')
                    }}
                    className="pl-9 h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white font-semibold text-sm shadow-xs mt-2"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {isLoading ? 'Autenticando no Supabase...' : 'Entrar no Sistema'}
              </Button>
            </form>

            <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-xs space-y-1 text-gray-600">
              <div className="flex items-center gap-1.5 text-gray-800 font-semibold text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Autenticação Supabase Self-Hosted (RLS)</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Acesso por usuário autenticado. O banco de dados isola automaticamente os imóveis e
                documentos conforme as políticas RLS da família.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
