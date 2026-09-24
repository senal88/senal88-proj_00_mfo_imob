import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  RefreshCw,
  Trash2,
  AlertCircle,
  Building,
  Calendar,
  Shield,
  Layers,
  Clock,
} from 'lucide-react'
import {
  Imovel,
  Documento,
  TIPO_DOCUMENTO_LABELS,
  REVIEW_STATUS_LABELS,
  EVIDENCE_LABELS,
} from '@/types/imob'
import { obterImovelPorId, obterDocumentoPrincipal, removerDocumento } from '@/lib/imobDb'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

export default function DocumentoPrincipal() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [imovel, setImovel] = useState<Imovel | null>(null)
  const [documento, setDocumento] = useState<Documento | null>(null)
  const [versoesAnteriores, setVersoesAnteriores] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogRemoverOpen, setDialogRemoverOpen] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  const carregar = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const imv = await obterImovelPorId(id, usuario?.familia_id)
      setImovel(imv)
      if (imv) {
        const resultado = await obterDocumentoPrincipal(id, usuario?.familia_id)
        setDocumento(resultado.documento)
        setVersoesAnteriores(resultado.versoesAnteriores)
      }
    } finally {
      setLoading(false)
    }
  }, [id, usuario?.familia_id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const handleRemover = async () => {
    if (!documento) return
    setRemovendo(true)
    try {
      await removerDocumento(documento.id, usuario?.familia_id)
      toast.success('Documento removido com sucesso.')
      navigate(`/imovel/${id}`)
    } catch {
      toast.error('Erro ao remover o documento.')
    } finally {
      setRemovendo(false)
      setDialogRemoverOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2C4A6E] border-t-transparent" />
          <p className="text-sm text-gray-500">Carregando documento principal...</p>
        </div>
      </div>
    )
  }

  if (!imovel) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900">Imóvel não encontrado</h3>
        <Button onClick={() => navigate('/')} variant="outline">
          Voltar aos imóveis
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Voltar ao imóvel */}
      <button
        onClick={() => navigate(`/imovel/${imovel.id}`)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#2C4A6E] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar para {imovel.display_name}</span>
      </button>

      {/* Cartão Informativo do Documento Principal Derivado */}
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <div className="bg-[#2C4A6E] p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-white">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-200 font-bold">
                Documento Principal Derivado por Prioridade Legal
              </span>
              <h2 className="text-xl font-bold text-white leading-tight">{imovel.display_name}</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Código: {imovel.code} • Prioridade: Matrícula → Escritura → Contrato de locação →
                Espelho IPTU → Outros
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {documento ? (
            <div className="space-y-6">
              {/* Box de Informações do Arquivo no Paperless */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50/70">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200 text-[#2C4A6E] shadow-xs">
                  <FileText className="h-8 w-8" />
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900 break-words">
                      {documento.title}
                    </h3>
                    <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5">
                      Principal Ativo
                    </span>
                    {documento.review_status && (
                      <span
                        className={cn(
                          'rounded-full text-[10px] font-bold px-2 py-0.5',
                          documento.review_status === 'conferido'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800',
                        )}
                      >
                        {REVIEW_STATUS_LABELS[documento.review_status]}
                      </span>
                    )}
                    {documento.sensitive && (
                      <span className="rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 inline-flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Sensível
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">
                      Tipo: {TIPO_DOCUMENTO_LABELS[documento.doc_type]}
                    </span>
                    <span>•</span>
                    <span>Tamanho: {documento.file_size_formatted}</span>
                    {documento.document_date && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Data: {documento.document_date}
                        </span>
                      </>
                    )}
                    {documento.valid_until && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700 font-medium">
                          Validade: {documento.valid_until}
                        </span>
                      </>
                    )}
                  </div>

                  {documento.evidence && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Evidência:</span>{' '}
                      {EVIDENCE_LABELS[documento.evidence]}
                    </div>
                  )}

                  <div className="text-[11px] text-gray-400 font-mono pt-1">
                    Paperless ID: #{documento.paperless_id || '---'} • Hash:{' '}
                    {documento.sha256 ? `${documento.sha256.substring(0, 16)}...` : '---'}
                  </div>
                </div>
              </div>

              {/* Ações Disponíveis */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                {/* Botão "Abrir documento" = link do Paperless */}
                <a
                  href={documento.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white py-3 px-4 font-semibold text-sm shadow-xs transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Abrir documento no Paperless</span>
                </a>

                {/* Botão "Substituir documento" com supersedes_id */}
                <Button
                  onClick={() =>
                    navigate(
                      `/documento/novo?imovelId=${imovel.id}&substituirDocId=${documento.id}&tipoPre=${documento.doc_type}`,
                    )
                  }
                  variant="outline"
                  className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50 py-3"
                >
                  <RefreshCw className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Substituir versão</span>
                </Button>

                {/* Excluir metadado */}
                <Button
                  onClick={() => setDialogRemoverOpen(true)}
                  variant="ghost"
                  className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 py-3"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Excluir</span>
                </Button>
              </div>

              {/* Versões Anteriores Preservadas */}
              {versoesAnteriores.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 mt-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <Layers className="h-4 w-4 text-[#2C4A6E]" />
                    <span>Versões Anteriores Catalogadas ({versoesAnteriores.length})</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    O sistema mantém o rastreamento histórico de cada substituição através de
                    supersedes_id sem excluir as versões antigas.
                  </p>
                  <div className="divide-y divide-gray-200">
                    {versoesAnteriores.map((v) => (
                      <div
                        key={v.id}
                        className="py-2.5 flex items-center justify-between text-xs gap-3"
                      >
                        <div>
                          <span className="font-semibold text-gray-900 block truncate">
                            {v.title}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Data: {v.document_date || '---'} • {v.file_size_formatted} • Ref: #
                            {v.paperless_id}
                          </span>
                        </div>
                        <a
                          href={v.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2C4A6E] hover:underline shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Ver no Paperless</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Nenhum documento principal disponível
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Vincule a certidão de matrícula ou escritura lavrada em cartório. O sistema a
                  reconhecerá automaticamente como documento principal.
                </p>
              </div>
              <Button
                onClick={() => navigate(`/documento/novo?imovelId=${imovel.id}&tipoPre=matricula`)}
                className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white"
              >
                Vincular Matrícula
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={dialogRemoverOpen} onOpenChange={setDialogRemoverOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Excluir este documento?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              O registro deste documento será removido do sistema. Esta ação não poderá ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemover}
              disabled={removendo}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {removendo ? 'Excluindo...' : 'Confirmar exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
