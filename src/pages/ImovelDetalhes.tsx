import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
} from 'lucide-react'
import {
  Imovel,
  Documento,
  SituacaoOcupacao,
  SITUACAO_LABELS,
  TIPO_DOCUMENTO_LABELS,
} from '@/types/imob'
import {
  obterImovelPorId,
  alterarSituacaoImovel,
  listarDocumentos,
  obterDocumentoPrincipal,
} from '@/lib/imobDb'
import { useAuth } from '@/contexts/AuthContext'
import { SituacaoBadge } from '@/components/SituacaoBadge'
import { Button } from '@/components/ui/button'
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
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

  // Estado para diálogo de confirmação de alteração de situação
  const [situacaoParaAlterar, setSituacaoParaAlterar] = useState<SituacaoOcupacao | null>(null)
  const [salvandoSituacao, setSalvandoSituacao] = useState(false)

  const carregarDados = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const imv = await obterImovelPorId(id, usuario?.familia_id)
      setImovel(imv)

      if (imv) {
        const [docs, docPrinc] = await Promise.all([
          listarDocumentos({ imovelId: id, familiaId: usuario?.familia_id }),
          obterDocumentoPrincipal(id, usuario?.familia_id),
        ])
        setDocumentos(docs)
        setDocumentoPrincipal(docPrinc)
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
    return () => {
      window.removeEventListener('mfo_imoveis_changed', handleUpdate)
      window.removeEventListener('mfo_documentos_changed', handleUpdate)
    }
  }, [carregarDados])

  const confirmarAlteracaoSituacao = async () => {
    if (!imovel || !situacaoParaAlterar) return
    setSalvandoSituacao(true)
    try {
      const atualizado = await alterarSituacaoImovel(
        imovel.id,
        situacaoParaAlterar,
        usuario?.familia_id,
      )
      setImovel(atualizado)
      toast.success(`Situação alterada com sucesso para "${SITUACAO_LABELS[situacaoParaAlterar]}"`)
    } catch {
      toast.error('Não foi possível alterar a situação do imóvel.')
    } finally {
      setSalvandoSituacao(false)
      setSituacaoParaAlterar(null)
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

  // Opções de ocupação para botões grandes
  const situacoes: { id: SituacaoOcupacao; label: string; desc: string }[] = [
    { id: 'ocupado', label: 'Ocupado', desc: 'Com locatário ou morador' },
    { id: 'desocupado', label: 'Desocupado', desc: 'Vago e disponível' },
    { id: 'em_reforma', label: 'Em reforma', desc: 'Obras ou manutenção' },
    { id: 'indisponivel', label: 'Indisponível', desc: 'Bloqueado temporariamente' },
  ]

  return (
    <div className="space-y-6 pb-12">
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

      {/* Cabeçalho do Imóvel com Destaque */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <SituacaoBadge situacao={imovel.situacao} size="lg" />
              {imovel.matricula && (
                <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-mono text-gray-700 border border-gray-200">
                  Matrícula: {imovel.matricula}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
              {imovel.nome}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl leading-relaxed">
              {imovel.endereco}
            </p>
          </div>
        </div>

        {imovel.observacoes && (
          <div className="mt-4 rounded-xl bg-gray-50/80 p-4 border border-gray-200 text-xs sm:text-sm text-gray-700">
            <span className="font-semibold text-gray-900 block mb-1">Observações internas:</span>
            <p className="whitespace-pre-line leading-relaxed">{imovel.observacoes}</p>
          </div>
        )}
      </div>

      {/* (2) Seção: Situação de Ocupação — Cartão destacado com botões grandes */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Situação de Ocupação
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Altere o status operacional do imóvel com apenas um clique
              </CardDescription>
            </div>
            <SituacaoBadge situacao={imovel.situacao} size="md" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {situacoes.map((item) => {
              const isSelected = imovel.situacao === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!isSelected) {
                      setSituacaoParaAlterar(item.id)
                    }
                  }}
                  className={cn(
                    'flex flex-col items-start p-4 rounded-xl border text-left transition-all relative',
                    isSelected
                      ? item.id === 'ocupado'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : item.id === 'desocupado'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : item.id === 'em_reforma'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white hover:bg-gray-50/80 border-gray-200 text-gray-800',
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isSelected ? 'text-white' : 'text-gray-900',
                      )}
                    >
                      {item.label}
                    </span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-white shrink-0" />}
                  </div>
                  <span
                    className={cn(
                      'text-xs line-clamp-2 leading-relaxed',
                      isSelected ? 'text-white/90' : 'text-gray-500',
                    )}
                  >
                    {item.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* (3) Seção: Documento Principal */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-[#2C4A6E]" />
                <span>Documento Principal</span>
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Escritura, matrícula ou título principal de propriedade
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-blue-100 bg-blue-50/40">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2C4A6E] text-white shadow-xs">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900 line-clamp-1">
                      {documentoPrincipal.nome}
                    </span>
                    <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5">
                      Principal
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                    <span>{TIPO_DOCUMENTO_LABELS[documentoPrincipal.tipo]}</span>
                    <span>•</span>
                    <span>{documentoPrincipal.tamanho_formatado}</span>
                    {documentoPrincipal.data_documento && (
                      <>
                        <span>•</span>
                        <span>Data: {documentoPrincipal.data_documento}</span>
                      </>
                    )}
                  </div>
                  {documentoPrincipal.descricao && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                      {documentoPrincipal.descricao}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {/* Botão "Abrir documento" em nova aba */}
                <a
                  href={documentoPrincipal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Abrir documento</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 text-center sm:text-left">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  Nenhum documento principal vinculado
                </h4>
                <p className="text-xs text-gray-500">
                  Vincule a escritura ou certidão de matrícula mais recente para acesso rápido da
                  equipe.
                </p>
              </div>
              <Button
                onClick={() => navigate(`/documento/novo?imovelId=${imovel.id}&isPrincipal=true`)}
                className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white text-xs shrink-0 self-center sm:self-auto"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Vincular documento principal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* (4) Seção: Todos os Documentos do Imóvel */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Todos os Documentos do Imóvel ({documentos.length})
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Contratos, IPTU, escrituras, plantas e outros arquivos
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
              {documentos.map((doc) => (
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
                          {doc.nome}
                        </span>
                        {doc.is_principal && (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                            Doc. Principal
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
                        <span className="font-medium text-gray-700">
                          {TIPO_DOCUMENTO_LABELS[doc.tipo]}
                        </span>
                        <span>•</span>
                        <span>{doc.tamanho_formatado}</span>
                        {doc.data_documento && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {doc.data_documento}
                            </span>
                          </>
                        )}
                      </div>
                      {doc.descricao && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{doc.descricao}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#2C4A6E] hover:underline px-2.5 py-1.5 rounded-md hover:bg-blue-50"
                      title="Abrir em nova aba"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Baixar/Abrir</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Confirmação para Alteração de Situação */}
      <AlertDialog
        open={situacaoParaAlterar !== null}
        onOpenChange={(open) => !open && setSituacaoParaAlterar(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">
              Confirmar alteração de situação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Você deseja alterar a situação do imóvel <strong>{imovel.nome}</strong> para{' '}
              <strong className="text-[#2C4A6E]">
                "{situacaoParaAlterar ? SITUACAO_LABELS[situacaoParaAlterar] : ''}"
              </strong>
              ?
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
              {salvandoSituacao ? 'Alterando...' : 'Confirmar alteração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
