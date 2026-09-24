import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, MapPin, Building, FileText, ArrowRight, XCircle } from 'lucide-react'
import { Imovel } from '@/types/imob'
import { listarImoveis } from '@/lib/imobDb'
import { useAuth } from '@/contexts/AuthContext'
import { SituacaoBadge } from '@/components/SituacaoBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Index() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const queryParam = searchParams.get('q') || ''
  const [busca, setBusca] = useState(queryParam)
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [loading, setLoading] = useState(true)

  const carregarDados = useCallback(
    async (termoBusca: string) => {
      setLoading(true)
      try {
        const lista = await listarImoveis(usuario?.familia_id, termoBusca)
        setImoveis(lista)
      } finally {
        setLoading(false)
      }
    },
    [usuario?.familia_id],
  )

  useEffect(() => {
    carregarDados(busca)
  }, [carregarDados, busca])

  useEffect(() => {
    const handleUpdate = () => {
      carregarDados(busca)
    }
    window.addEventListener('mfo_imoveis_changed', handleUpdate)
    return () => window.removeEventListener('mfo_imoveis_changed', handleUpdate)
  }, [carregarDados, busca])

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

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Topo informativo simples */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111827]">Imóveis da Família</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestão patrimonial simplificada • {imoveis.length}{' '}
            {imoveis.length === 1 ? 'imóvel cadastrado' : 'imóveis cadastrados'}
          </p>
        </div>

        <Button
          onClick={() => navigate('/imovel/novo')}
          className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span className="font-semibold text-sm">Novo Imóvel</span>
        </Button>
      </div>

      {/* (1) Barra de busca principal - Grande e centralizada no topo */}
      <div className="relative shadow-xs rounded-xl bg-white p-2 border border-gray-200">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar imóvel pelo nome ou endereço..."
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

      {/* Listagem de Imóveis (Grid) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-48 rounded-xl border border-gray-200 bg-white p-5 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-full" />
              </div>
              <div className="h-8 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : imoveis.length === 0 ? (
        /* Estado Vazio */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-4">
            <Building className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {busca
              ? 'Nenhum imóvel encontrado com esse nome'
              : 'Nenhum imóvel cadastrado para esta família'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md">
            {busca
              ? `Não localizamos nenhum imóvel com o termo "${busca}". Verifique a digitação ou limpe o filtro.`
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
                className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Cadastrar primeiro imóvel
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Grid de Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {imoveis.map((imv, index) => (
            <Card
              key={imv.id}
              onClick={() => navigate(`/imovel/${imv.id}`)}
              style={{ animationDelay: `${index * 35}ms` }}
              className="group cursor-pointer rounded-xl border border-[#E5E7EB] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#2C4A6E]/30 flex flex-col justify-between overflow-hidden"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Badge de ocupação no topo do card */}
                  <div className="flex items-center justify-between gap-2">
                    <SituacaoBadge situacao={imv.situacao} size="md" />
                    {imv.documento_principal_id && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2C4A6E] bg-blue-50/80 px-2 py-0.5 rounded-md"
                        title="Possui documento principal anexado"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Doc. principal</span>
                      </span>
                    )}
                  </div>

                  {/* Nome do imóvel */}
                  <h3 className="text-base font-bold text-[#111827] group-hover:text-[#2C4A6E] transition-colors line-clamp-2">
                    {imv.nome}
                  </h3>

                  {/* Endereço resumido */}
                  <p className="flex items-start gap-1.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400 mt-0.5" />
                    <span>{imv.endereco}</span>
                  </p>
                </div>

                {/* Rodapé do Card com Ação "Abrir" */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 truncate max-w-[150px]">
                    {imv.matricula ? `Matrícula: ${imv.matricula}` : 'Sem matrícula inf.'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-xs font-semibold text-[#2C4A6E] hover:bg-[#2C4A6E]/10 group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Abrir</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Botão Flutuante (FAB) no Mobile/Tablet */}
      <div className="fixed bottom-6 right-6 md:hidden z-30">
        <Button
          onClick={() => navigate('/imovel/novo')}
          className="h-14 w-14 rounded-full bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white shadow-xl flex items-center justify-center p-0 transition-transform active:scale-95"
          aria-label="Cadastrar novo imóvel"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>
    </div>
  )
}
