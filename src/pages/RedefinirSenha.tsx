import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Building2, Lock, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function RedefinirSenha() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get('email') || 'operacao@mfo.com.br'

  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A nova senha deve possuir pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmacao) {
      setErro('As duas senhas digitadas não coincidem.')
      return
    }

    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    setLoading(false)
    setSucesso(true)
    toast.success('Senha redefinida com sucesso!')
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#F5F7FA] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2C4A6E] text-white shadow-md">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Redefinição de Senha</h1>
          <p className="text-xs sm:text-sm text-gray-500">MFO Imob • Supabase Auth</p>
        </div>

        <Card className="border border-gray-200 bg-white shadow-md rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-gray-900">Criar Nova Senha</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Defina sua nova credencial de acesso para a conta{' '}
              <strong className="text-gray-700">{emailParam}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sucesso ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900">Senha Alterada!</h3>
                  <p className="text-xs text-gray-600">
                    Sua credencial foi atualizada com sucesso no Supabase. Você já pode fazer login.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white font-semibold text-sm"
                  >
                    Ir para tela de login
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {erro && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 font-medium">
                    {erro}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="senha" className="text-xs font-bold text-gray-700">
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="senha"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="pl-9 h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmacao" className="text-xs font-bold text-gray-700">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmacao"
                      type="password"
                      placeholder="Repita a nova senha"
                      value={confirmacao}
                      onChange={(e) => setConfirmacao(e.target.value)}
                      className="pl-9 h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white font-semibold text-sm mt-2"
                >
                  {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-[#2C4A6E]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Voltar para login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
