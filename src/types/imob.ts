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
  locado: 'Locado',
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
  // Badges Apex Light:
  // Verde = Ocupado (alugado)
  // Amarelo/Âmbar = Desocupado
  // Cinza = Em reforma
  // Vermelho = Indisponível / Outros
  locado: {
    label: 'Locado',
    descricao: 'Imóvel com contrato de locação ativo e vigência',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm',
    dotClass: 'bg-emerald-500',
    bgLightClass: 'bg-emerald-50/70',
    borderClass: 'border-emerald-300',
    hex: '#10B981',
  },
  disponivel: {
    label: 'Desocupado',
    descricao: 'Imóvel vago, disponível para locação ou venda',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm',
    dotClass: 'bg-amber-500',
    bgLightClass: 'bg-amber-50/70',
    borderClass: 'border-amber-300',
    hex: '#F59E0B',
  },
  em_reforma: {
    label: 'Em reforma',
    descricao: 'Passando por melhorias, reparos ou modernização',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200',
    btnClass: 'bg-slate-600 hover:bg-slate-700 text-white border-slate-600 shadow-sm',
    dotClass: 'bg-slate-500',
    bgLightClass: 'bg-slate-50/70',
    borderClass: 'border-slate-300',
    hex: '#64748B',
  },
  em_obra: {
    label: 'Em obra',
    descricao: 'Em construção estrutural, fundação ou edificação',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100',
    btnClass: 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 shadow-sm',
    dotClass: 'bg-orange-500',
    bgLightClass: 'bg-orange-50/70',
    borderClass: 'border-orange-300',
    hex: '#EA580C',
  },
  uso_proprio: {
    label: 'Uso próprio',
    descricao: 'Utilizado por membros da família ou sede administrativa',
    badgeClass: 'bg-blue-50 text-[#00205b] border-blue-200 hover:bg-blue-100',
    btnClass: 'bg-[#00205b] hover:bg-[#001742] text-white border-[#00205b] shadow-sm',
    dotClass: 'bg-[#0052cc]',
    bgLightClass: 'bg-blue-50/70',
    borderClass: 'border-blue-300',
    hex: '#00205B',
  },
  a_venda: {
    label: 'À venda',
    descricao: 'Com processo de alienação ou anúncio no mercado imobiliário',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm',
    dotClass: 'bg-indigo-500',
    bgLightClass: 'bg-indigo-50/70',
    borderClass: 'border-indigo-300',
    hex: '#4F46E5',
  },
  vendido: {
    label: 'Vendido',
    descricao: 'Propriedade alienada, aguardando desincorporação ou arquivamento',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
    btnClass: 'bg-rose-700 hover:bg-rose-800 text-white border-rose-700 shadow-sm',
    dotClass: 'bg-rose-500',
    bgLightClass: 'bg-rose-50/70',
    borderClass: 'border-rose-300',
    hex: '#E11D48',
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

// ==========================================
// MÓDULO 1 & 2: CONTRATOS, CONTAS E FINANÇAS
// ==========================================

export interface Counterparty {
  id: string
  family_id?: string
  name: string
  trade_name?: string
  cpf_cnpj?: string
  email?: string
  phone?: string
  role?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface Lease {
  id: string
  property_id: string
  family_id?: string
  counterparty_id?: string
  counterparty?: Counterparty
  tenant_name?: string
  tenant_doc?: string
  tenant_email?: string
  tenant_phone?: string
  monthly_rent?: number
  value?: number
  rent_value?: number
  start_date?: string
  end_date?: string
  due_day?: number
  adjustment_index?: string
  adjustment_month?: number | string // Mês de aniversário do reajuste (ex: 7 ou 'julho')
  status?: string
  active?: boolean
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface BankAccount {
  id: string
  family_id?: string
  entity_id?: string
  bank_name?: string
  bank_code?: string
  agency?: string
  account_number?: string
  account_type?: string
  description?: string
  balance?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface BankStatement {
  id: string
  bank_account_id?: string
  family_id?: string
  statement_period?: string
  reference_month?: string
  competence?: string
  start_date?: string
  end_date?: string
  opening_balance?: number
  closing_balance?: number
  status?: string
  file_url?: string
  created_at?: string
}

export interface Transaction {
  id: string
  statement_id?: string
  bank_account_id?: string
  property_id?: string
  family_id?: string
  date: string
  amount: number
  type: 'credit' | 'debit' | string
  fitid?: string
  description: string
  memo?: string
  reconciled?: boolean
  status?: string
  category?: string
  lease_charge_id?: string
  created_at?: string
}

export interface LeaseCharge {
  id: string
  lease_id?: string
  property_id?: string
  family_id?: string
  competence: string // ex: 2026-08
  due_date: string // ex: 2026-08-05
  amount: number
  paid_amount?: number
  payment_date?: string
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled' | string
  notes?: string
  created_at?: string
}

export interface EconomicIndex {
  id: string
  code: string // ex: "433" ou "189" ou "IPCA" / "IGP-M"
  series_code?: number | string
  name: string // "IPCA" ou "IGP-M"
  date: string // YYYY-MM ou YYYY-MM-DD
  reference_date?: string
  value: number // valor do índice ou taxa mensal
  accumulated_12m?: number // acumulado 12 meses (ex: 4.5 para 4,5%)
  source?: string
  created_at?: string
}

export interface LeaseAdjustment {
  id?: string
  lease_id: string
  property_id?: string
  family_id?: string
  previous_rent: number
  new_rent: number
  index_used: string // ex: "IPCA" | "IGP-M"
  rate_applied: number // ex: 4.5 (para 4.5%)
  effective_date: string // YYYY-MM-DD
  calculation_basis?: string
  notes?: string
  created_by?: string
  created_at?: string
}
