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
  CheckCircle2,
} from 'lucide-react'
import { Imovel, Documento, TIPO_DOCUMENTO_LABELS } from '@/types/imob'
import {
  obterImovelPorId,
  obterDocumentoPrincipal,
  desvincularDocumentoPrincipal,
  removerDocumento,
} from '@/lib/imobDb'
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

export default function DocumentoPrincipal() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [imovel, setImovel] = useState<Imovel | null>(null)
  const [documento, setDocumento] = useState<Documento | null>(null)
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
        const doc = await obterDocumentoPrincipal(id, usuario?.familia_id)
        setDocumento(doc)
      }
    } finally {
      setLoading(false)
    }
  }, [id, usuario?.familia_id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const handleRemoverVinculo = async () => {
    if (!imovel || !documento) return
    setRemovendo(true)
    try {
      await desvincularDocumentoPrincipal(imovel.id, usuario?.familia_id)
      toast.success('Vínculo de documento principal removido com sucesso.')
      navigate(`/imovel/${imovel.id}`)
    } catch {
      toast.error('Erro ao desvincular o documento principal.')
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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Voltar ao imóvel */}
      <button
        onClick={() => navigate(`/imovel/${imovel.id}`)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#2C4A6E] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar para {imovel.nome}</span>
      </button>

      {/* Cartão Informativo do Documento Principal */}
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <div className="bg-[#2C4A6E] p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-white/10">
              <Building className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">
                Documento Principal do Imóvel
              </span>
              <h2 className="text-xl font-bold text-white leading-tight">{imovel.nome}</h2>
            </div>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {documento ? (
            <div className="space-y-6">
              {/* Box de Pré-visualização / Informação do Arquivo */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200 text-[#2C4A6E] shadow-xs">
                  <FileText className="h-8 w-8" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 break-words">
                      {documento.nome}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">
                      Tipo: {TIPO_DOCUMENTO_LABELS[documento.tipo]}
                    </span>
                    <span>•</span>
                    <span>Tamanho: {documento.tamanho_formatado}</span>
                    {documento.data_documento && (
                      <>
                        <span>•</span>
                        <span>Data do arquivo: {documento.data_documento}</span>
                      </>
                    )}
                  </div>
                  {documento.descricao && (
                    <p className="text-xs text-gray-600 mt-2 bg-white p-2.5 rounded-lg border border-gray-200">
                      {documento.descricao}
                    </p>
                  )}
                </div>
              </div>

              {/* Ações Disponíveis */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                {/* Botão "Abrir documento" (URL pública de storage do Supabase) */}
                <a
                  href={documento.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white py-3 px-4 font-semibold text-sm shadow-xs transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Abrir documento em nova aba</span>
                </a>

                {/* Botão "Substituir documento principal" */}
                <Button
                  onClick={() =>
                    navigate(
                      `/documento/novo?imovelId=${imovel.id}&isPrincipal=true&substituirDocId=${documento.id}`,
                    )
                  }
                  variant="outline"
                  className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50 py-3"
                >
                  <RefreshCw className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Substituir documento</span>
                </Button>

                {/* Botão "Remover documento principal" */}
                <Button
                  onClick={() => setDialogRemoverOpen(true)}
                  variant="ghost"
                  className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 py-3"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Desvincular</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Não há documento principal cadastrado */
            <div className="text-center py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Nenhum documento principal vinculado
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Este imóvel ainda não possui um documento principal definido. Você pode adicionar
                  a escritura ou registro agora mesmo.
                </p>
              </div>
              <Button
                onClick={() => navigate(`/documento/novo?imovelId=${imovel.id}&isPrincipal=true`)}
                className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white"
              >
                Vincular documento principal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmação de Remoção */}
      <AlertDialog open={dialogRemoverOpen} onOpenChange={setDialogRemoverOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">
              Desvincular documento principal?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              O documento deixará de ser o documento de destaque deste imóvel. O arquivo ainda
              permanecerá salvo na lista de documentos caso você queira acessá-lo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoverVinculo}
              disabled={removendo}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {removendo ? 'Desvinculando...' : 'Confirmar desvinculação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
