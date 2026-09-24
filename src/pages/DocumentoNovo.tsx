import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  UploadCloud,
  FileCheck,
  Building,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { Imovel, TipoDocumento, TIPO_DOCUMENTO_LABELS } from '@/types/imob'
import { listarImoveis, vincularDocumento } from '@/lib/imobDb'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function DocumentoNovo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { usuario } = useAuth()

  const preselectedImovelId = searchParams.get('imovelId') || ''
  const isPrincipalParam = searchParams.get('isPrincipal') === 'true'

  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [imovelId, setImovelId] = useState(preselectedImovelId)
  const [tipo, setTipo] = useState<TipoDocumento>(
    isPrincipalParam ? 'documento_principal' : 'escritura',
  )
  const [nome, setNome] = useState('')
  const [dataDocumento, setDataDocumento] = useState(new Date().toISOString().split('T')[0])
  const [descricao, setDescricao] = useState('')
  const [isPrincipal, setIsPrincipal] = useState(isPrincipalParam)

  // Arquivo simulado ou real
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const [tamanhoFormatado, setTamanhoFormatado] = useState('2.4 MB')

  const [loading, setLoading] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  const carregarImoveis = useCallback(async () => {
    try {
      const lista = await listarImoveis(usuario?.familia_id)
      setImoveis(lista)
      if (!imovelId && lista.length > 0) {
        setImovelId(lista[0].id)
      }
    } catch {
      toast.error('Erro ao carregar lista de imóveis.')
    }
  }, [usuario?.familia_id, imovelId])

  useEffect(() => {
    carregarImoveis()
  }, [carregarImoveis])

  // Ao mudar o tipo para documento_principal, marcar automaticamente a flag
  useEffect(() => {
    if (tipo === 'documento_principal') {
      setIsPrincipal(true)
    }
  }, [tipo])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('O arquivo excede o limite de 20MB.')
        return
      }
      setArquivoSelecionado(file)
      if (!nome) {
        setNome(file.name)
      }
      // Formata tamanho
      const mb = (file.size / (1024 * 1024)).toFixed(1)
      setTamanhoFormatado(`${mb} MB`)
      if (erros.arquivo) {
        setErros((prev) => ({ ...prev, arquivo: '' }))
      }
    }
  }

  const validar = () => {
    const novosErros: Record<string, string> = {}
    if (!imovelId) {
      novosErros.imovelId = 'Selecione o imóvel que receberá o documento.'
    }
    if (!nome.trim()) {
      novosErros.nome = 'Informe um título/nome para o documento.'
    }
    if (!arquivoSelecionado && !nome) {
      novosErros.arquivo = 'Selecione um arquivo para envio ao storage do Supabase.'
    }
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar() || !usuario) return

    setLoading(true)
    try {
      // Simulação do upload do storage Supabase / criação de registro seguro
      await vincularDocumento({
        imovel_id: imovelId,
        familia_id: usuario.familia_id,
        nome: nome.trim(),
        tipo,
        tamanho_formatado: tamanhoFormatado,
        data_documento: dataDocumento || undefined,
        descricao: descricao.trim() || undefined,
        is_principal: isPrincipal || tipo === 'documento_principal',
      })

      toast.success('Documento vinculado com sucesso!')

      if (preselectedImovelId) {
        navigate(`/imovel/${preselectedImovelId}`)
      } else {
        navigate('/documentos')
      }
    } catch {
      toast.error('Erro ao vincular documento.')
    } finally {
      setLoading(false)
    }
  }

  const tipos: TipoDocumento[] = [
    'documento_principal',
    'escritura',
    'contrato_locacao',
    'contrato_compra_venda',
    'planta',
    'iptu',
    'outros',
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Voltar */}
      <button
        onClick={() =>
          preselectedImovelId ? navigate(`/imovel/${preselectedImovelId}`) : navigate(-1)
        }
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#2C4A6E] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{preselectedImovelId ? 'Voltar ao imóvel' : 'Voltar para lista de documentos'}</span>
      </button>

      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/60 border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2C4A6E] text-white">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Vincular Documento ao Imóvel
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-0.5">
                Envie escrituras, contratos e comprovantes vinculados ao patrimônio da família
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Imóvel Selecionado */}
            <div className="space-y-1.5">
              <Label htmlFor="imovel" className="text-xs font-bold text-gray-700">
                Imóvel da Família <span className="text-red-500">*</span>
              </Label>
              <Select value={imovelId} onValueChange={setImovelId}>
                <SelectTrigger
                  id="imovel"
                  className={cn(
                    'h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]',
                    erros.imovelId && 'border-red-500',
                  )}
                >
                  <SelectValue placeholder="Selecione o imóvel correspondente" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {imoveis.map((imv) => (
                    <SelectItem key={imv.id} value={imv.id}>
                      {imv.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erros.imovelId && (
                <p className="text-xs text-red-600 font-medium">{erros.imovelId}</p>
              )}
            </div>

            {/* Upload de Arquivo Simples */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">
                Arquivo do Documento <span className="text-red-500">*</span>
              </Label>
              <div
                className={cn(
                  'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors text-center cursor-pointer',
                  arquivoSelecionado
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-gray-300 bg-gray-50/60 hover:bg-gray-100/60',
                )}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {arquivoSelecionado ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{arquivoSelecionado.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {tamanhoFormatado} • Clique para trocar
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="h-10 w-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        Clique aqui para selecionar o arquivo
                      </p>
                      <p className="text-[11px] text-gray-400">
                        PDF, Word (.doc, .docx) ou Imagem • Até 20MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {erros.arquivo && <p className="text-xs text-red-600 font-medium">{erros.arquivo}</p>}
            </div>

            {/* Nome / Título do Documento */}
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-xs font-bold text-gray-700">
                Título do Documento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                placeholder="Ex.: Escritura Pública de Compra e Venda ou Matrícula Atualizada"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  if (erros.nome) setErros((prev) => ({ ...prev, nome: '' }))
                }}
                className={cn(
                  'h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]',
                  erros.nome && 'border-red-500',
                )}
              />
              {erros.nome && <p className="text-xs text-red-600 font-medium">{erros.nome}</p>}
            </div>

            {/* Tipo do Documento */}
            <div className="space-y-1.5">
              <Label htmlFor="tipo" className="text-xs font-bold text-gray-700">
                Tipo do Documento <span className="text-red-500">*</span>
              </Label>
              <Select value={tipo} onValueChange={(val) => setTipo(val as TipoDocumento)}>
                <SelectTrigger id="tipo" className="h-11 bg-gray-50/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {tipos.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_DOCUMENTO_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data do Documento */}
            <div className="space-y-1.5">
              <Label htmlFor="data" className="text-xs font-bold text-gray-700">
                Data do Documento (Opcional)
              </Label>
              <Input
                id="data"
                type="date"
                value={dataDocumento}
                onChange={(e) => setDataDocumento(e.target.value)}
                className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
              />
            </div>

            {/* Descrição Opcional */}
            <div className="space-y-1.5">
              <Label htmlFor="descricao" className="text-xs font-bold text-gray-700">
                Descrição ou observação (Opcional)
              </Label>
              <Textarea
                id="descricao"
                placeholder="Ex.: Válido por 3 anos; cópia autenticada arquivada no escritório."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                className="bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E] resize-none"
              />
            </div>

            {/* Checkbox: Definir como Documento Principal */}
            <div className="flex items-start space-x-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <Checkbox
                id="isPrincipal"
                checked={isPrincipal || tipo === 'documento_principal'}
                onCheckedChange={(checked) => setIsPrincipal(Boolean(checked))}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor="isPrincipal"
                  className="text-xs font-bold text-gray-900 cursor-pointer"
                >
                  Definir como Documento Principal deste imóvel
                </Label>
                <p className="text-[11px] text-gray-500">
                  Ficará em destaque no topo da ficha do imóvel com botão direto de abertura para a
                  equipe.
                </p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  preselectedImovelId ? navigate(`/imovel/${preselectedImovelId}`) : navigate(-1)
                }
                className="border-gray-300 text-gray-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white px-6 font-semibold"
              >
                {loading ? 'Enviando...' : 'Vincular Documento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
