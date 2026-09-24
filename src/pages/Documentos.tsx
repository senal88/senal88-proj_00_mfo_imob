import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  FolderOpen,
  Plus,
  Building,
  Filter,
  ExternalLink,
  Calendar,
  FileText,
  Shield,
  Layers,
} from 'lucide-react'
import {
  Documento,
  Imovel,
  TIPO_DOCUMENTO_LABELS,
  REVIEW_STATUS_LABELS,
  EVIDENCE_LABELS,
} from '@/types/imob'
import { listarDocumentos, listarImoveis } from '@/lib/imobDb'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function Documentos() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [imovelFiltro, setImovelFiltro] = useState<string>('todos')
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [docs, imvs] = await Promise.all([
        listarDocumentos({
          familiaId: usuario?.familia_id,
          propertyId: imovelFiltro === 'todos' ? undefined : imovelFiltro,
        }),
        listarImoveis(usuario?.familia_id),
      ])
      setDocumentos(docs)
      setImoveis(imvs)
    } finally {
      setLoading(false)
    }
  }, [usuario?.familia_id, imovelFiltro])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    const handleUpdate = () => {
      carregar()
    }
    window.addEventListener('mfo_documentos_changed', handleUpdate)
    window.addEventListener('mfo_imoveis_changed', handleUpdate)
    return () => {
      window.removeEventListener('mfo_documentos_changed', handleUpdate)
      window.removeEventListener('mfo_imoveis_changed', handleUpdate)
    }
  }, [carregar])

  const getImovelInfo = (propertyId: string) => {
    const imv = imoveis.find((i) => i.id === propertyId)
    return imv ? { nome: imv.display_name, code: imv.code } : { nome: 'Imóvel vinculado', code: '' }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Topo / Título e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111827]">
            Documentos dos Imóveis
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Dossiê digital via Paperless • {usuario?.familia_nome || 'Família Oliveira'} •{' '}
            {documentos.length}{' '}
            {documentos.length === 1 ? 'arquivo catalogado' : 'arquivos catalogados'}
          </p>
        </div>

        <Button
          onClick={() => navigate('/documento/novo')}
          className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span className="font-semibold text-sm">Vincular Documento</span>
        </Button>
      </div>

      {/* Filtro simples por Imóvel */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 shrink-0">
          <Filter className="h-4 w-4 text-[#2C4A6E]" />
          <span>Filtrar por imóvel:</span>
        </div>
        <div className="w-full sm:w-96">
          <Select value={imovelFiltro} onValueChange={setImovelFiltro}>
            <SelectTrigger className="w-full bg-[#F5F7FA] border-gray-200 text-xs sm:text-sm">
              <SelectValue placeholder="Selecione um imóvel" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="todos">Todos os imóveis da família</SelectItem>
              {imoveis.map((imv) => (
                <SelectItem key={imv.id} value={imv.id}>
                  [{imv.code}] {imv.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {imovelFiltro !== 'todos' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setImovelFiltro('todos')}
            className="text-xs text-gray-500 hover:text-gray-900 self-start sm:self-auto"
          >
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Tabela Responsiva / Lista de Documentos */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2C4A6E] border-t-transparent mx-auto mb-3" />
              <p className="text-xs text-gray-500">Carregando documentos...</p>
            </div>
          ) : documentos.length === 0 ? (
            /* Estado vazio */
            <div className="p-12 text-center space-y-3">
              <FolderOpen className="h-12 w-12 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-900">Nenhum documento catalogado</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                {imovelFiltro !== 'todos'
                  ? 'Não há documentos vinculados ao imóvel selecionado.'
                  : 'Nenhum documento foi catalogado para os imóveis desta família ainda.'}
              </p>
              <Button
                onClick={() =>
                  navigate(
                    imovelFiltro !== 'todos'
                      ? `/documento/novo?imovelId=${imovelFiltro}`
                      : '/documento/novo',
                  )
                }
                className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white text-xs mt-2"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Vincular primeiro documento
              </Button>
            </div>
          ) : (
            <>
              {/* Visualização em Tabela para Desktop (768px+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50/80 text-gray-600 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-6">Título do documento</th>
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4">Imóvel vinculado</th>
                      <th className="py-3.5 px-4">Data do doc.</th>
                      <th className="py-3.5 px-4">Status / Evidência</th>
                      <th className="py-3.5 px-6 text-right">Paperless</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documentos.map((doc) => {
                      const imvInfo = getImovelInfo(doc.property_id)
                      return (
                        <tr key={doc.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-4 px-6 font-semibold text-gray-900">
                            <div className="flex items-center gap-2.5">
                              <FileText className="h-4 w-4 text-[#2C4A6E] shrink-0" />
                              <div className="min-w-0">
                                <span className="block truncate max-w-xs">{doc.title}</span>
                                <span className="text-[11px] font-normal text-gray-400">
                                  {doc.file_size_formatted} • Ref: #{doc.paperless_id || '---'}
                                </span>
                              </div>
                              {doc.sensitive && (
                                <span
                                  className="rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 shrink-0"
                                  title="Documento sensível"
                                >
                                  Sensível
                                </span>
                              )}
                              {doc.supersedes_id && (
                                <span
                                  className="rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 shrink-0"
                                  title="Substituiu versão anterior"
                                >
                                  Versão atual
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            <span className="inline-block rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                              {TIPO_DOCUMENTO_LABELS[doc.doc_type]}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <Link
                              to={`/imovel/${doc.property_id}`}
                              className="inline-flex items-center gap-1.5 font-medium text-[#2C4A6E] hover:underline"
                              title="Ver detalhes deste imóvel"
                            >
                              <Building className="h-3.5 w-3.5 text-gray-400" />
                              <span className="truncate max-w-[200px]">
                                {imvInfo.code ? `[${imvInfo.code}] ` : ''}
                                {imvInfo.nome}
                              </span>
                            </Link>
                          </td>
                          <td className="py-4 px-4 text-gray-500 font-mono text-xs">
                            {doc.document_date ||
                              new Date(doc.created_at).toLocaleDateString('pt-BR')}
                            {doc.valid_until && (
                              <div className="text-[10px] text-amber-700 font-sans">
                                Até {doc.valid_until}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-xs">
                            <div className="flex flex-col gap-1">
                              {doc.review_status && (
                                <span
                                  className={cn(
                                    'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold w-fit',
                                    doc.review_status === 'conferido'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800',
                                  )}
                                >
                                  {REVIEW_STATUS_LABELS[doc.review_status]}
                                </span>
                              )}
                              {doc.evidence && (
                                <span className="text-[11px] text-gray-500">
                                  {EVIDENCE_LABELS[doc.evidence]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
                              title="Abrir arquivo guardado no Paperless"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Abrir documento</span>
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Visualização em Lista/Cards para Mobile (<768px) */}
              <div className="md:hidden divide-y divide-gray-100">
                {documentos.map((doc) => {
                  const imvInfo = getImovelInfo(doc.property_id)
                  return (
                    <div key={doc.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <FileText className="h-5 w-5 text-[#2C4A6E] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">
                              {doc.title}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {TIPO_DOCUMENTO_LABELS[doc.doc_type]} • {doc.file_size_formatted}
                            </p>
                          </div>
                        </div>
                        {doc.sensitive && (
                          <span className="rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 shrink-0">
                            Sensível
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-gray-100">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Imóvel vinculado:</span>
                          <Link
                            to={`/imovel/${doc.property_id}`}
                            className="font-medium text-[#2C4A6E] hover:underline"
                          >
                            {imvInfo.code ? `[${imvInfo.code}] ` : ''}
                            {imvInfo.nome}
                          </Link>
                        </div>

                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white px-3 py-1.5 text-xs font-semibold shadow-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Abrir documento</span>
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
