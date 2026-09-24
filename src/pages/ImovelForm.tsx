import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Building, CheckCircle2 } from 'lucide-react'
import {
  SituacaoOcupacao,
  TipoImovel,
  EntidadeProprietaria,
  SITUACAO_CONFIG,
  TIPO_IMOVEL_LABELS,
} from '@/types/imob'
import { obterImovelPorId, salvarImovel, listarEntidades } from '@/lib/imobDb'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ImovelForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const isEditing = Boolean(id)

  // 1) CAMPOS EXATOS:
  // display_name (obrigatório) → "Nome do imóvel"
  // code (obrigatório, único por família; piloto "51002") → "Código"
  // kind (obrigatório; apartamento, casa, loja, sala, terreno, galpao, vaga, outro) → "Tipo"
  // unit (opcional) → "Unidade (ex.: 902)"
  // address, city, state (opcionais) → "Endereço", "Cidade", "Estado"
  // registry_number → "Matrícula" · registry_office → "Cartório"
  // iptu_number (opcional) → "Inscrição do IPTU"
  // area_private_m2 (número, opcional) → "Área privativa (m²)"
  // status → "Situação" (7 valores)
  // accounting_nature (opcional) → "Natureza contábil"
  // entity_id (obrigatório) → "Entidade proprietária", pré-selecionar a entidade da família (no piloto, BNI)
  // IMPORTANTE: NÃO existe coluna de observações!

  const [entidades, setEntidades] = useState<EntidadeProprietaria[]>([])
  const [entityId, setEntityId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState(isEditing ? '' : '')
  const [kind, setKind] = useState<TipoImovel>('apartamento')
  const [unit, setUnit] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [registryNumber, setRegistryNumber] = useState('')
  const [registryOffice, setRegistryOffice] = useState('')
  const [iptuNumber, setIptuNumber] = useState('')
  const [areaPrivateM2, setAreaPrivateM2] = useState('')
  const [status, setStatus] = useState<SituacaoOcupacao>('disponivel')
  const [accountingNature, setAccountingNature] = useState('')
  const [motivoMudancaStatus, setMotivoMudancaStatus] = useState('')

  const [statusOriginal, setStatusOriginal] = useState<SituacaoOcupacao | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(true)

  // Carrega entidades da família
  const carregarEntidades = useCallback(async () => {
    if (!usuario?.familia_id) return
    const lista = await listarEntidades(usuario.familia_id)
    setEntidades(lista)
    // Pré-seleciona BNI ou a primeira entidade da família
    if (!entityId && lista.length > 0) {
      const bni = lista.find((e) => e.sigla === 'BNI' || e.nome.includes('BNI'))
      setEntityId(bni ? bni.id : lista[0].id)
    }
  }, [usuario?.familia_id, entityId])

  useEffect(() => {
    carregarEntidades()
  }, [carregarEntidades])

  useEffect(() => {
    if (isEditing && id) {
      setCarregandoDados(true)
      obterImovelPorId(id, usuario?.familia_id)
        .then((imv) => {
          if (imv) {
            setEntityId(imv.entity_id)
            setDisplayName(imv.display_name)
            setCode(imv.code)
            setKind(imv.kind)
            setUnit(imv.unit || '')
            setAddress(imv.address || '')
            setCity(imv.city || '')
            setState(imv.state || '')
            setRegistryNumber(imv.registry_number || '')
            setRegistryOffice(imv.registry_office || '')
            setIptuNumber(imv.iptu_number || '')
            setAreaPrivateM2(imv.area_private_m2 !== undefined ? String(imv.area_private_m2) : '')
            setStatus(imv.status)
            setStatusOriginal(imv.status)
            setAccountingNature(imv.accounting_nature || '')
          } else {
            toast.error('Imóvel não encontrado.')
            navigate('/')
          }
        })
        .finally(() => setCarregandoDados(false))
    } else {
      setCarregandoDados(false)
    }
  }, [id, isEditing, usuario?.familia_id, navigate])

  const validar = () => {
    const novosErros: Record<string, string> = {}
    if (!displayName.trim()) {
      novosErros.displayName = 'O Nome do imóvel é obrigatório.'
    }
    if (!code.trim()) {
      novosErros.code = 'O Código do imóvel é obrigatório.'
    }
    if (!kind) {
      novosErros.kind = 'Selecione o tipo do imóvel.'
    }
    if (!entityId) {
      novosErros.entityId = 'Selecione a Entidade proprietária.'
    }
    if (areaPrivateM2 && isNaN(Number(areaPrivateM2.replace(',', '.')))) {
      novosErros.areaPrivateM2 = 'Informe um valor numérico válido para a área privativa.'
    }
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar() || !usuario) return

    setLoading(true)
    try {
      const areaNum = areaPrivateM2.trim() ? parseFloat(areaPrivateM2.replace(',', '.')) : undefined

      const salvo = await salvarImovel(
        {
          id: isEditing ? id : undefined,
          entity_id: entityId,
          display_name: displayName.trim(),
          code: code.trim(),
          kind,
          unit: unit.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          registry_number: registryNumber.trim() || undefined,
          registry_office: registryOffice.trim() || undefined,
          iptu_number: iptuNumber.trim() || undefined,
          area_private_m2: areaNum,
          status,
          accounting_nature: accountingNature.trim() || undefined,
        },
        usuario,
        motivoMudancaStatus || undefined,
      )

      toast.success(isEditing ? 'Imóvel atualizado com sucesso!' : 'Imóvel cadastrado com sucesso!')
      navigate(`/imovel/${salvo.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocorreu um erro ao salvar o imóvel.'
      toast.error(msg)
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

  // Lista fechada de 7 situações
  const opcoesSituacao: SituacaoOcupacao[] = [
    'disponivel',
    'locado',
    'em_reforma',
    'em_obra',
    'uso_proprio',
    'a_venda',
    'vendido',
  ]

  const tiposImovel: TipoImovel[] = [
    'apartamento',
    'casa',
    'loja',
    'sala',
    'terreno',
    'galpao',
    'vaga',
    'outro',
  ]

  const mudouSituacao = isEditing && statusOriginal && statusOriginal !== status

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Voltar */}
      <button
        onClick={() => (isEditing && id ? navigate(`/imovel/${id}`) : navigate('/'))}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#2C4A6E] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{isEditing ? 'Cancelar e voltar ao imóvel' : 'Voltar para lista de imóveis'}</span>
      </button>

      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/70 border-b border-gray-100 p-6">
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
                  ? 'Atualize as informações patrimoniais do cadastro do imóvel'
                  : 'Preencha os dados do patrimônio para catalogar na família'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bloco 1: Identificação Principal e Entidade */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b pb-1">
                Identificação Patrimonial
              </h3>

              {/* Entidade proprietária (obrigatório, pré-selecionar BNI) */}
              <div className="space-y-1.5">
                <Label htmlFor="entity_id" className="text-xs font-bold text-gray-700">
                  Entidade proprietária <span className="text-red-500">*</span>
                </Label>
                <Select value={entityId} onValueChange={setEntityId}>
                  <SelectTrigger
                    id="entity_id"
                    className={cn(
                      'h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]',
                      erros.entityId && 'border-red-500',
                    )}
                  >
                    <SelectValue placeholder="Selecione a entidade proprietária" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {entidades.map((ent) => (
                      <SelectItem key={ent.id} value={ent.id}>
                        {ent.nome} ({ent.sigla})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erros.entityId && (
                  <p className="text-xs text-red-600 font-medium">{erros.entityId}</p>
                )}
                <p className="text-[11px] text-gray-400">
                  Entidade jurídica ou holding que detém a titularidade deste imóvel.
                </p>
              </div>

              {/* display_name e code na mesma linha */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="display_name" className="text-xs font-bold text-gray-700">
                    Nome do imóvel <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="display_name"
                    placeholder="Ex.: Ed. Emílio Bumachar · Apto 902"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value)
                      if (erros.displayName) setErros((prev) => ({ ...prev, displayName: '' }))
                    }}
                    className={cn(
                      'h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]',
                      erros.displayName && 'border-red-500 focus-visible:ring-red-500',
                    )}
                  />
                  {erros.displayName && (
                    <p className="text-xs text-red-600 font-medium">{erros.displayName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs font-bold text-gray-700">
                    Código <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    placeholder="Ex.: 51002"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value)
                      if (erros.code) setErros((prev) => ({ ...prev, code: '' }))
                    }}
                    className={cn(
                      'h-11 bg-gray-50/50 text-sm font-mono focus-visible:ring-[#2C4A6E]',
                      erros.code && 'border-red-500 focus-visible:ring-red-500',
                    )}
                  />
                  {erros.code && <p className="text-xs text-red-600 font-medium">{erros.code}</p>}
                </div>
              </div>

              {/* kind e unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="kind" className="text-xs font-bold text-gray-700">
                    Tipo <span className="text-red-500">*</span>
                  </Label>
                  <Select value={kind} onValueChange={(val) => setKind(val as TipoImovel)}>
                    <SelectTrigger id="kind" className="h-11 bg-gray-50/50 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {tiposImovel.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_IMOVEL_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unit" className="text-xs font-bold text-gray-700">
                    Unidade (ex.: 902)
                  </Label>
                  <Input
                    id="unit"
                    placeholder="Ex.: 1402, Bloco B ou Lote 04"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Localização */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b pb-1">
                Localização
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-bold text-gray-700">
                  Endereço
                </Label>
                <Input
                  id="address"
                  placeholder="Ex.: Rua / Avenida, Número, Bairro"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                />{' '}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-bold text-gray-700">
                    Cidade
                  </Label>
                  <Input
                    id="city"
                    placeholder="Ex.: Vitória"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs font-bold text-gray-700">
                    Estado (UF)
                  </Label>
                  <Input
                    id="state"
                    placeholder="ES"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="h-11 bg-gray-50/50 text-sm uppercase focus-visible:ring-[#2C4A6E]"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Cartório, IPTU e Área */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b pb-1">
                Registro e Dados Fiscais
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="registry_number" className="text-xs font-bold text-gray-700">
                    Matrícula
                  </Label>
                  <Input
                    id="registry_number"
                    placeholder="Ex.: 128.945"
                    value={registryNumber}
                    onChange={(e) => setRegistryNumber(e.target.value)}
                    className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="registry_office" className="text-xs font-bold text-gray-700">
                    Cartório
                  </Label>
                  <Input
                    id="registry_office"
                    placeholder="Ex.: 1º Cartório de Registro Geral de Imóveis"
                    value={registryOffice}
                    onChange={(e) => setRegistryOffice(e.target.value)}
                    className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="iptu_number" className="text-xs font-bold text-gray-700">
                    Inscrição do IPTU
                  </Label>
                  <Input
                    id="iptu_number"
                    placeholder="Ex.: 014.288.0092-1"
                    value={iptuNumber}
                    onChange={(e) => setIptuNumber(e.target.value)}
                    className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="area_private_m2" className="text-xs font-bold text-gray-700">
                    Área privativa (m²)
                  </Label>
                  <Input
                    id="area_private_m2"
                    placeholder="Ex.: 185.50"
                    value={areaPrivateM2}
                    onChange={(e) => setAreaPrivateM2(e.target.value)}
                    className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                  />
                  {erros.areaPrivateM2 && (
                    <p className="text-xs text-red-600 font-medium">{erros.areaPrivateM2}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accounting_nature" className="text-xs font-bold text-gray-700">
                  Natureza contábil
                </Label>
                <Input
                  id="accounting_nature"
                  placeholder="Ex.: Investimento para Renda, Imobilizado de Uso, etc."
                  value={accountingNature}
                  onChange={(e) => setAccountingNature(e.target.value)}
                  className="h-11 bg-gray-50/50 text-sm focus-visible:ring-[#2C4A6E]"
                />
              </div>
            </div>

            {/* Bloco 4: Situação de Ocupação (7 valores exatos) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Situação de Ocupação <span className="text-red-500">*</span>
                </h3>
                <span className="text-[11px] text-gray-400">
                  Grava linha em property_status_history
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {opcoesSituacao.map((item) => {
                  const isSelected = status === item
                  const cfg = SITUACAO_CONFIG[item]
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setStatus(item)}
                      className={cn(
                        'flex items-start justify-between p-3 rounded-xl border text-left transition-all',
                        isSelected
                          ? cn(cfg.btnClass, 'shadow-xs ring-2 ring-offset-1 ring-[#2C4A6E]')
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
                          {cfg.label}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] block line-clamp-1',
                            isSelected ? 'text-white/90' : 'text-gray-500',
                          )}
                        >
                          {cfg.descricao}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-white shrink-0 mt-0.5" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Se o usuário estiver editando e mudou a situação, pede motivo opcional */}
              {mudouSituacao && (
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5 mt-2 animate-fade-in">
                  <Label htmlFor="motivo" className="text-xs font-bold text-blue-950">
                    Motivo da mudança de situação (opcional)
                  </Label>
                  <Input
                    id="motivo"
                    placeholder="Ex.: Chaves devolvidas pelo inquilino ou início de reforma"
                    value={motivoMudancaStatus}
                    onChange={(e) => setMotivoMudancaStatus(e.target.value)}
                    className="h-10 bg-white text-xs text-gray-900"
                  />
                  <p className="text-[11px] text-blue-800/80">
                    Será gravado no histórico de ocupação deste imóvel junto à data de hoje.
                  </p>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
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
                className="bg-[#2C4A6E] hover:bg-[#1E3A5F] text-white px-6 font-semibold shadow-xs"
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
