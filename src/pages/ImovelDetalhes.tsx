import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  FileText,
  Plus,
  ExternalLink,
  Download,
  AlertCircle,
  FileCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Building,
  RefreshCw,
  Shield,
  Layers,
} from 'lucide-react'
import {
  Imovel,
  Documento,
  SituacaoOcupacao,
  PropertyStatusHistory,
  SITUACAO_LABELS,
  SITUACAO_CONFIG,
  TIPO_DOCUMENTO_LABELS,
  TIPO_IMOVEL_LABELS,
  REVIEW_STATUS_LABELS,
  EVIDENCE_LABELS,
} from '@/types/imob'
import {
  obterImovelPorId,
  alterarSituacaoImovel,
  listarDocumentos,
  obterDocumentoPrincipal,
  listarHistoricoStatus,
} from '@/lib/imobDb'
import { useAuth } from '@/contexts/AuthContext'
import { SituacaoBadge } from '@/components/SituacaoBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ImovelDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [imovel, setImovel] = useState<Imovel | null>(null)
  const [documentoPrincipal, setDocumentoPrincipal] = useState<Documento | null>(null)
  const [versoesAnteriores, setVersoesAnteriores] = useState<Documento[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [historicoStatus, setHistoricoStatus] = useState<PropertyStatusHistory[]>([])
  const [loading, setLoading] = useState(true)

  // Diálogo para alteração de situação (com motivo opcional)
  const [situacaoParaAlterar, setSituacaoParaAlterar] = useState<SituacaoOcupacao | null>(null)
  const [motivoMudanca, setMotivoMudanca] = useState('')
  const [salvandoSituacao, setSalvandoSituacao] = useState(false)

  const carregarDados = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const imv = await obterImovelPorId(id, usuario?.familia_id)
      setImovel(imv)

      if (imv) {
        const [docs, docPrincRes, hist] = await Promise.all([
          listarDocumentos({ propertyId: id, familiaId: usuario?.familia_id }),
          obterDocumentoPrincipal(id, usuario?.familia_id),
          listarHistoricoStatus(id),
        ])
        setDocumentos(docs)
        setDocumentoPrincipal(docPrincRes.documento)
        setVersoesAnteriores(docPrincRes.versoesAnteriores)
        setHistoricoStatus(hist)
      }
    } finally {
      setLoading(false)
    }
  }, [id, usuario?.familia_id])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  useEffect(() => {
    const handleUpdate = () => {
      carregarDados()
    }
    window.addEventListener('mfo_imoveis_changed', handleUpdate)
    window.addEventListener('mfo_documentos_changed', handleUpdate)
    window.addEventListener('mfo_status_history_changed', handleUpdate)
    return () => {
      window.removeEventListener('mfo_imoveis_changed', handleUpdate)
      window.removeEventListener('mfo_documentos_changed', handleUpdate)
      window.removeEventListener('mfo_status_history_changed', handleUpdate)
    }
  }, [carregarDados])

  const confirmarAlteracaoSituacao = async () => {
    if (!imovel || !situacaoParaAlterar || !usuario) return
    setSalvandoSituacao(true)
    try {
      const atualizado = await alterarSituacaoImovel({
        id: imovel.id,
        novaSituacao: situacaoParaAlterar,
        motivo: motivoMudanca.trim() || undefined,
        usuario,
      })
      setImovel(atualizado)
      toast.success(
        `Situação alterada com sucesso para "${SITUACAO_LABELS[situacaoParaAlterar]}" e gravada no histórico.`,
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar situação.'
      toast.error(msg)
    } finally {
      setSalvandoSituacao(false)
      setSituacaoParaAlterar(null)
      setMotivoMudanca('')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2C4A6E] border-t-transparent" />
          <p className="text-sm text-gray-500">Carregando imóvel...</p>
        </div>
      </div>
    )
  }

  if (!imovel) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900">Imóvel não localizado</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Este imóvel não existe ou pertence a outra família cadastrada no family office.
        </p>
        <Button onClick={() => navigate('/')} variant="outline" className="mt-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para lista de imóveis
        </Button>
      </div>
    )
  }

  // 7 situações de ocupação exatas
  const situacoes: SituacaoOcupacao[] = [
    'disponivel',
    'locado',
    'em_reforma',
    'em_obra',
    'uso_proprio',
    'a_venda',
    'vendido',
  ]

  return (
    <div className="space-y-6 pb-16">
      {/* Botão de retorno e Ações do Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#2C4A6E] transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para todos os imóveis</span>
        </button>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            onClick={() => navigate(`/imovel/${imovel.id}/editar`)}
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <Edit className="h-4 w-4 text-gray-500" />
            <span>Editar imóvel</span>
          </Button>

          <Button
            onClick={() => navigate(`/documento/novo?imovelId=${imovel.id}`)}
            size="sm"
            className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Vincular documento</span>
          </Button>
        </div>
      </div>

      {/* Cabeçalho do Imóvel com Destaque e Dados Exatos (sem observações) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <SituacaoBadge situacao={imovel.status} size="lg" />
              {/* Código destacado (ex.: 51002) */}
              <span className="rounded-md bg-[#2C4A6E]/10 text-[#2C4A6E] px-2.5 py-1 text-xs font-mono font-bold border border-[#2C4A6E]/20">
                Código: {imovel.code}
              </span>
              <span className="rounded-md bg-gray-100 text-gray-700 px-2.5 py-1 text-xs font-medium border border-gray-200">
                Tipo: {TIPO_IMOVEL_LABELS[imovel.kind]}
              </span>
              {imovel.unit && (
                <span className="rounded-md bg-gray-100 text-gray-700 px-2.5 py-1 text-xs font-medium border border-gray-200">
                  Unidade: {imovel.unit}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
              {imovel.display_name}
            </h2>

            {imovel.address && (
              <p className="text-sm sm:text-base text-gray-600 max-w-3xl leading-relaxed">
                {imovel.address}
                {imovel.city ? `, ${imovel.city}` : ''}
                {imovel.state ? ` - ${imovel.state}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Grade de Metadados Oficiais (Propriedade, Cartório, IPTU, etc.) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-4 border-t border-gray-100 text-xs">
          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Entidade Proprietária:</span>
            <span
              className="font-semibold text-gray-900 mt-0.5 block truncate"
              title={imovel.entity_name}
            >
              {imovel.entity_name || 'BNI Participações'}
            </span>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Matrícula:</span>
            <span className="font-semibold text-gray-900 mt-0.5 block">
              {imovel.registry_number || 'Não informada'}
            </span>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Cartório:</span>
            <span
              className="font-semibold text-gray-900 mt-0.5 block truncate"
              title={imovel.registry_office}
            >
              {imovel.registry_office || 'Não informado'}
            </span>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Inscrição IPTU:</span>
            <span className="font-semibold text-gray-900 mt-0.5 block font-mono">
              {imovel.iptu_number || 'Não informada'}
            </span>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Área privativa:</span>
            <span className="font-semibold text-gray-900 mt-0.5 block">
              {imovel.area_private_m2 !== undefined
                ? `${imovel.area_private_m2.toLocaleString('pt-BR')} m²`
                : 'Não informada'}
            </span>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Natureza Contábil:</span>
            <span
              className="font-semibold text-gray-900 mt-0.5 block truncate"
              title={imovel.accounting_nature}
            >
              {imovel.accounting_nature || 'Geral'}
            </span>
          </div>
        </div>
      </div>

      {/* (2) Seção: Situação de Ocupação — 7 valores exatos com gravação em property_status_history */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Situação de Ocupação
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Altere o status atual. Toda mudança grava uma linha com data e motivo em
                property_status_history.
              </CardDescription>
            </div>
            <SituacaoBadge situacao={imovel.status} size="md" />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {situacoes.map((item) => {
              const isSelected = imovel.status === item
              const cfg = SITUACAO_CONFIG[item]
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    if (!isSelected) {
                      setSituacaoParaAlterar(item)
                      setMotivoMudanca('')
                    }
                  }}
                  className={cn(
                    'flex flex-col items-start p-3.5 rounded-xl border text-left transition-all relative',
                    isSelected
                      ? cn(cfg.btnClass, 'shadow-xs ring-2 ring-offset-1 ring-[#2C4A6E]')
                      : 'bg-white hover:bg-gray-50/90 border-gray-200 text-gray-800',
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span
                      className={cn(
                        'text-xs font-bold',
                        isSelected ? 'text-white' : 'text-gray-900',
                      )}
                    >
                      {cfg.label}
                    </span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-white shrink-0" />}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] line-clamp-2 leading-relaxed',
                      isSelected ? 'text-white/90' : 'text-gray-500',
                    )}
                  >
                    {cfg.descricao}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Histórico recente de situações (property_status_history) */}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <Clock className="h-4 w-4 text-[#2C4A6E]" />
              <span>Histórico de Mudanças de Situação ({historicoStatus.length})</span>
            </div>

            {historicoStatus.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum registro no histórico de status.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {historicoStatus.map((h) => (
                  <div
                    key={h.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 text-xs border border-gray-200/70"
                  >
                    <div className="flex items-center gap-2">
                      <SituacaoBadge situacao={h.status} size="sm" showDot={false} />
                      <span className="font-semibold text-gray-800">
                        {h.reason || 'Atualização de situação'}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2 shrink-0">
                      <span>Desde: {h.since}</span>
                      {h.created_by_name && (
                        <>
                          <span>•</span>
                          <span>Por: {h.created_by_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* (3) Seção: Documento Principal (derivado por prioridade: matricula → escritura → contrato_locacao → espelho_iptu → outros) */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-[#2C4A6E]" />
                <span>Documento Principal</span>
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Derivado automaticamente por prioridade legal: Matrícula → Escritura → Contrato de
                locação → Espelho IPTU → Outros
              </CardDescription>
            </div>
            {documentoPrincipal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/imovel/${imovel.id}/documento-principal`)}
                className="text-xs border-gray-300 text-[#2C4A6E] hover:bg-gray-50"
              >
                Gerenciar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {documentoPrincipal ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-blue-100 bg-blue-50/40">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2C4A6E] text-white shadow-xs">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900 line-clamp-1">
                        {documentoPrincipal.title}
                      </span>
                      <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5">
                        Principal Ativo
                      </span>
                      {documentoPrincipal.review_status && (
                        <span
                          className={cn(
                            'rounded-full text-[10px] font-bold px-2 py-0.5',
                            documentoPrincipal.review_status === 'conferido'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800',
                          )}
                        >
                          {REVIEW_STATUS_LABELS[documentoPrincipal.review_status]}
                        </span>
                      )}
                      {documentoPrincipal.sensitive && (
                        <span className="rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 inline-flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Sensível
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                      <span className="font-semibold text-gray-700">
                        {TIPO_DOCUMENTO_LABELS[documentoPrincipal.doc_type]}
                      </span>
                      <span>•</span>
                      <span>{documentoPrincipal.file_size_formatted}</span>
                      {documentoPrincipal.document_date && (
                        <>
                          <span>•</span>
                          <span>Data: {documentoPrincipal.document_date}</span>
                        </>
                      )}
                      {documentoPrincipal.valid_until && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">
                            Válido até: {documentoPrincipal.valid_until}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 font-mono">
                      Ref. Paperless: #{documentoPrincipal.paperless_id || '---'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Substituir (cria novo doc com supersedes_id) */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/documento/novo?imovelId=${imovel.id}&substituirDocId=${documentoPrincipal.id}&tipoPre=${documentoPrincipal.doc_type}`,
                      )
                    }
                    className="text-xs border-gray-300 text-gray-700 hover:bg-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Substituir
                  </Button>

                  {/* "Abrir documento" = link do Paperless */}
                  <a
                    href={documentoPrincipal.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Abrir documento</span>
                  </a>
                </div>
              </div>

              {/* Versões Anteriores (histórico de substituições via supersedes_id) */}
              {versoesAnteriores.length > 0 && (
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <Layers className="h-3.5 w-3.5 text-gray-500" />
                    <span>Versões Anteriores deste Documento ({versoesAnteriores.length})</span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {versoesAnteriores.map((v) => (
                      <div
                        key={v.id}
                        className="py-2 flex items-center justify-between text-xs gap-2"
                      >
                        <div>
                          <span className="font-medium text-gray-800 block truncate">
                            {v.title}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Data: {v.document_date || '---'} • {v.file_size_formatted}
                          </span>
                        </div>
                        <a
                          href={v.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#2C4A6E] hover:underline font-semibold shrink-0"
                        >
                          Ver no Paperless
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 text-center sm:text-left">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  Nenhum documento principal vinculado
                </h4>
                <p className="text-xs text-gray-500">
                  Vincule a matrícula ou escritura para acesso prioritário da equipe operacional.
                </p>
              </div>
              <Button
                onClick={() => navigate(`/documento/novo?imovelId=${imovel.id}&tipoPre=matricula`)}
                className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white text-xs shrink-0 self-center sm:self-auto"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Vincular Matrícula
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* (4) Seção: Todos os Documentos do Imóvel (Catálogo 20 tipos) */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Todos os Documentos do Imóvel ({documentos.length})
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Dossiê completo guardado no Paperless com metadados no Supabase
              </CardDescription>
            </div>
            <Button
              onClick={() => navigate(`/documento/novo?imovelId=${imovel.id}`)}
              size="sm"
              variant="outline"
              className="border-gray-300 text-[#2C4A6E] hover:bg-gray-50 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>+ Vincular documento</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {documentos.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">
                Nenhum documento vinculado a este imóvel ainda.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Adicione contratos de locação, certidões ou comprovantes para manter o dossiê
                completo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {documentos.map((doc) => {
                const isPrincipalAtivo = documentoPrincipal?.id === doc.id
                return (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-gray-50/70 transition-colors gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 mt-0.5">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {doc.title}
                          </span>
                          {isPrincipalAtivo && (
                            <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5">
                              Doc. Principal
                            </span>
                          )}
                          {doc.review_status && (
                            <span
                              className={cn(
                                'rounded-full text-[10px] font-bold px-2 py-0.5',
                                doc.review_status === 'conferido'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800',
                              )}
                            >
                              {REVIEW_STATUS_LABELS[doc.review_status]}
                            </span>
                          )}
                          {doc.evidence && (
                            <span className="rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium px-2 py-0.5">
                              {EVIDENCE_LABELS[doc.evidence]}
                            </span>
                          )}
                          {doc.sensitive && (
                            <span className="rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 inline-flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Sensível
                            </span>
                          )}
                          {doc.supersedes_id && (
                            <span className="rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5">
                              Substitui versão anterior
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                          <span className="font-semibold text-gray-700">
                            {TIPO_DOCUMENTO_LABELS[doc.doc_type]}
                          </span>
                          <span>•</span>
                          <span>{doc.file_size_formatted}</span>
                          {doc.document_date && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {doc.document_date}
                              </span>
                            </>
                          )}
                          {doc.valid_until && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 font-medium">
                                Validade: {doc.valid_until}
                              </span>
                            </>
                          )}
                          <span className="text-gray-400 font-mono text-[11px]">
                            Ref: #{doc.paperless_id || '---'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/documento/novo?imovelId=${imovel.id}&substituirDocId=${doc.id}&tipoPre=${doc.doc_type}`,
                          )
                        }
                        className="text-xs text-gray-600 hover:text-gray-900"
                        title="Substituir por versão mais recente mantendo histórico"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Substituir
                      </Button>

                      {/* Abrir documento = link do Paperless */}
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#2C4A6E] hover:underline px-2.5 py-1.5 rounded-md hover:bg-blue-50"
                        title="Abrir documento no Paperless"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Abrir documento</span>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Confirmação para Alteração de Situação (com motivo opcional) */}
      <AlertDialog
        open={situacaoParaAlterar !== null}
        onOpenChange={(open) => !open && setSituacaoParaAlterar(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">
              Confirmar alteração de situação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 space-y-3">
              <div>
                Você está alterando a situação do imóvel <strong>{imovel.display_name}</strong> para{' '}
                <strong className="text-[#2C4A6E]">
                  "{situacaoParaAlterar ? SITUACAO_LABELS[situacaoParaAlterar] : ''}"
                </strong>
                .
              </div>

              <div className="text-left space-y-1.5 pt-2">
                <Label htmlFor="motivo_dialog" className="text-xs font-bold text-gray-700">
                  Motivo da mudança (opcional)
                </Label>
                <Input
                  id="motivo_dialog"
                  placeholder="Ex.: Chaves entregues, início de obras, contrato assinado..."
                  value={motivoMudanca}
                  onChange={(e) => setMotivoMudanca(e.target.value)}
                  className="h-10 text-xs"
                />
                <p className="text-[11px] text-gray-400">
                  Esta alteração será gravada em <strong>property_status_history</strong> com data
                  de hoje e seu usuário.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200 text-gray-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarAlteracaoSituacao}
              disabled={salvandoSituacao}
              className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white"
            >
              {salvandoSituacao ? 'Gravando...' : 'Confirmar alteração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
