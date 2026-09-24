/**
 * Camada de dados MFO Imob
 * Alinhada com o Supabase self-hosted (schema "imob", isolamento RLS por família)
 *
 * Regras principais:
 * 1. Formulário com os campos exatos de property (sem observações).
 * 2. 7 situações de ocupação com gravação em property_status_history a cada mudança.
 * 3. Documento principal derivado por prioridade:
 *    matricula (1) → escritura (2) → contrato_locacao (3) → espelho_iptu (4) → qualquer outro (5);
 *    empate: o mais recente (document_date).
 *    Substituição cria novo documento com supersedes_id apontando para o anterior (não apaga o anterior).
 * 4. Arquivos: ponte server-side para Paperless (o Paperless guarda o original; Supabase grava só metadados).
 *    "Abrir documento" = link do Paperless. Limite: 20 MB.
 * 5. Catálogo fechado de 20 tipos com rótulos humanos.
 */

import {
  Imovel,
  Documento,
  Usuario,
  SituacaoOcupacao,
  TipoDocumento,
  TipoImovel,
  PropertyStatusHistory,
  EntidadeProprietaria,
  ReviewStatus,
  EvidenceType,
  PRIORIDADE_TIPO_DOCUMENTO,
} from '@/types/imob'
import {
  IMOVEIS_INICIAIS,
  DOCUMENTOS_INICIAIS,
  USUARIOS_INICIAIS,
  HISTORICO_SITUACOES_INICIAIS,
  ENTIDADES_INICIAIS,
} from './mockData'

const STORAGE_KEY_IMOVEIS = 'mfo_imob_imoveis_v2'
const STORAGE_KEY_DOCUMENTOS = 'mfo_imob_documentos_v2'
const STORAGE_KEY_AUTH = 'mfo_imob_auth_user_v2'
const STORAGE_KEY_HISTORICO = 'mfo_imob_status_history_v2'
const STORAGE_KEY_ENTIDADES = 'mfo_imob_entidades_v2'

export const LIMITE_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 MB

function initStorage() {
  if (typeof window === 'undefined') return
  if (!localStorage.getItem(STORAGE_KEY_IMOVEIS)) {
    localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(IMOVEIS_INICIAIS))
  }
  if (!localStorage.getItem(STORAGE_KEY_DOCUMENTOS)) {
    localStorage.setItem(STORAGE_KEY_DOCUMENTOS, JSON.stringify(DOCUMENTOS_INICIAIS))
  }
  if (!localStorage.getItem(STORAGE_KEY_AUTH)) {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(USUARIOS_INICIAIS[0]))
  }
  if (!localStorage.getItem(STORAGE_KEY_HISTORICO)) {
    localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(HISTORICO_SITUACOES_INICIAIS))
  }
  if (!localStorage.getItem(STORAGE_KEY_ENTIDADES)) {
    localStorage.setItem(STORAGE_KEY_ENTIDADES, JSON.stringify(ENTIDADES_INICIAIS))
  }
}

initStorage()

// --- AUTENTICAÇÃO E SESSÃO ---

export function getStoredUser(): Usuario | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY_AUTH)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Usuario
  } catch {
    return null
  }
}

export function setStoredUser(user: Usuario | null) {
  if (typeof window === 'undefined') return
  if (user) {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY_AUTH)
  }
  window.dispatchEvent(new Event('mfo_auth_changed'))
}

// --- ENTIDADES PROPRIETÁRIAS ---

export async function listarEntidades(familiaId?: string): Promise<EntidadeProprietaria[]> {
  initStorage()
  const raw = localStorage.getItem(STORAGE_KEY_ENTIDADES)
  let lista: EntidadeProprietaria[] = raw ? JSON.parse(raw) : ENTIDADES_INICIAIS
  if (familiaId) {
    lista = lista.filter((e) => e.familia_id === familiaId)
  }
  return lista
}

// --- IMÓVEIS (PROPERTY) ---

export async function listarImoveis(familiaId?: string, busca?: string): Promise<Imovel[]> {
  initStorage()
  const raw = localStorage.getItem(STORAGE_KEY_IMOVEIS)
  let lista: Imovel[] = raw ? JSON.parse(raw) : IMOVEIS_INICIAIS

  if (familiaId) {
    lista = lista.filter((imv) => imv.familia_id === familiaId)
  }

  if (busca && busca.trim()) {
    const q = busca.toLowerCase().trim()
    lista = lista.filter(
      (imv) =>
        imv.display_name.toLowerCase().includes(q) ||
        imv.code.toLowerCase().includes(q) ||
        (imv.address && imv.address.toLowerCase().includes(q)) ||
        (imv.city && imv.city.toLowerCase().includes(q)) ||
        (imv.registry_number && imv.registry_number.toLowerCase().includes(q)) ||
        (imv.unit && imv.unit.toLowerCase().includes(q)),
    )
  }

  // Ordena por nome
  return lista.sort((a, b) => a.display_name.localeCompare(b.display_name))
}

export async function obterImovelPorId(id: string, familiaId?: string): Promise<Imovel | null> {
  initStorage()
  const lista = await listarImoveis(familiaId)
  return lista.find((item) => item.id === id) || null
}

export interface SalvarImovelParams {
  id?: string
  entity_id: string
  display_name: string
  code: string
  kind: TipoImovel
  unit?: string
  address?: string
  city?: string
  state?: string
  registry_number?: string
  registry_office?: string
  iptu_number?: string
  area_private_m2?: number
  status: SituacaoOcupacao
  accounting_nature?: string
}

export async function salvarImovel(
  dados: SalvarImovelParams,
  usuario: Usuario,
  statusReason?: string,
): Promise<Imovel> {
  initStorage()
  const raw = localStorage.getItem(STORAGE_KEY_IMOVEIS)
  const lista: Imovel[] = raw ? JSON.parse(raw) : IMOVEIS_INICIAIS

  const entidades = await listarEntidades(usuario.familia_id)
  const entidadeEscolhida = entidades.find((e) => e.id === dados.entity_id)
  const entity_name = entidadeEscolhida ? entidadeEscolhida.nome : undefined

  // Validação de unicidade do code na família
  const codigoDuplicado = lista.find(
    (imv) =>
      imv.familia_id === usuario.familia_id &&
      imv.code.trim().toLowerCase() === dados.code.trim().toLowerCase() &&
      imv.id !== dados.id,
  )
  if (codigoDuplicado) {
    throw new Error(`O código "${dados.code}" já está em uso por outro imóvel desta família.`)
  }

  const now = new Date().toISOString()
  const today = now.split('T')[0]

  if (dados.id) {
    // Edição
    const index = lista.findIndex(
      (imv) => imv.id === dados.id && imv.familia_id === usuario.familia_id,
    )
    if (index === -1) {
      throw new Error('Imóvel não encontrado para edição ou sem permissão.')
    }

    const imovelAnterior = lista[index]
    const mudouStatus = imovelAnterior.status !== dados.status

    const itemAtualizado: Imovel = {
      ...imovelAnterior,
      entity_id: dados.entity_id,
      entity_name: entity_name || imovelAnterior.entity_name,
      display_name: dados.display_name.trim(),
      code: dados.code.trim(),
      kind: dados.kind,
      unit: dados.unit?.trim() || undefined,
      address: dados.address?.trim() || undefined,
      city: dados.city?.trim() || undefined,
      state: dados.state?.trim() ? dados.state.trim().toUpperCase() : undefined,
      registry_number: dados.registry_number?.trim() || undefined,
      registry_office: dados.registry_office?.trim() || undefined,
      iptu_number: dados.iptu_number?.trim() || undefined,
      area_private_m2: dados.area_private_m2 !== undefined ? dados.area_private_m2 : undefined,
      status: dados.status,
      accounting_nature: dados.accounting_nature?.trim() || undefined,
      updated_at: now,
    }

    lista[index] = itemAtualizado
    localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(lista))

    // Se houve mudança de situação na edição, grava linha no histórico
    if (mudouStatus) {
      await registrarHistoricoStatus({
        property_id: itemAtualizado.id,
        status: dados.status,
        since: today,
        reason: statusReason || 'Alteração de situação no cadastro do imóvel',
        created_by: usuario.id,
        created_by_name: usuario.nome,
      })
    }

    window.dispatchEvent(new Event('mfo_imoveis_changed'))
    return itemAtualizado
  } else {
    // Criação
    const novoId = 'imv-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
    const novo: Imovel = {
      id: novoId,
      familia_id: usuario.familia_id,
      entity_id: dados.entity_id,
      entity_name,
      display_name: dados.display_name.trim(),
      code: dados.code.trim(),
      kind: dados.kind,
      unit: dados.unit?.trim() || undefined,
      address: dados.address?.trim() || undefined,
      city: dados.city?.trim() || undefined,
      state: dados.state?.trim() ? dados.state.trim().toUpperCase() : undefined,
      registry_number: dados.registry_number?.trim() || undefined,
      registry_office: dados.registry_office?.trim() || undefined,
      iptu_number: dados.iptu_number?.trim() || undefined,
      area_private_m2: dados.area_private_m2 !== undefined ? dados.area_private_m2 : undefined,
      status: dados.status,
      accounting_nature: dados.accounting_nature?.trim() || undefined,
      created_at: now,
      updated_at: now,
    }

    lista.unshift(novo)
    localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(lista))

    // Grava situação inicial no histórico
    await registrarHistoricoStatus({
      property_id: novo.id,
      status: dados.status,
      since: today,
      reason: statusReason || 'Cadastro inicial do imóvel',
      created_by: usuario.id,
      created_by_name: usuario.nome,
    })

    window.dispatchEvent(new Event('mfo_imoveis_changed'))
    return novo
  }
}

// --- SITUAÇÃO E HISTÓRICO (PROPERTY_STATUS_HISTORY) ---

export async function listarHistoricoStatus(propertyId: string): Promise<PropertyStatusHistory[]> {
  initStorage()
  const raw = localStorage.getItem(STORAGE_KEY_HISTORICO)
  const lista: PropertyStatusHistory[] = raw ? JSON.parse(raw) : HISTORICO_SITUACOES_INICIAIS
  return lista
    .filter((h) => h.property_id === propertyId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function registrarHistoricoStatus(params: {
  property_id: string
  status: SituacaoOcupacao
  since: string
  reason?: string
  created_by?: string
  created_by_name?: string
}): Promise<PropertyStatusHistory> {
  initStorage()
  const raw = localStorage.getItem(STORAGE_KEY_HISTORICO)
  const lista: PropertyStatusHistory[] = raw ? JSON.parse(raw) : HISTORICO_SITUACOES_INICIAIS

  const now = new Date().toISOString()
  const novoRegistro: PropertyStatusHistory = {
    id: 'hist-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    property_id: params.property_id,
    status: params.status,
    since: params.since || now.split('T')[0],
    reason: params.reason?.trim() || undefined,
    created_by: params.created_by,
    created_by_name: params.created_by_name,
    created_at: now,
  }

  lista.unshift(novoRegistro)
  localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(lista))
  window.dispatchEvent(new Event('mfo_status_history_changed'))
  return novoRegistro
}

export async function alterarSituacaoImovel(params: {
  id: string
  novaSituacao: SituacaoOcupacao
  motivo?: string
  usuario: Usuario
}): Promise<Imovel> {
  initStorage()
  const raw = localStorage.getItem(STORAGE_KEY_IMOVEIS)
  const lista: Imovel[] = raw ? JSON.parse(raw) : IMOVEIS_INICIAIS

  const index = lista.findIndex(
    (imv) => imv.id === params.id && imv.familia_id === params.usuario.familia_id,
  )
  if (index === -1) {
    throw new Error('Imóvel não encontrado ou sem permissão de acesso.')
  }

  const now = new Date().toISOString()
  const today = now.split('T')[0]

  const atualizado: Imovel = {
    ...lista[index],
    status: params.novaSituacao,
    updated_at: now,
  }

  lista[index] = atualizado
  localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(lista))

  // Toda mudança de situação DEVE gravar uma linha em property_status_history
  await registrarHistoricoStatus({
    property_id: params.id,
    status: params.novaSituacao,
    since: today,
    reason: params.motivo?.trim() || undefined,
    created_by: params.usuario.id,
    created_by_name: params.usuario.nome,
  })

  window.dispatchEvent(new Event('mfo_imoveis_changed'))
  return atualizado
}

// --- DOCUMENTOS E DERIVAÇÃO DE DOCUMENTO PRINCIPAL ---

export async function listarDocumentos(params?: {
  propertyId?: string
  familiaId?: string
  incluirSubstituidos?: boolean
}): Promise<Documento[]> {
  initStorage()
  const raw = localStorage.getItem(STORAGE_KEY_DOCUMENTOS)
  let lista: Documento[] = raw ? JSON.parse(raw) : DOCUMENTOS_INICIAIS

  if (params?.familiaId) {
    lista = lista.filter((d) => d.familia_id === params.familiaId)
  }

  if (params?.propertyId) {
    lista = lista.filter((d) => d.property_id === params.propertyId)
  }

  // Ordena por document_date decrescente ou created_at
  return lista.sort((a, b) => {
    const dataA = a.document_date || a.created_at
    const dataB = b.document_date || b.created_at
    return new Date(dataB).getTime() - new Date(dataA).getTime()
  })
}

/**
 * Derivação do documento principal:
 * NÃO existe campo "principal" no banco.
 * Prioridade de doc_type:
 *   matricula (1) → escritura (2) → contrato_locacao (3) → espelho_iptu (4) → qualquer outro (5)
 * Empate de prioridade = o mais recente (document_date, ou created_at).
 * Documentos que foram substituídos (apontados pelo supersedes_id de um novo) NÃO concorrem como o mais recente daquele tipo.
 */
export async function obterDocumentoPrincipal(
  propertyId: string,
  familiaId?: string,
): Promise<{
  documento: Documento | null
  versoesAnteriores: Documento[]
}> {
  const docs = await listarDocumentos({ propertyId, familiaId })
  if (docs.length === 0) {
    return { documento: null, versoesAnteriores: [] }
  }

  // Ids que foram substituídos por outro documento ativo
  const substituidoIds = new Set(docs.map((d) => d.supersedes_id).filter(Boolean))

  // Considera apenas documentos vigentes (não superados) para ser o principal ativo
  const vigentes = docs.filter((d) => !substituidoIds.has(d.id))
  const candidatos = vigentes.length > 0 ? vigentes : docs

  const ordenados = [...candidatos].sort((a, b) => {
    const prioA = PRIORIDADE_TIPO_DOCUMENTO[a.doc_type] ?? 5
    const prioB = PRIORIDADE_TIPO_DOCUMENTO[b.doc_type] ?? 5

    if (prioA !== prioB) {
      return prioA - prioB // Menor valor = maior prioridade
    }

    // Empate: o mais recente por document_date ou created_at
    const dataA = a.document_date
      ? new Date(a.document_date).getTime()
      : new Date(a.created_at).getTime()
    const dataB = b.document_date
      ? new Date(b.document_date).getTime()
      : new Date(b.created_at).getTime()
    return dataB - dataA
  })

  const principal = ordenados[0] || null

  // Coleta histórico de versões caso o principal atual tenha substituído outro(s)
  const versoesAnteriores: Documento[] = []
  if (principal) {
    let ponteiroId: string | undefined = principal.supersedes_id
    while (ponteiroId) {
      const anterior = docs.find((d) => d.id === ponteiroId)
      if (anterior && !versoesAnteriores.find((v) => v.id === anterior.id)) {
        versoesAnteriores.push(anterior)
        ponteiroId = anterior.supersedes_id
      } else {
        break
      }
    }
  }

  return { documento: principal, versoesAnteriores }
}

export async function obterHistoricoVersoes(
  documentoId: string,
  propertyId: string,
  familiaId?: string,
): Promise<Documento[]> {
  const docs = await listarDocumentos({ propertyId, familiaId })
  const versoes: Documento[] = []
  const doc = docs.find((d) => d.id === documentoId)
  if (!doc) return []

  let ponteiroId: string | undefined = doc.supersedes_id
  while (ponteiroId) {
    const anterior = docs.find((d) => d.id === ponteiroId)
    if (anterior && !versoes.find((v) => v.id === anterior.id)) {
      versoes.push(anterior)
      ponteiroId = anterior.supersedes_id
    } else {
      break
    }
  }
  return versoes
}

export interface VincularDocumentoParams {
  property_id: string
  familia_id: string
  doc_type: TipoDocumento
  title: string
  document_date?: string
  valid_until?: string
  review_status?: ReviewStatus
  evidence?: EvidenceType
  sensitive?: boolean
  supersedes_id?: string // Se estiver substituindo um documento anterior
  // Metadados do arquivo (vindos do upload via ponte Paperless)
  file?: File
  paperless_id?: number | string
  sha256?: string
  source_ref?: string
  file_url?: string
  file_name?: string
  file_size_formatted?: string
  file_size_bytes?: number
}

/**
 * Upload de arquivo via ponte server-side para o Paperless.
 * O Paperless guarda o arquivo original e devolve os metadados
 * (paperless_id, sha256, source_ref, file_url).
 * O Supabase grava apenas esses metadados na tabela document.
 */
export async function uploadParaPaperlessPonte(file: File): Promise<{
  paperless_id: number
  sha256: string
  source_ref: string
  file_url: string
  file_name: string
  file_size_formatted: string
  file_size_bytes: number
}> {
  if (file.size > LIMITE_UPLOAD_BYTES) {
    throw new Error('O arquivo excede o limite máximo permitido de 20 MB.')
  }

  // Simula o processamento da ponte server-side para o Paperless
  await new Promise((r) => setTimeout(r, 600))

  const randomId = Math.floor(1000 + Math.random() * 9000)
  // Gera hash sha256 simulado baseado no nome e tamanho
  const sha256 = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(
    '',
  )

  const mb = file.size / (1024 * 1024)
  const tamanhoFormatado = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`

  return {
    paperless_id: randomId,
    sha256,
    source_ref: `paperless://documents/${randomId}`,
    file_url: `https://paperless.mfo.internal/api/documents/${randomId}/preview/`,
    file_name: file.name,
    file_size_formatted: tamanhoFormatado,
    file_size_bytes: file.size,
  }
}

export async function vincularDocumento(params: VincularDocumentoParams): Promise<Documento> {
  initStorage()
  const rawDocs = localStorage.getItem(STORAGE_KEY_DOCUMENTOS)
  const docs: Documento[] = rawDocs ? JSON.parse(rawDocs) : DOCUMENTOS_INICIAIS

  const now = new Date().toISOString()
  const novoId = 'doc-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)

  let fileMeta = {
    paperless_id: params.paperless_id || Math.floor(1000 + Math.random() * 9000),
    sha256: params.sha256 || '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    source_ref: params.source_ref || `paperless://documents/new`,
    file_url: params.file_url || 'https://paperless.mfo.internal/api/documents/new/preview/',
    file_name: params.file_name || `${params.title}.pdf`,
    file_size_formatted: params.file_size_formatted || '1.8 MB',
    file_size_bytes: params.file_size_bytes || 1887436,
  }

  // Se passou um File real, processa pela ponte do Paperless
  if (params.file) {
    const uploaded = await uploadParaPaperlessPonte(params.file)
    fileMeta = uploaded
  }

  const novoDoc: Documento = {
    id: novoId,
    property_id: params.property_id,
    familia_id: params.familia_id,
    doc_type: params.doc_type,
    title: params.title.trim(),
    document_date: params.document_date || now.split('T')[0],
    valid_until: params.valid_until || undefined,
    review_status: params.review_status || 'a_conferir',
    evidence: params.evidence || 'documento_oficial',
    sensitive: Boolean(params.sensitive),
    supersedes_id: params.supersedes_id || undefined,
    paperless_id: fileMeta.paperless_id,
    sha256: fileMeta.sha256,
    source_ref: fileMeta.source_ref,
    file_url: fileMeta.file_url,
    file_name: fileMeta.file_name,
    file_size_formatted: fileMeta.file_size_formatted,
    file_size_bytes: fileMeta.file_size_bytes,
    created_at: now,
  }

  docs.unshift(novoDoc)
  localStorage.setItem(STORAGE_KEY_DOCUMENTOS, JSON.stringify(docs))

  window.dispatchEvent(new Event('mfo_documentos_changed'))
  return novoDoc
}

export async function removerDocumento(id: string, familiaId?: string): Promise<boolean> {
  initStorage()
  const rawDocs = localStorage.getItem(STORAGE_KEY_DOCUMENTOS)
  let docs: Documento[] = rawDocs ? JSON.parse(rawDocs) : DOCUMENTOS_INICIAIS

  const doc = docs.find((d) => d.id === id && (!familiaId || d.familia_id === familiaId))
  if (!doc) return false

  docs = docs.filter((d) => d.id !== id)
  localStorage.setItem(STORAGE_KEY_DOCUMENTOS, JSON.stringify(docs))

  window.dispatchEvent(new Event('mfo_documentos_changed'))
  return true
}
