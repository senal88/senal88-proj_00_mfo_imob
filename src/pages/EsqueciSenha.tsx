import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { supabaseResetPassword } from '@/lib/supabaseClient'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      toast.error('Informe um e-mail válido.')
      return
    }

    setLoading(true)
    try {
      await supabaseResetPassword(email.trim())
      setEnviado(true)
      toast.success('Link de recuperação enviado com sucesso!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao solicitar recuperação de senha.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#F5F7FA] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2C4A6E] text-white shadow-md">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            Recuperação de Acesso
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">MFO Imob • Gestão Patrimonial</p>
        </div>

        <Card className="border border-gray-200 bg-white shadow-md rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-gray-900">Esqueceu sua senha?</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Informe seu e-mail cadastrado no Supabase para enviarmos instruções de redefinição
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enviado ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900">E-mail enviado!</h3>
                  <p className="text-xs text-gray-600">
                    Enviamos um link para <strong>{email}</strong> com as instruções para cadastrar
                    uma nova senha.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-[#2C4A6E]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Voltar para tela de login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold text-gray-700">
                    E-mail institucional
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="operacao@mfotrust.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white font-semibold text-sm"
                >
                  {loading ? 'Enviando instruções...' : 'Enviar link de recuperação'}
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
