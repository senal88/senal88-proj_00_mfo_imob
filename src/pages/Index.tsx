import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  Plus,
  MapPin,
  Building,
  ArrowRight,
  XCircle,
  ChevronDown,
  ChevronRight,
  GitCommit,
  Store,
  Layers,
} from 'lucide-react'
import { Imovel, TIPO_IMOVEL_LABELS } from '@/types/imob'
import { listarTodosImoveisParaHierarquia } from '@/lib/imobDb'
import { useAuth } from '@/contexts/AuthContext'
import { SituacaoBadge } from '@/components/SituacaoBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PropertyNode {
  imovel: Imovel
  filhas: Imovel[]
}

export default function Index() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const queryParam = searchParams.get('q') || ''
  const [busca, setBusca] = useState(queryParam)
  const [todosImoveis, setTodosImoveis] = useState<Imovel[]>([])
  const [loading, setLoading] = useState(true)

  // Controle de colapso/expansão de nós pais (por padrão expandidos para transparência imediata)
  const [paisColapsados, setPaisColapsados] = useState<Record<string, boolean>>({})

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const lista = await listarTodosImoveisParaHierarquia(usuario?.familia_id)
      setTodosImoveis(lista)
    } finally {
      setLoading(false)
    }
  }, [usuario?.familia_id])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  useEffect(() => {
    const handleUpdate = () => {
      carregarDados()
    }
    window.addEventListener('mfo_imoveis_changed', handleUpdate)
    return () => window.removeEventListener('mfo_imoveis_changed', handleUpdate)
  }, [carregarDados])

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    setBusca(valor)
    if (valor) {
      setSearchParams({ q: valor }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const limparBusca = () => {
    setBusca('')
    setSearchParams({}, { replace: true })
  }

  const alternarColapso = (paiId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPaisColapsados((prev) => ({
      ...prev,
      [paiId]: !prev[paiId],
    }))
  }

  // Mapeamento e Agrupamento Hierárquico
  // 1. Identificar relações pai-filho via parent_property_id ou código concreto 51120 -> 51090/51100/51110
  const arvoreImoveis = useMemo(() => {
    if (!todosImoveis || todosImoveis.length === 0) {
      return { nos: [] as PropertyNode[], totalCount: 0, filhasCount: 0 }
    }

    // Mapa por ID e por Código
    const idMap = new Map<string, Imovel>()
    const codeMap = new Map<string, Imovel>()
    todosImoveis.forEach((imv) => {
      idMap.set(imv.id, imv)
      if (imv.code) codeMap.set(imv.code.trim(), imv)
    })

    // Caso concreto das lojas filhas vinculadas à 51120
    const parentCode51120 = codeMap.get('51120')

    // Função para achar o ID do pai efetivo
    const getEffectiveParentId = (imv: Imovel): string | null => {
      if (imv.parent_property_id) {
        // Se parent_property_id for o ID do pai direto
        if (idMap.has(imv.parent_property_id)) {
          return imv.parent_property_id
        }
        // Se parent_property_id tiver sido preenchido com o código (ex: '51120')
        const matchedByCode = codeMap.get(imv.parent_property_id.trim())
        if (matchedByCode) {
          return matchedByCode.id
        }
        return imv.parent_property_id
      }

      // Regra de suporte explícito solicitada na tarefa:
      // "as lojas 51090, 51100 e 51110 estão vinculadas à 51120 (pai)"
      const cod = (imv.code || '').trim()
      if (parentCode51120 && (cod === '51090' || cod === '51100' || cod === '51110')) {
        return parentCode51120.id
      }

      return null
    }

    // Identifica quais são filhas e associa aos pais
    const filhasPorPai = new Map<string, Imovel[]>()
    const ehFilhaIdSet = new Set<string>()

    todosImoveis.forEach((imv) => {
      const parentId = getEffectiveParentId(imv)
      if (parentId && parentId !== imv.id) {
        ehFilhaIdSet.add(imv.id)
        const listaAtual = filhasPorPai.get(parentId) || []
        listaAtual.push(imv)
        filhasPorPai.set(parentId, listaAtual)
      }
    })

    // Constrói os nós principais (imóveis que não são filhas de ninguém na listagem)
    const nos: PropertyNode[] = []
    let filhasCount = 0

    todosImoveis.forEach((imv) => {
      if (!ehFilhaIdSet.has(imv.id)) {
        const filhas = filhasPorPai.get(imv.id) || []
        // Ordena filhas por código/nome
        filhas.sort((a, b) => (a.code || '').localeCompare(b.code || ''))
        nos.push({
          imovel: imv,
          filhas,
        })
        filhasCount += filhas.length
      }
    })

    return {
      nos,
      totalCount: todosImoveis.length,
      filhasCount,
    }
  }, [todosImoveis])

  // Filtragem da árvore com a busca
  // Regra crítica: buscar "51090" deve achar a loja mesmo agrupada!
  // Se a filha der match, o nó pai DEVE ser exibido (com a filha em destaque e automaticamente expandido).
  const nosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) {
      return arvoreImoveis.nos
    }

    const matchesImovel = (imv: Imovel): boolean => {
      return (
        (imv.display_name && imv.display_name.toLowerCase().includes(termo)) ||
        (imv.code && imv.code.toLowerCase().includes(termo)) ||
        (imv.unit && imv.unit.toLowerCase().includes(termo)) ||
        (imv.address && imv.address.toLowerCase().includes(termo)) ||
        (imv.city && imv.city.toLowerCase().includes(termo)) ||
        (imv.registry_number && imv.registry_number.toLowerCase().includes(termo)) ||
        (imv.iptu_number && imv.iptu_number.toLowerCase().includes(termo)) ||
        (imv.entity_name && imv.entity_name.toLowerCase().includes(termo))
      )
    }

    const resultado: PropertyNode[] = []

    arvoreImoveis.nos.forEach((node) => {
      const paiMatches = matchesImovel(node.imovel)
      const filhasMatching = node.filhas.filter((f) => matchesImovel(f))

      if (paiMatches) {
        // Se o pai deu match, exibe ele com todas as filhas (ou as filhas que combinam, se preferir manter o conjunto visível)
        resultado.push(node)
      } else if (filhasMatching.length > 0) {
        // Se só a filha deu match, exibe o nó pai mas marcando que a busca encontrou a filha sob ele
        resultado.push({
          imovel: node.imovel,
          filhas: filhasMatching,
        })
      }
    })

    return resultado
  }, [arvoreImoveis.nos, busca])

  // Contagem de imóveis visíveis após o filtro
  const totalImoveisVisiveis = useMemo(() => {
    return nosFiltrados.reduce((acc, node) => acc + 1 + node.filhas.length, 0)
  }, [nosFiltrados])

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Topo informativo simples */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#00205b]">Imóveis da Família</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestão patrimonial com agrupamento hierárquico •{' '}
            {usuario?.familia_nome || 'Família BNI'} •{' '}
            <span className="font-semibold text-gray-700">
              {arvoreImoveis.totalCount}{' '}
              {arvoreImoveis.totalCount === 1 ? 'imóvel catalogado' : 'imóveis catalogados'}
            </span>
            {arvoreImoveis.filhasCount > 0 && (
              <span className="text-xs text-blue-700 ml-1.5 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {arvoreImoveis.filhasCount}{' '}
                {arvoreImoveis.filhasCount === 1 ? 'unidade vinculada' : 'unidades vinculadas'}
              </span>
            )}
          </p>
        </div>

        <Button
          onClick={() => navigate('/imovel/novo')}
          className="bg-[#00205b] hover:bg-[#001742] text-white shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span className="font-semibold text-sm">Novo Imóvel</span>
        </Button>
      </div>

      {/* (1) Barra de busca principal - Grande e centralizada no topo */}
      <div className="relative shadow-xs rounded-xl bg-white p-2 border border-gray-200">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-[#0052cc]" />
          <Input
            type="text"
            placeholder="Buscar por código (ex.: 51120, 51090, 51002), nome, condomínio, endereço..."
            value={busca}
            onChange={handleBuscaChange}
            className="h-12 border-0 bg-transparent pl-12 pr-10 text-base placeholder:text-gray-400 focus-visible:ring-0"
            autoFocus
          />
          {busca && (
            <button
              onClick={limparBusca}
              className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Limpar busca"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {busca && (
        <div className="text-xs text-gray-500 flex items-center justify-between px-1">
          <span>
            Mostrando <b>{totalImoveisVisiveis}</b> resultado(s) para &ldquo;{busca}&rdquo;
          </span>
          <button onClick={limparBusca} className="text-[#0052cc] hover:underline font-medium">
            Limpar filtro
          </button>
        </div>
      )}

      {/* Listagem de Imóveis (Grid Hierárquico Apex Light) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-56 rounded-xl border border-gray-200 bg-white p-5 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-full" />
              </div>
              <div className="h-8 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : nosFiltrados.length === 0 ? (
        /* Estado Vazio */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-4">
            <Building className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {busca
              ? 'Nenhum imóvel ou unidade filha encontrada com esse termo'
              : 'Nenhum imóvel cadastrado para esta família'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md">
            {busca
              ? `Não localizamos nenhum imóvel com o termo "${busca}". Verifique o código (ex: 51090, 51120) ou limpe a busca.`
              : 'Comece adicionando o primeiro patrimônio imobiliário para gerenciar a ocupação e vincular documentos.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {busca ? (
              <Button
                variant="outline"
                onClick={limparBusca}
                className="border-gray-300 text-gray-700"
              >
                Limpar busca
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/imovel/novo')}
                className="bg-[#00205b] hover:bg-[#001742] text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Cadastrar primeiro imóvel
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Grid de Cards com Agrupador Hierárquico */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {nosFiltrados.map((node, index) => {
            const imv = node.imovel
            const temFilhas = node.filhas.length > 0
            // Se o usuário estiver pesquisando, mantém sempre expandido para mostrar a filha encontrada
            const estaColapsado = busca ? false : Boolean(paisColapsados[imv.id])

            return (
              <div
                key={imv.id}
                className={cn(
                  'rounded-xl border transition-all duration-200 bg-white overflow-hidden flex flex-col',
                  temFilhas
                    ? 'border-blue-200/80 shadow-xs hover:border-[#0052cc]/50'
                    : 'border-[#E5E7EB] hover:border-[#0052cc]/40 hover:shadow-md',
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Header especial Apex Light para imóveis que possuem unidades filhas */}
                {temFilhas && (
                  <div className="bg-gradient-to-r from-blue-50/90 to-slate-50 px-4 py-2 border-b border-blue-100 flex items-center justify-between text-xs text-[#00205b]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Layers className="h-3.5 w-3.5 text-[#0052cc]" />
                      <span>
                        Imóvel Pai ({node.filhas.length}{' '}
                        {node.filhas.length === 1 ? 'unidade vinculada' : 'unidades vinculadas'})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => alternarColapso(imv.id, e)}
                      className="p-1 rounded-md text-[#0052cc] hover:bg-blue-100/60 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                      title={
                        estaColapsado ? 'Expandir unidades filhas' : 'Recolher unidades filhas'
                      }
                    >
                      <span>{estaColapsado ? 'Ver unidades' : 'Ocultar'}</span>
                      {estaColapsado ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Card do Imóvel Principal (Pai ou Imóvel Individual) */}
                <div
                  onClick={() => navigate(`/imovel/${imv.id}`)}
                  className="p-5 cursor-pointer group flex-1 flex flex-col justify-between space-y-4 hover:bg-slate-50/40 transition-colors"
                >
                  <div className="space-y-3">
                    {/* Topo do card: Badge de situação + Código como rótulo secundário */}
                    <div className="flex items-center justify-between gap-2">
                      <SituacaoBadge situacao={imv.status} size="md" />

                      <span
                        className="rounded-md bg-blue-50 text-[#00205b] font-mono text-[11px] font-bold px-2 py-0.5 border border-blue-200"
                        title="Código do imóvel"
                      >
                        Cód. {imv.code}
                      </span>
                    </div>

                    {/* Nome do imóvel */}
                    <h3 className="text-base font-bold text-[#00205b] group-hover:text-[#0052cc] transition-colors line-clamp-2">
                      {imv.display_name}
                    </h3>

                    {/* Endereço resumido e tipo */}
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5 font-medium text-gray-700">
                        <span>{TIPO_IMOVEL_LABELS[imv.kind] || imv.kind}</span>
                        {imv.unit && <span>• Unidade {imv.unit}</span>}
                      </div>

                      {imv.address && (
                        <p className="flex items-start gap-1.5 text-gray-500 leading-relaxed line-clamp-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400 mt-0.5" />
                          <span>
                            {imv.address}
                            {imv.city ? `, ${imv.city}` : ''}
                            {imv.state ? ` - ${imv.state}` : ''}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card com Ação "Abrir" */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span className="truncate max-w-[140px]" title={imovelSubLabel(imv)}>
                      {imovelSubLabel(imv)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-xs font-semibold text-[#0052cc] hover:bg-blue-50 group-hover:translate-x-0.5 transition-all"
                    >
                      <span>Abrir</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Sublista Hierárquica de Unidades Filhas (ex: Lojas 51090, 51100, 51110) */}
                {temFilhas && !estaColapsado && (
                  <div className="bg-slate-50/80 border-t border-blue-100 p-3 space-y-2">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                      <Store className="h-3 w-3 text-[#0052cc]" />
                      <span>Unidades Filhas Vinculadas</span>
                    </div>

                    <div className="space-y-1.5 pl-2 border-l-2 border-blue-300 ml-2">
                      {node.filhas.map((filha) => (
                        <div
                          key={filha.id}
                          onClick={() => navigate(`/imovel/${filha.id}`)}
                          className="group/filha cursor-pointer bg-white hover:bg-blue-50/70 p-2.5 rounded-lg border border-gray-200/90 hover:border-blue-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GitCommit className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-[#00205b] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/80">
                                  {filha.code}
                                </span>
                                <span className="text-xs font-semibold text-gray-800 truncate group-hover/filha:text-[#0052cc]">
                                  {filha.display_name}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <span>{TIPO_IMOVEL_LABELS[filha.kind] || filha.kind}</span>
                                {filha.unit && <span>• Unidade {filha.unit}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <SituacaoBadge situacao={filha.status} size="sm" />
                            <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover/filha:text-[#0052cc] group-hover/filha:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Botão Flutuante (FAB) no Mobile/Tablet */}
      <div className="fixed bottom-6 right-6 md:hidden z-30">
        <Button
          onClick={() => navigate('/imovel/novo')}
          className="h-14 w-14 rounded-full bg-[#00205b] hover:bg-[#001742] text-white shadow-xl flex items-center justify-center p-0 transition-transform active:scale-95"
          aria-label="Cadastrar novo imóvel"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>
    </div>
  )
}

function imovelSubLabel(imv: Imovel): string {
  if (imv.registry_number) return `Matrícula: ${imv.registry_number}`
  if (imv.iptu_number) return `IPTU: ${imv.iptu_number}`
  if (imv.entity_name) return imv.entity_name
  return 'Sem matrícula inf.'
}
