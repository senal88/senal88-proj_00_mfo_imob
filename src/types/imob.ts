export type SituacaoOcupacao = 'ocupado' | 'desocupado' | 'em_reforma' | 'indisponivel'

export type TipoDocumento =
  | 'documento_principal'
  | 'escritura'
  | 'contrato_locacao'
  | 'contrato_compra_venda'
  | 'planta'
  | 'iptu'
  | 'outros'

export interface Usuario {
  id: string
  nome: string
  email: string
  cargo: string
  familia_id: string
  familia_nome: string
  avatar_url?: string
}

export interface Imovel {
  id: string
  familia_id: string
  nome: string
  endereco: string
  situacao: SituacaoOcupacao
  matricula?: string
  observacoes?: string
  documento_principal_id?: string
  created_at: string
  updated_at: string
}

export interface Documento {
  id: string
  familia_id: string
  imovel_id: string
  nome: string
  tipo: TipoDocumento
  url: string
  tamanho_formatado: string
  tamanho_bytes?: number
  data_documento?: string
  descricao?: string
  is_principal?: boolean
  created_at: string
}

export const SITUACAO_LABELS: Record<SituacaoOcupacao, string> = {
  ocupado: 'Ocupado',
  desocupado: 'Desocupado',
  em_reforma: 'Em reforma',
  indisponivel: 'Indisponível',
}

export const SITUACAO_CONFIG: Record<
  SituacaoOcupacao,
  {
    label: string
    descricao: string
    badgeClass: string
    btnClass: string
    dotClass: string
    bgLightClass: string
    borderClass: string
    hex: string
  }
> = {
  ocupado: {
    label: 'Ocupado',
    descricao: 'Imóvel com locatário ou morador ativo',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm',
    dotClass: 'bg-emerald-500',
    bgLightClass: 'bg-emerald-50/70',
    borderClass: 'border-emerald-300',
    hex: '#10B981',
  },
  desocupado: {
    label: 'Desocupado',
    descricao: 'Imóvel vago, pronto para locação ou uso',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm',
    dotClass: 'bg-amber-500',
    bgLightClass: 'bg-amber-50/70',
    borderClass: 'border-amber-300',
    hex: '#F59E0B',
  },
  em_reforma: {
    label: 'Em reforma',
    descricao: 'Passando por melhorias estruturais ou estéticas',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    btnClass: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm',
    dotClass: 'bg-purple-500',
    bgLightClass: 'bg-purple-50/70',
    borderClass: 'border-purple-300',
    hex: '#8B5CF6',
  },
  indisponivel: {
    label: 'Indisponível',
    descricao: 'Bloqueado temporariamente para uso ou processo judicial',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    btnClass: 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm',
    dotClass: 'bg-red-500',
    bgLightClass: 'bg-red-50/70',
    borderClass: 'border-red-300',
    hex: '#EF4444',
  },
}

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  documento_principal: 'Documento principal',
  escritura: 'Escritura',
  contrato_locacao: 'Contrato de locação',
  contrato_compra_venda: 'Contrato de compra e venda',
  planta: 'Planta',
  iptu: 'IPTU',
  outros: 'Outros',
}
