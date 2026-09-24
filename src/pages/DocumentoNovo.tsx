import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Shield,
  Layers,
} from 'lucide-react'
import {
  Imovel,
  TipoDocumento,
  ReviewStatus,
  EvidenceType,
  TIPO_DOCUMENTO_LABELS,
  REVIEW_STATUS_LABELS,
  EVIDENCE_LABELS,
} from '@/types/imob'
import {
  listarImoveis,
  vincularDocumento,
  listarDocumentos,
  LIMITE_UPLOAD_BYTES,
} from '@/lib/imobDb'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const tipoPre = (searchParams.get('tipoPre') as TipoDocumento) || 'matricula'
  const substituirDocId = searchParams.get('substituirDocId') || ''

  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [imovelId, setImovelId] = useState(preselectedImovelId)
  const [docAnterior, setDocAnterior] = useState<{
    id: string
    title: string
    doc_type: TipoDocumento
  } | null>(null)

  // Catálogo fechado de 20 tipos de documentos
  const [docType, setDocType] = useState<TipoDocumento>(tipoPre)
  const [title, setTitle] = useState('')
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState('')
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('a_conferir')
  const [evidence, setEvidence] = useState<EvidenceType>('documento_oficial')
  const [sensitive, setSensitive] = useState(false)

  // Arquivo real para a ponte server-side do Paperless
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [tamanhoFormatado, setTamanhoFormatado] = useState('')

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

  // Se veio parâmetro de substituição, busca dados do documento anterior
  useEffect(() => {
    if (substituirDocId && usuario?.familia_id) {
      listarDocumentos({ familiaId: usuario.familia_id }).then((docs) => {
        const found = docs.find((d) => d.id === substituirDocId)
        if (found) {
          setDocAnterior({ id: found.id, title: found.title, doc_type: found.doc_type })
          setDocType(found.doc_type)
          if (!title) {
            setTitle(`${found.title} (Nova versão)`)
          }
        }
      })
    }
  }, [substituirDocId, usuario?.familia_id, title])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 4) Limite de upload: 20 MB (validar e avisar em pt-BR se exceder)
      if (file.size > LIMITE_UPLOAD_BYTES) {
        toast.error('O arquivo selecionado excede o limite máximo permitido de 20 MB.')
        setErros((prev) => ({
          ...prev,
          arquivo: 'Arquivo muito grande. O limite máximo permitido é de 20 MB.',
        }))
        return
      }

      setArquivo(file)
      if (!title) {
        const nomeLimpo = file.name.replace(/\.[^/.]+$/, '')
        setTitle(nomeLimpo)
      }

      const mb = file.size / (1024 * 1024)
      const tamStr = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`
      setTamanhoFormatado(tamStr)
      if (erros.arquivo) {
        setErros((prev) => ({ ...prev, arquivo: '' }))
      }
    }
  }

  const validar = () => {
    const novosErros: Record<string, string> = {}
    if (!imovelId) {
      novosErros.imovelId = 'Selecione o imóvel que receberá este documento.'
    }
    if (!title.trim()) {
      novosErros.title = 'Informe o título do documento.'
    }
    if (!docType) {
      novosErros.docType = 'Selecione o tipo de documento.'
    }
    if (!arquivo) {
      novosErros.arquivo = 'Selecione um arquivo para enviar ao Paperless.'
    }
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar() || !usuario || !arquivo) return

    setLoading(true)
    try {
      // Envia arquivo para a ponte Paperless e grava metadados no Supabase (document)
      await vincularDocumento({
        property_id: imovelId,
        familia_id: usuario.familia_id,
        doc_type: docType,
        title: title.trim(),
        document_date: documentDate || undefined,
        valid_until: validUntil || undefined,
        review_status: reviewStatus,
        evidence,
        sensitive,
        supersedes_id: docAnterior?.id || undefined,
        file: arquivo,
      })

      if (docAnterior) {
        toast.success(
          'Nova versão vinculada com sucesso! O documento anterior foi mantido no histórico.',
        )
      } else {
        toast.success('Documento enviado ao Paperless e catalogado com sucesso!')
      }

      if (preselectedImovelId) {
        navigate(`/imovel/${preselectedImovelId}`)
      } else {
        navigate('/documentos')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao vincular documento.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // 5) CATÁLOGO FECHADO de 20 tipos exatos de documento
  const lista20Tipos: TipoDocumento[] = [
    'matricula',
    'escritura',
    'espelho_iptu',
    'habite_se',
    'laudo_vistoria',
    'contrato_locacao',
    'aditivo_locacao',
    'distrato',
    'garantia_locaticia',
    'conta_condominio',
    'conta_consumo',
    'certidao_negativa',
    'certidao_onus',
    'apolice_seguro',
    'guia_tributo',
    'comprovante_pagamento',
    'boleto',
    'correspondencia',
    'foto_imovel',
    'outro',
  ]

  const reviewStatusList: ReviewStatus[] = ['a_conferir', 'conferido']
  const evidenceList: EvidenceType[] = ['documento_oficial', 'extrato', 'declarado', 'inferido']

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
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
        <CardHeader className="bg-gray-50/70 border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2C4A6E] text-white">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                {docAnterior
                  ? 'Substituir Documento (Nova Versão)'
                  : 'Vincular Documento ao Imóvel'}
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-0.5">
                Envio via ponte server-side ao Paperless • Metadados catalogados no Supabase
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          {/* Alerta de Substituição (supersedes_id) */}
          {docAnterior && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
              <Layers className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  Substituindo versão anterior: "{docAnterior.title}"
                </span>
                <p className="text-blue-800/80 mt-0.5">
                  O documento anterior NÃO será apagado. Esta nova versão apontará para ele através
                  do campo{' '}
                  <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[11px]">
                    supersedes_id
                  </code>
                  , preservando o histórico completo de auditoria do family office.
                </p>
              </div>
            </div>
          )}

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
                      [{imv.code}] {imv.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erros.imovelId && (
                <p className="text-xs text-red-600 font-medium">{erros.imovelId}</p>
              )}
            </div>

            {/* 4) Upload com Limite de 20 MB e aviso em pt-BR */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-gray-700">
                  Arquivo do Documento (Paperless) <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-gray-400 font-medium">Limite: 20 MB</span>
              </div>
              <div
                className={cn(
                  'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors text-center cursor-pointer',
                  arquivo
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : erros.arquivo
                      ? 'border-red-300 bg-red-50/20'
                      : 'border-gray-300 bg-gray-50/60 hover:bg-gray-100/60',
                )}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {arquivo ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{arquivo.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {tamanhoFormatado} • Clique para selecionar outro arquivo
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
                        Clique ou arraste o arquivo para envio
                      </p>
                      <p className="text-[11px] text-gray-400">
                        PDF, DOCX, Imagens • Tamanho máximo permitido: 20 MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {erros.arquivo && <p className="text-xs text-red-600 font-medium">{erros.arquivo}</p>}
            </div>

            {/* Título do Documento */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold text-gray-700">
                Título do Documento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ex.: Matrícula Atualizada com Ônus Vintenária ou IPTU 2025"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (erros.title) setErros((prev) => ({ ...prev, title: '' }))
                }}
                className={cn(
                  'h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]',
                  erros.title && 'border-red-500',
                )}
              />
              {erros.title && <p className="text-xs text-red-600 font-medium">{erros.title}</p>}
            </div>

            {/* Catálogo fechado de 20 tipos de documentos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="doc_type" className="text-xs font-bold text-gray-700">
                  Tipo de Documento (Catálogo de 20 tipos) <span className="text-red-500">*</span>
                </Label>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                  {docType === 'matricula' || docType === 'escritura'
                    ? 'Alta prioridade (Doc Principal)'
                    : 'Classificação oficial'}
                </span>
              </div>
              <Select value={docType} onValueChange={(val) => setDocType(val as TipoDocumento)}>
                <SelectTrigger id="doc_type" className="h-11 bg-gray-50/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-60">
                  {lista20Tipos.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_DOCUMENTO_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data do Documento e Validade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="document_date" className="text-xs font-bold text-gray-700">
                  Data do documento
                </Label>
                <Input
                  id="document_date"
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valid_until" className="text-xs font-bold text-gray-700">
                  Validade (valid_until)
                </Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                />
                <p className="text-[11px] text-gray-400">
                  Importante para certidões e apólices com prazo de vencimento.
                </p>
              </div>
            </div>

            {/* Colunas extras: review_status e evidence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="review_status" className="text-xs font-bold text-gray-700">
                  Status de conferência (review_status)
                </Label>
                <Select
                  value={reviewStatus}
                  onValueChange={(val) => setReviewStatus(val as ReviewStatus)}
                >
                  <SelectTrigger id="review_status" className="h-11 bg-gray-50/50 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {reviewStatusList.map((st) => (
                      <SelectItem key={st} value={st}>
                        {REVIEW_STATUS_LABELS[st]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="evidence" className="text-xs font-bold text-gray-700">
                  Natureza da evidência (evidence)
                </Label>
                <Select value={evidence} onValueChange={(val) => setEvidence(val as EvidenceType)}>
                  <SelectTrigger id="evidence" className="h-11 bg-gray-50/50 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {evidenceList.map((ev) => (
                      <SelectItem key={ev} value={ev}>
                        {EVIDENCE_LABELS[ev]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checkbox: Documento Sensível */}
            <div className="flex items-start space-x-3 rounded-xl border border-purple-100 bg-purple-50/30 p-4">
              <Checkbox
                id="sensitive"
                checked={sensitive}
                onCheckedChange={(checked) => setSensitive(Boolean(checked))}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor="sensitive"
                  className="text-xs font-bold text-gray-900 cursor-pointer flex items-center gap-1.5"
                >
                  <Shield className="h-3.5 w-3.5 text-purple-700" />
                  <span>Documento sensível (sensitive)</span>
                </Label>
                <p className="text-[11px] text-gray-500">
                  Marque se contiver dados patrimoniais confidenciais ou documentos pessoais dos
                  membros da família.
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
                {loading ? 'Enviando ao Paperless...' : 'Vincular Documento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
