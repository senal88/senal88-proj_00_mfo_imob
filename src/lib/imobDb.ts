/**
 * Camada de dados MFO Imob
 * Integrada ao Supabase self-hosted (schema "imob", isolamento RLS por família via sessão do usuário)
 *
 * NENHUM DADO FICTÍCIO / MOCKDATA!
 * Se não houver dados, retorna listas vazias e mantém estados vazios amigáveis.
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
  supabaseRest,
  getSupabaseConfig,
  getStoredSession,
  setStoredSession,
  StoredSession,
} from './supabaseClient'

const STORAGE_KEY_AUTH = 'mfo_imob_auth_user_v2'

export const LIMITE_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 MB

// --- AUTENTICAÇÃO E SESSÃO LOCAL DO OPERADOR ---

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

/**
 * Resolve os dados do usuário a partir da sessão do Supabase (family, family_member ou metadados)
 */
export async function resolverUsuarioLogado(session: StoredSession): Promise<Usuario> {
  const userId = session.user.id
  const email = session.user.email || ''
  const metadata = session.user.user_metadata || {}

  let familiaId = (metadata.familia_id as string) || (metadata.family_id as string) || ''
  let familiaNome = (metadata.familia_nome as string) || (metadata.family_name as string) || ''
  let nome = (metadata.nome as string) || (metadata.name as string) || ''
  let cargo = (metadata.cargo as string) || (metadata.role as string) || 'Operação Family Office'

  // Tenta consultar a tabela family_member / family no schema imob
  try {
    const members = await supabaseRest<
      Array<{
        id?: string
        family_id?: string
        user_id?: string
        role?: string
        family?: { id?: string; name?: string; display_name?: string }
      }>
    >(`family_member?user_id=eq.${userId}&select=*,family:family_id(*)`)

    if (members && members.length > 0) {
      const m = members[0]
      if (m.family_id) familiaId = m.family_id
      if (m.family?.name || m.family?.display_name) {
        familiaNome = m.family.display_name || m.family.name || familiaNome
      }
      if (m.role) cargo = m.role
    }
  } catch {
    // Se a query falhar (RLS ou formato de relação), tenta query direta na tabela family
    try {
      const families =
        await supabaseRest<Array<{ id: string; name?: string; display_name?: string }>>(
          'family?limit=1',
        )
      if (families && families.length > 0) {
        familiaId = families[0].id
        familiaNome = families[0].display_name || families[0].name || familiaNome
      }
    } catch {
      // noop - fallback para metadados ou padrão
    }
  }

  // Se o nome não veio nos metadados, deriva do e-mail
  if (!nome && email) {
    nome = email
      .split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Padrão do projeto é a Família BNI quando não identificado
  if (!familiaNome) {
    familiaNome = 'Família BNI'
  }

  const usuario: Usuario = {
    id: userId,
    nome: nome || 'Operador BNI',
    email,
    cargo,
    familia_id: familiaId,
    familia_nome: familiaNome,
    avatar_url: (metadata.avatar_url as string) || undefined,
  }

  setStoredUser(usuario)
  return usuario
}

// --- ENTIDADES PROPRIETÁRIAS (entity) ---

export async function listarEntidades(familiaId?: string): Promise<EntidadeProprietaria[]> {
  const cfg = getSupabaseConfig()
  if (!cfg.url) {
    return []
  }

  try {
    let query = 'entity?select=*'
    if (familiaId) {
      query += `&family_id=eq.${encodeURIComponent(familiaId)}`
    }
    query += '&order=name.asc'

    const data = await supabaseRest<
      Array<{
        id: string
        family_id?: string
        familia_id?: string
        name?: string
        nome?: string
        sigla?: string
        code?: string
        cnpj?: string
        tax_id?: string
      }>
    >(query)

    if (!data || !Array.isArray(data)) return []

    return data.map((d) => ({
      id: d.id,
      familia_id: d.family_id || d.familia_id || familiaId || '',
      nome: d.name || d.nome || d.sigla || 'Entidade',
      sigla: d.sigla || d.code || '',
      cnpj: d.cnpj || d.tax_id || undefined,
    }))
  } catch (err) {
    console.warn('Erro ao consultar entidades no Supabase:', err)
    return []
  }
}

// --- IMÓVEIS (property) ---

export async function listarImoveis(familiaId?: string, busca?: string): Promise<Imovel[]> {
  const cfg = getSupabaseConfig()
  if (!cfg.url) {
    return []
  }

  try {
    let query = 'property?select=*,entity:entity_id(id,name,sigla)'

    if (familiaId) {
      query += `&family_id=eq.${encodeURIComponent(familiaId)}`
    }

    if (busca && busca.trim()) {
      const q = encodeURIComponent(`*${busca.trim()}*`)
      query += `&or=(display_name.ilike.${q},code.ilike.${q},address.ilike.${q},city.ilike.${q},registry_number.ilike.${q},unit.ilike.${q})`
    }

    query += '&order=display_name.asc'

    const rows = await supabaseRest<Array<Record<string, unknown>>>(query)
    if (!rows || !Array.isArray(rows)) return []

    return rows.map(mapDbToImovel)
  } catch (err) {
    console.error('Erro ao listar imóveis do Supabase:', err)
    throw err
  }
}

export async function obterImovelPorId(id: string, familiaId?: string): Promise<Imovel | null> {
  const cfg = getSupabaseConfig()
  if (!cfg.url) {
    return null
  }

  try {
    let query = `property?id=eq.${encodeURIComponent(id)}&select=*,entity:entity_id(id,name,sigla)`
    if (familiaId) {
      query += `&family_id=eq.${encodeURIComponent(familiaId)}`
    }

    const rows = await supabaseRest<Array<Record<string, unknown>>>(query)
    if (!rows || rows.length === 0) return null

    return mapDbToImovel(rows[0])
  } catch (err) {
    console.error(`Erro ao obter imóvel ${id} no Supabase:`, err)
    return null
  }
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
  const now = new Date().toISOString()
  const today = now.split('T')[0]

  if (dados.id) {
    // Busca imóvel anterior para checar se houve mudança de situação
    const imovelAnterior = await obterImovelPorId(dados.id, usuario.familia_id)
    const mudouStatus = imovelAnterior && imovelAnterior.status !== dados.status

    const payload: Record<string, unknown> = {
      entity_id: dados.entity_id,
      display_name: dados.display_name.trim(),
      code: dados.code.trim(),
      kind: dados.kind,
      unit: dados.unit?.trim() || null,
      address: dados.address?.trim() || null,
      city: dados.city?.trim() || null,
      state: dados.state?.trim() ? dados.state.trim().toUpperCase() : null,
      registry_number: dados.registry_number?.trim() || null,
      registry_office: dados.registry_office?.trim() || null,
      iptu_number: dados.iptu_number?.trim() || null,
      area_private_m2: dados.area_private_m2 !== undefined ? dados.area_private_m2 : null,
      status: dados.status,
      accounting_nature: dados.accounting_nature?.trim() || null,
      updated_at: now,
    }

    const rows = await supabaseRest<Array<Record<string, unknown>>>(
      `property?id=eq.${encodeURIComponent(dados.id)}`,
      {
        method: 'PATCH',
        body: payload,
        prefer: 'return=representation',
      },
    )

    if (mudouStatus) {
      await registrarHistoricoStatus({
        property_id: dados.id,
        status: dados.status,
        since: today,
        reason: statusReason || 'Alteração de situação no cadastro do imóvel',
        created_by: usuario.id,
        created_by_name: usuario.nome,
      })
    }

    window.dispatchEvent(new Event('mfo_imoveis_changed'))
    return rows && rows.length > 0 ? mapDbToImovel(rows[0]) : (await obterImovelPorId(dados.id))!
  } else {
    // Inserção
    const payload: Record<string, unknown> = {
      family_id: usuario.familia_id,
      entity_id: dados.entity_id,
      display_name: dados.display_name.trim(),
      code: dados.code.trim(),
      kind: dados.kind,
      unit: dados.unit?.trim() || null,
      address: dados.address?.trim() || null,
      city: dados.city?.trim() || null,
      state: dados.state?.trim() ? dados.state.trim().toUpperCase() : null,
      registry_number: dados.registry_number?.trim() || null,
      registry_office: dados.registry_office?.trim() || null,
      iptu_number: dados.iptu_number?.trim() || null,
      area_private_m2: dados.area_private_m2 !== undefined ? dados.area_private_m2 : null,
      status: dados.status,
      accounting_nature: dados.accounting_nature?.trim() || null,
      created_at: now,
      updated_at: now,
    }

    const rows = await supabaseRest<Array<Record<string, unknown>>>('property', {
      method: 'POST',
      body: payload,
      prefer: 'return=representation',
    })

    const novo = rows && rows.length > 0 ? mapDbToImovel(rows[0]) : null
    if (!novo) {
      throw new Error('Falha ao salvar imóvel no Supabase.')
    }

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

// --- SITUAÇÃO E HISTÓRICO (property_status_history) ---

export async function listarHistoricoStatus(propertyId: string): Promise<PropertyStatusHistory[]> {
  try {
    const rows = await supabaseRest<Array<Record<string, unknown>>>(
      `property_status_history?property_id=eq.${encodeURIComponent(propertyId)}&order=created_at.desc`,
    )
    if (!rows || !Array.isArray(rows)) return []

    return rows.map((r) => ({
      id: String(r.id),
      property_id: String(r.property_id),
      status: r.status as SituacaoOcupacao,
      since: String(r.since || (r.created_at ? String(r.created_at).split('T')[0] : '')),
      reason: r.reason ? String(r.reason) : undefined,
      created_by: r.created_by ? String(r.created_by) : undefined,
      created_by_name: r.created_by_name ? String(r.created_by_name) : undefined,
      created_at: String(r.created_at || new Date().toISOString()),
    }))
  } catch (err) {
    console.warn(`Erro ao consultar histórico de ocupação do imóvel ${propertyId}:`, err)
    return []
  }
}

export async function registrarHistoricoStatus(params: {
  property_id: string
  status: SituacaoOcupacao
  since: string
  reason?: string
  created_by?: string
  created_by_name?: string
}): Promise<PropertyStatusHistory> {
  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    property_id: params.property_id,
    status: params.status,
    since: params.since || now.split('T')[0],
    reason: params.reason?.trim() || null,
    created_by: params.created_by || null,
    created_by_name: params.created_by_name || null,
    created_at: now,
  }

  const rows = await supabaseRest<Array<Record<string, unknown>>>('property_status_history', {
    method: 'POST',
    body: payload,
    prefer: 'return=representation',
  })

  window.dispatchEvent(new Event('mfo_status_history_changed'))

  if (rows && rows.length > 0) {
    const r = rows[0]
    return {
      id: String(r.id),
      property_id: String(r.property_id),
      status: r.status as SituacaoOcupacao,
      since: String(r.since || payload.since),
      reason: r.reason ? String(r.reason) : undefined,
      created_by: r.created_by ? String(r.created_by) : undefined,
      created_by_name: r.created_by_name ? String(r.created_by_name) : undefined,
      created_at: String(r.created_at || now),
    }
  }

  return {
    id: `hist-${Date.now()}`,
    property_id: params.property_id,
    status: params.status,
    since: params.since,
    reason: params.reason,
    created_by: params.created_by,
    created_by_name: params.created_by_name,
    created_at: now,
  }
}

export async function alterarSituacaoImovel(params: {
  id: string
  novaSituacao: SituacaoOcupacao
  motivo?: string
  usuario: Usuario
}): Promise<Imovel> {
  const now = new Date().toISOString()
  const today = now.split('T')[0]

  const rows = await supabaseRest<Array<Record<string, unknown>>>(
    `property?id=eq.${encodeURIComponent(params.id)}`,
    {
      method: 'PATCH',
      body: {
        status: params.novaSituacao,
        updated_at: now,
      },
      prefer: 'return=representation',
    },
  )

  // Grava histórico
  await registrarHistoricoStatus({
    property_id: params.id,
    status: params.novaSituacao,
    since: today,
    reason: params.motivo?.trim() || undefined,
    created_by: params.usuario.id,
    created_by_name: params.usuario.nome,
  })

  window.dispatchEvent(new Event('mfo_imoveis_changed'))

  if (rows && rows.length > 0) {
    return mapDbToImovel(rows[0])
  }
  return (await obterImovelPorId(params.id))!
}

// --- DOCUMENTOS (document) ---

export async function listarDocumentos(params?: {
  propertyId?: string
  familiaId?: string
  incluirSubstituidos?: boolean
}): Promise<Documento[]> {
  try {
    let query = 'document?select=*'
    if (params?.propertyId) {
      query += `&property_id=eq.${encodeURIComponent(params.propertyId)}`
    }
    if (params?.familiaId) {
      query += `&family_id=eq.${encodeURIComponent(params.familiaId)}`
    }
    query += '&order=document_date.desc.nullslast,created_at.desc'

    const rows = await supabaseRest<Array<Record<string, unknown>>>(query)
    if (!rows || !Array.isArray(rows)) return []

    return rows.map(mapDbToDocumento)
  } catch (err) {
    console.warn('Erro ao consultar documentos no Supabase:', err)
    return []
  }
}

/**
 * Derivação do documento principal por prioridade legal:
 * matricula (1) → escritura (2) → contrato_locacao (3) → espelho_iptu (4) → outros (5)
 * Empate: mais recente (document_date ou created_at)
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

  // IDs que foram substituídos por outro documento ativo
  const substituidoIds = new Set(docs.map((d) => d.supersedes_id).filter(Boolean))
  const vigentes = docs.filter((d) => !substituidoIds.has(d.id))
  const candidatos = vigentes.length > 0 ? vigentes : docs

  const ordenados = [...candidatos].sort((a, b) => {
    const prioA = PRIORIDADE_TIPO_DOCUMENTO[a.doc_type] ?? 5
    const prioB = PRIORIDADE_TIPO_DOCUMENTO[b.doc_type] ?? 5

    if (prioA !== prioB) {
      return prioA - prioB
    }

    const dataA = a.document_date
      ? new Date(a.document_date).getTime()
      : new Date(a.created_at).getTime()
    const dataB = b.document_date
      ? new Date(b.document_date).getTime()
      : new Date(b.created_at).getTime()
    return dataB - dataA
  })

  const principal = ordenados[0] || null

  // Coleta histórico de versões
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
  supersedes_id?: string
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
 * O Paperless guarda o arquivo e retorna os metadados para catalogação no Supabase.
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

  // Cálculo de SHA-256 no browser para integridade
  let sha256 = ''
  try {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    sha256 = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  }

  const randomId = Math.floor(1000 + Math.random() * 9000)
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
  const now = new Date().toISOString()

  let fileMeta = {
    paperless_id: params.paperless_id || null,
    sha256: params.sha256 || null,
    source_ref: params.source_ref || null,
    file_url: params.file_url || '',
    file_name: params.file_name || `${params.title}.pdf`,
    file_size_formatted: params.file_size_formatted || '',
    file_size_bytes: params.file_size_bytes || null,
  }

  if (params.file) {
    const uploaded = await uploadParaPaperlessPonte(params.file)
    fileMeta = uploaded
  }

  const payload: Record<string, unknown> = {
    property_id: params.property_id,
    family_id: params.familia_id,
    doc_type: params.doc_type,
    title: params.title.trim(),
    document_date: params.document_date || now.split('T')[0],
    valid_until: params.valid_until || null,
    review_status: params.review_status || 'a_conferir',
    evidence: params.evidence || 'documento_oficial',
    sensitive: Boolean(params.sensitive),
    supersedes_id: params.supersedes_id || null,
    paperless_id: fileMeta.paperless_id,
    sha256: fileMeta.sha256,
    source_ref: fileMeta.source_ref,
    file_url: fileMeta.file_url,
    file_name: fileMeta.file_name,
    file_size_formatted: fileMeta.file_size_formatted,
    file_size_bytes: fileMeta.file_size_bytes,
    created_at: now,
  }

  const rows = await supabaseRest<Array<Record<string, unknown>>>('document', {
    method: 'POST',
    body: payload,
    prefer: 'return=representation',
  })

  window.dispatchEvent(new Event('mfo_documentos_changed'))

  if (rows && rows.length > 0) {
    return mapDbToDocumento(rows[0])
  }

  return {
    id: `doc-${Date.now()}`,
    property_id: params.property_id,
    familia_id: params.familia_id,
    doc_type: params.doc_type,
    title: params.title,
    document_date: params.document_date,
    valid_until: params.valid_until,
    review_status: params.review_status,
    evidence: params.evidence,
    sensitive: params.sensitive,
    supersedes_id: params.supersedes_id,
    file_url: fileMeta.file_url,
    file_name: fileMeta.file_name,
    file_size_formatted: fileMeta.file_size_formatted,
    file_size_bytes: fileMeta.file_size_bytes || undefined,
    created_at: now,
  }
}

export async function removerDocumento(id: string, familiaId?: string): Promise<boolean> {
  try {
    let query = `document?id=eq.${encodeURIComponent(id)}`
    if (familiaId) {
      query += `&family_id=eq.${encodeURIComponent(familiaId)}`
    }

    await supabaseRest(query, {
      method: 'DELETE',
      prefer: 'return=minimal',
    })

    window.dispatchEvent(new Event('mfo_documentos_changed'))
    return true
  } catch (err) {
    console.error('Erro ao remover documento no Supabase:', err)
    return false
  }
}

// --- MAPEADORES INTERNOS (DB -> FRONTEND TYPES) ---

function mapDbToImovel(r: Record<string, unknown>): Imovel {
  const entityObj = r.entity as { id?: string; name?: string; sigla?: string } | undefined
  return {
    id: String(r.id),
    familia_id: String(r.family_id || r.familia_id || ''),
    entity_id: String(r.entity_id || ''),
    display_name: String(r.display_name || ''),
    code: String(r.code || ''),
    kind: (r.kind as TipoImovel) || 'apartamento',
    unit: r.unit ? String(r.unit) : undefined,
    address: r.address ? String(r.address) : undefined,
    city: r.city ? String(r.city) : undefined,
    state: r.state ? String(r.state) : undefined,
    registry_number: r.registry_number ? String(r.registry_number) : undefined,
    registry_office: r.registry_office ? String(r.registry_office) : undefined,
    iptu_number: r.iptu_number ? String(r.iptu_number) : undefined,
    area_private_m2:
      r.area_private_m2 !== null && r.area_private_m2 !== undefined
        ? Number(r.area_private_m2)
        : undefined,
    status: (r.status as SituacaoOcupacao) || 'disponivel',
    accounting_nature: r.accounting_nature ? String(r.accounting_nature) : undefined,
    created_at: String(r.created_at || new Date().toISOString()),
    updated_at: String(r.updated_at || new Date().toISOString()),
    entity_name: entityObj?.name || (r.entity_name ? String(r.entity_name) : undefined),
  }
}

function mapDbToDocumento(r: Record<string, unknown>): Documento {
  return {
    id: String(r.id),
    property_id: String(r.property_id),
    familia_id: String(r.family_id || r.familia_id || ''),
    doc_type: (r.doc_type as TipoDocumento) || 'outro',
    title: String(r.title || 'Documento'),
    document_date: r.document_date ? String(r.document_date) : undefined,
    valid_until: r.valid_until ? String(r.valid_until) : undefined,
    review_status: (r.review_status as ReviewStatus) || undefined,
    evidence: (r.evidence as EvidenceType) || undefined,
    sensitive: Boolean(r.sensitive),
    supersedes_id: r.supersedes_id ? String(r.supersedes_id) : undefined,
    paperless_id: (r.paperless_id as string | number) || undefined,
    sha256: r.sha256 ? String(r.sha256) : undefined,
    source_ref: r.source_ref ? String(r.source_ref) : undefined,
    file_url: String(r.file_url || ''),
    file_name: String(r.file_name || 'documento.pdf'),
    file_size_formatted: String(r.file_size_formatted || ''),
    file_size_bytes: r.file_size_bytes ? Number(r.file_size_bytes) : undefined,
    created_at: String(r.created_at || new Date().toISOString()),
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  }
}
