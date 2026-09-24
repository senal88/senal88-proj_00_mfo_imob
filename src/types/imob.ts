// Tipos de situações de ocupação aceitos pelo banco (exatamente 7 valores)
export type SituacaoOcupacao =
  | 'disponivel'
  | 'locado'
  | 'em_reforma'
  | 'em_obra'
  | 'uso_proprio'
  | 'a_venda'
  | 'vendido'

// Tipos de imóvel aceitos
export type TipoImovel =
  | 'apartamento'
  | 'casa'
  | 'loja'
  | 'sala'
  | 'terreno'
  | 'galpao'
  | 'vaga'
  | 'outro'

// Catálogo fechado de 20 tipos de documentos aceitos pelo banco
export type TipoDocumento =
  | 'matricula'
  | 'escritura'
  | 'espelho_iptu'
  | 'habite_se'
  | 'laudo_vistoria'
  | 'contrato_locacao'
  | 'aditivo_locacao'
  | 'distrato'
  | 'garantia_locaticia'
  | 'conta_condominio'
  | 'conta_consumo'
  | 'certidao_negativa'
  | 'certidao_onus'
  | 'apolice_seguro'
  | 'guia_tributo'
  | 'comprovante_pagamento'
  | 'boleto'
  | 'correspondencia'
  | 'foto_imovel'
  | 'outro'

export type ReviewStatus = 'a_conferir' | 'conferido'

export type EvidenceType = 'documento_oficial' | 'extrato' | 'declarado' | 'inferido'

export interface Usuario {
  id: string
  nome: string
  email: string
  cargo: string
  familia_id: string
  familia_nome: string
  avatar_url?: string
}

export interface EntidadeProprietaria {
  id: string
  familia_id: string
  nome: string
  sigla: string
  cnpj?: string
}

// Histórico de situações de ocupação (property_status_history)
export interface PropertyStatusHistory {
  id: string
  property_id: string
  status: SituacaoOcupacao
  since: string // Data ISO (YYYY-MM-DD)
  reason?: string
  created_by?: string
  created_by_name?: string
  created_at: string
}

// Entidade Imóvel (schema imob / property)
// IMPORTANTE: NÃO existe coluna de observações
export interface Imovel {
  id: string
  familia_id: string
  entity_id: string // Entidade proprietária (obrigatório, no piloto BNI)
  display_name: string // Nome do imóvel (obrigatório)
  code: string // Código (obrigatório, único por família; no piloto "51002")
  kind: TipoImovel // Tipo (obrigatório: apartamento, casa, loja, sala, terreno, galpao, vaga, outro)
  unit?: string // Unidade (ex.: 902) (opcional)
  address?: string // Endereço (opcional)
  city?: string // Cidade (opcional)
  state?: string // Estado (opcional, UF)
  registry_number?: string // Matrícula (opcional)
  registry_office?: string // Cartório (opcional)
  iptu_number?: string // Inscrição do IPTU (opcional)
  area_private_m2?: number // Área privativa em m² (número, opcional)
  status: SituacaoOcupacao // Situação (7 valores)
  accounting_nature?: string // Natureza contábil (opcional)
  created_at: string
  updated_at: string

  // Nome da entidade resolvido para exibição simples
  entity_name?: string
}

// Metadados da tabela document (Paperless guarda o arquivo original)
export interface Documento {
  id: string
  property_id: string
  familia_id: string
  doc_type: TipoDocumento
  title: string
  document_date?: string // YYYY-MM-DD
  valid_until?: string // Validade (YYYY-MM-DD)
  review_status?: ReviewStatus // a_conferir | conferido
  evidence?: EvidenceType // documento_oficial | extrato | declarado | inferido
  sensitive?: boolean // Documento sensível
  supersedes_id?: string // Aponta para o documento anterior que foi substituído

  // Metadados do Paperless
  paperless_id?: number | string
  sha256?: string
  source_ref?: string
  file_url: string // Link do Paperless para "Abrir documento"
  file_name: string
  file_size_formatted: string
  file_size_bytes?: number

  created_at: string
  updated_at?: string
}

// 7 Situações com rótulos humanos exatos
export const SITUACAO_LABELS: Record<SituacaoOcupacao, string> = {
  disponivel: 'Desocupado',
  locado: 'Ocupado (alugado)',
  em_reforma: 'Em reforma',
  em_obra: 'Em obra',
  uso_proprio: 'Uso próprio',
  a_venda: 'À venda',
  vendido: 'Vendido',
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
  disponivel: {
    label: 'Desocupado',
    descricao: 'Imóvel vago, disponível para locação ou venda',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm',
    dotClass: 'bg-emerald-500',
    bgLightClass: 'bg-emerald-50/70',
    borderClass: 'border-emerald-300',
    hex: '#10B981',
  },
  locado: {
    label: 'Ocupado (alugado)',
    descricao: 'Imóvel com contrato de locação ativo e vigência',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm',
    dotClass: 'bg-blue-500',
    bgLightClass: 'bg-blue-50/70',
    borderClass: 'border-blue-300',
    hex: '#2563EB',
  },
  em_reforma: {
    label: 'Em reforma',
    descricao: 'Passando por melhorias, reparos ou modernização',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm',
    dotClass: 'bg-amber-500',
    bgLightClass: 'bg-amber-50/70',
    borderClass: 'border-amber-300',
    hex: '#F59E0B',
  },
  em_obra: {
    label: 'Em obra',
    descricao: 'Em construção estrutural, fundação ou edificação',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    btnClass: 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 shadow-sm',
    dotClass: 'bg-orange-500',
    bgLightClass: 'bg-orange-50/70',
    borderClass: 'border-orange-300',
    hex: '#EA580C',
  },
  uso_proprio: {
    label: 'Uso próprio',
    descricao: 'Utilizado por membros da família ou sede administrativa',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    btnClass: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm',
    dotClass: 'bg-purple-500',
    bgLightClass: 'bg-purple-50/70',
    borderClass: 'border-purple-300',
    hex: '#8B5CF6',
  },
  a_venda: {
    label: 'À venda',
    descricao: 'Com processo de alienação ou anúncio no mercado imobiliário',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm',
    dotClass: 'bg-indigo-500',
    bgLightClass: 'bg-indigo-50/70',
    borderClass: 'border-indigo-300',
    hex: '#6366F1',
  },
  vendido: {
    label: 'Vendido',
    descricao: 'Propriedade alienada, aguardando desincorporação ou arquivamento',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200',
    btnClass: 'bg-gray-700 hover:bg-gray-800 text-white border-gray-700 shadow-sm',
    dotClass: 'bg-gray-500',
    bgLightClass: 'bg-gray-100',
    borderClass: 'border-gray-300',
    hex: '#4B5563',
  },
}

// Tipos de imóvel com rótulos amigáveis
export const TIPO_IMOVEL_LABELS: Record<TipoImovel, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  loja: 'Loja',
  sala: 'Sala',
  terreno: 'Terreno',
  galpao: 'Galpão',
  vaga: 'Vaga',
  outro: 'Outro',
}

// Catálogo fechado de 20 tipos com rótulos em pt-BR
export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  matricula: 'Matrícula',
  escritura: 'Escritura',
  espelho_iptu: 'Espelho do IPTU',
  habite_se: 'Habite-se',
  laudo_vistoria: 'Laudo de vistoria',
  contrato_locacao: 'Contrato de locação',
  aditivo_locacao: 'Aditivo de locação',
  distrato: 'Distrato',
  garantia_locaticia: 'Garantia locatícia',
  conta_condominio: 'Conta de condomínio',
  conta_consumo: 'Conta de consumo',
  certidao_negativa: 'Certidão negativa',
  certidao_onus: 'Certidão de ônus',
  apolice_seguro: 'Apólice de seguro',
  guia_tributo: 'Guia de tributo',
  comprovante_pagamento: 'Comprovante de pagamento',
  boleto: 'Boleto',
  correspondencia: 'Correspondência',
  foto_imovel: 'Foto do imóvel',
  outro: 'Outro',
}

// Ordem de prioridade para derivação automática do documento principal:
// matricula (1) → escritura (2) → contrato_locacao (3) → espelho_iptu (4) → qualquer outro (5)
export const PRIORIDADE_TIPO_DOCUMENTO: Record<TipoDocumento, number> = {
  matricula: 1,
  escritura: 2,
  contrato_locacao: 3,
  espelho_iptu: 4,
  habite_se: 5,
  certidao_onus: 5,
  certidao_negativa: 5,
  apolice_seguro: 5,
  aditivo_locacao: 5,
  garantia_locaticia: 5,
  distrato: 5,
  laudo_vistoria: 5,
  conta_condominio: 5,
  conta_consumo: 5,
  guia_tributo: 5,
  comprovante_pagamento: 5,
  boleto: 5,
  correspondencia: 5,
  foto_imovel: 5,
  outro: 5,
}

// Rótulos de review_status
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  a_conferir: 'A conferir',
  conferido: 'Conferido',
}

// Rótulos de evidence
export const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  documento_oficial: 'Documento oficial',
  extrato: 'Extrato',
  declarado: 'Declarado',
  inferido: 'Inferido',
}
