import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Building, CheckCircle2 } from 'lucide-react'
import { SituacaoOcupacao, SITUACAO_CONFIG } from '@/types/imob'
import { obterImovelPorId, salvarImovel } from '@/lib/imobDb'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ImovelForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const isEditing = Boolean(id)

  const [nome, setNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [situacao, setSituacao] = useState<SituacaoOcupacao>('desocupado')
  const [matricula, setMatricula] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [erros, setErros] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(isEditing)

  useEffect(() => {
    if (isEditing && id) {
      setCarregandoDados(true)
      obterImovelPorId(id, usuario?.familia_id)
        .then((imv) => {
          if (imv) {
            setNome(imv.nome)
            setEndereco(imv.endereco)
            setSituacao(imv.situacao)
            setMatricula(imv.matricula || '')
            setObservacoes(imv.observacoes || '')
          } else {
            toast.error('Imóvel não encontrado.')
            navigate('/')
          }
        })
        .finally(() => setCarregandoDados(false))
    }
  }, [id, isEditing, usuario?.familia_id, navigate])

  const validar = () => {
    const novosErros: Record<string, string> = {}
    if (!nome.trim()) {
      novosErros.nome = 'O nome do imóvel é obrigatório.'
    }
    if (!endereco.trim()) {
      novosErros.endereco = 'O endereço do imóvel é obrigatório.'
    }
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar() || !usuario) return

    setLoading(true)
    try {
      const salvo = await salvarImovel(
        {
          id: isEditing ? id : undefined,
          familia_id: usuario.familia_id,
          nome,
          endereco,
          situacao,
          matricula: matricula.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
        },
        usuario.familia_id,
      )

      toast.success(isEditing ? 'Imóvel atualizado com sucesso!' : 'Imóvel cadastrado com sucesso!')
      navigate(`/imovel/${salvo.id}`)
    } catch {
      toast.error('Ocorreu um erro ao salvar o imóvel.')
    } finally {
      setLoading(false)
    }
  }

  if (carregandoDados) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2C4A6E] border-t-transparent" />
          <p className="text-sm text-gray-500">Carregando dados do imóvel...</p>
        </div>
      </div>
    )
  }

  const opcoesSituacao: { id: SituacaoOcupacao; label: string; desc: string }[] = [
    { id: 'ocupado', label: 'Ocupado', desc: 'Com locatário ou morador ativo' },
    { id: 'desocupado', label: 'Desocupado', desc: 'Vago e disponível para locação ou uso' },
    { id: 'em_reforma', label: 'Em reforma', desc: 'Em manutenção predial ou reforma' },
    { id: 'indisponivel', label: 'Indisponível', desc: 'Bloqueado temporariamente ou inventário' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Voltar */}
      <button
        onClick={() => (isEditing && id ? navigate(`/imovel/${id}`) : navigate('/'))}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#2C4A6E] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{isEditing ? 'Cancelar e voltar ao imóvel' : 'Voltar para lista de imóveis'}</span>
      </button>

      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/60 border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2C4A6E] text-white">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                {isEditing ? 'Editar Imóvel' : 'Cadastrar Novo Imóvel'}
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-0.5">
                {isEditing
                  ? 'Atualize as informações patrimoniais do imóvel'
                  : 'Preencha os dados básicos para catalogar o patrimônio da família'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome do Imóvel */}
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-xs font-bold text-gray-700">
                Nome do imóvel <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                placeholder="Ex.: Edifício Boulevard Jardins - Conjunto 1402"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  if (erros.nome) setErros((prev) => ({ ...prev, nome: '' }))
                }}
                className={cn(
                  'h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]',
                  erros.nome && 'border-red-500 focus-visible:ring-red-500',
                )}
              />
              {erros.nome && <p className="text-xs text-red-600 font-medium">{erros.nome}</p>}
            </div>

            {/* Endereço Completo em Campo Único */}
            <div className="space-y-1.5">
              <Label htmlFor="endereco" className="text-xs font-bold text-gray-700">
                Endereço completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="endereco"
                placeholder="Ex.: Alameda Lorena, 1420, Conjunto 1402, Jardins, São Paulo - SP"
                value={endereco}
                onChange={(e) => {
                  setEndereco(e.target.value)
                  if (erros.endereco) setErros((prev) => ({ ...prev, endereco: '' }))
                }}
                className={cn(
                  'h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]',
                  erros.endereco && 'border-red-500 focus-visible:ring-red-500',
                )}
              />
              <p className="text-[11px] text-gray-400">
                Rua, número, complemento, bairro, cidade e estado em uma linha simples.
              </p>
              {erros.endereco && (
                <p className="text-xs text-red-600 font-medium">{erros.endereco}</p>
              )}
            </div>

            {/* Situação de Ocupação - Escolha Única */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700">Situação de ocupação atual</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {opcoesSituacao.map((item) => {
                  const isSelected = situacao === item.id
                  const cfg = SITUACAO_CONFIG[item.id]
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSituacao(item.id)}
                      className={cn(
                        'flex items-start justify-between p-3.5 rounded-xl border text-left transition-all',
                        isSelected
                          ? cn(cfg.btnClass, 'shadow-xs')
                          : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800',
                      )}
                    >
                      <div className="space-y-0.5">
                        <span
                          className={cn(
                            'text-xs font-bold block',
                            isSelected ? 'text-white' : 'text-gray-900',
                          )}
                        >
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            'text-[11px] block',
                            isSelected ? 'text-white/90' : 'text-gray-500',
                          )}
                        >
                          {item.desc}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-white shrink-0 mt-0.5" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Matrícula (Opcional) */}
            <div className="space-y-1.5">
              <Label htmlFor="matricula" className="text-xs font-bold text-gray-700">
                Número da Matrícula / Cartório (Opcional)
              </Label>
              <Input
                id="matricula"
                placeholder="Ex.: 128.945 - 4º Cartório de Registro de Imóveis de SP"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
              />
            </div>

            {/* Observações (Opcional, Textarea) */}
            <div className="space-y-1.5">
              <Label htmlFor="observacoes" className="text-xs font-bold text-gray-700">
                Observações internas (Opcional)
              </Label>
              <Textarea
                id="observacoes"
                placeholder="Ex.: Informações sobre IPTU, locatários, condomínio ou particularidades deste patrimônio."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={4}
                className="bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E] resize-none"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => (isEditing && id ? navigate(`/imovel/${id}`) : navigate('/'))}
                className="border-gray-300 text-gray-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white px-6 font-semibold"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Imóvel'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
