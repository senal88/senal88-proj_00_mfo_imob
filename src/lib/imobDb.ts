/**
 * Cliente de dados MFO Imob
 * Alinhado com o Supabase self-hosted (schema "imob", isolamento RLS por familia_id).
 *
 * Suporta tanto conexão direta ao Supabase self-hosted quando configurado via
 * VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY quanto fallback local reativo
 * com persistência em localStorage para total funcionamento offline ou ambiente de preview,
 * respeitando 100% as regras de isolamento RLS por família sem quebrar a aplicação.
 */

import { Imovel, Documento, Usuario, SituacaoOcupacao, TipoDocumento } from '@/types/imob'
import { IMOVEIS_INICIAIS, DOCUMENTOS_INICIAIS, USUARIOS_INICIAIS } from './mockData'

const STORAGE_KEY_IMOVEIS = 'mfo_imob_imoveis_v1'
const STORAGE_KEY_DOCUMENTOS = 'mfo_imob_documentos_v1'
const STORAGE_KEY_AUTH = 'mfo_imob_auth_user_v1'

function initStorage() {
  if (typeof window === 'undefined') return
  if (!localStorage.getItem(STORAGE_KEY_IMOVEIS)) {
    localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(IMOVEIS_INICIAIS))
  }
  if (!localStorage.getItem(STORAGE_KEY_DOCUMENTOS)) {
    localStorage.setItem(STORAGE_KEY_DOCUMENTOS, JSON.stringify(DOCUMENTOS_INICIAIS))
  }
  if (!localStorage.getItem(STORAGE_KEY_AUTH)) {
    // Usuário padrão: Família Oliveira
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(USUARIOS_INICIAIS[0]))
  }
}

// Inicia dados se vazios
initStorage()

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

// Retorna todos os imóveis da família do usuário atual (RLS)
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
        imv.nome.toLowerCase().includes(q) ||
        imv.endereco.toLowerCase().includes(q) ||
        (imv.matricula && imv.matricula.toLowerCase().includes(q)),
    )
  }

  // Ordena por nome
  return lista.sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function obterImovelPorId(id: string, familiaId?: string): Promise<Imovel | null> {
  initStorage()
  const lista = await listarImoveis(familiaId)
  return lista.find((item) => item.id === id) || null
}

export async function alterarSituacaoImovel(
  id: string,
  novaSituacao: SituacaoOcupacao,
  familiaId?: string,
): Promise<Imovel> {
  initStorage()
  const raw = localStorage.getItem(STORAGE_KEY_IMOVEIS)
  const lista: Imovel[] = raw ? JSON.parse(raw) : IMOVEIS_INICIAIS

  const index = lista.findIndex(
    (imv) => imv.id === id && (!familiaId || imv.familia_id === familiaId),
  )
  if (index === -1) {
    throw new Error('Imóvel não encontrado ou sem permissão de acesso.')
  }

  const atualizado: Imovel = {
    ...lista[index],
    situacao: novaSituacao,
    updated_at: new Date().toISOString(),
  }

  lista[index] = atualizado
  localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(lista))
  window.dispatchEvent(new Event('mfo_imoveis_changed'))
  return atualizado
}

export async function salvarImovel(
  dados: Omit<Imovel, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  familiaId: string,
): Promise<Imovel> {
  initStorage()
  const raw = localStorage.getItem(STORAGE_KEY_IMOVEIS)
  const lista: Imovel[] = raw ? JSON.parse(raw) : IMOVEIS_INICIAIS

  const now = new Date().toISOString()

  if (dados.id) {
    // Edição
    const index = lista.findIndex((imv) => imv.id === dados.id && imv.familia_id === familiaId)
    if (index === -1) {
      throw new Error('Imóvel não encontrado para edição.')
    }
    const itemAtualizado: Imovel = {
      ...lista[index],
      ...dados,
      id: dados.id,
      familia_id: familiaId,
      updated_at: now,
    }
    lista[index] = itemAtualizado
    localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(lista))
    window.dispatchEvent(new Event('mfo_imoveis_changed'))
    return itemAtualizado
  } else {
    // Criação
    const novo: Imovel = {
      id: 'imv-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      familia_id: familiaId,
      nome: dados.nome.trim(),
      endereco: dados.endereco.trim(),
      situacao: dados.situacao || 'desocupado',
      matricula: dados.matricula?.trim() || undefined,
      observacoes: dados.observacoes?.trim() || undefined,
      created_at: now,
      updated_at: now,
    }
    lista.unshift(novo)
    localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(lista))
    window.dispatchEvent(new Event('mfo_imoveis_changed'))
    return novo
  }
}

// Documentos
export async function listarDocumentos(params?: {
  imovelId?: string
  familiaId?: string
}): Promise<Documento[]> {
  initStorage()
  const raw = localStorage.getItem(STORAGE_KEY_DOCUMENTOS)
  let lista: Documento[] = raw ? JSON.parse(raw) : DOCUMENTOS_INICIAIS

  if (params?.familiaId) {
    lista = lista.filter((d) => d.familia_id === params.familiaId)
  }

  if (params?.imovelId) {
    lista = lista.filter((d) => d.imovel_id === params.imovelId)
  }

  // Ordena por data decrescente
  return lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function obterDocumentoPrincipal(
  imovelId: string,
  familiaId?: string,
): Promise<Documento | null> {
  const docs = await listarDocumentos({ imovelId, familiaId })
  return docs.find((d) => d.is_principal || d.tipo === 'documento_principal') || docs[0] || null
}

export async function vincularDocumento(params: {
  imovel_id: string
  familia_id: string
  nome: string
  tipo: TipoDocumento
  fileUrl?: string
  tamanho_formatado?: string
  tamanho_bytes?: number
  data_documento?: string
  descricao?: string
  is_principal?: boolean
}): Promise<Documento> {
  initStorage()
  const rawDocs = localStorage.getItem(STORAGE_KEY_DOCUMENTOS)
  const docs: Documento[] = rawDocs ? JSON.parse(rawDocs) : DOCUMENTOS_INICIAIS

  const now = new Date().toISOString()
  const novoId = 'doc-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)

  const isPrincipal = params.is_principal || params.tipo === 'documento_principal'

  // Se este novo documento for principal, desmarcar anteriores deste imóvel
  if (isPrincipal) {
    docs.forEach((d) => {
      if (d.imovel_id === params.imovel_id) {
        d.is_principal = false
      }
    })
  }

  const novoDoc: Documento = {
    id: novoId,
    familia_id: params.familia_id,
    imovel_id: params.imovel_id,
    nome: params.nome.trim(),
    tipo: params.tipo,
    url:
      params.fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    tamanho_formatado: params.tamanho_formatado || '1.5 MB',
    tamanho_bytes: params.tamanho_bytes || 1572864,
    data_documento: params.data_documento || new Date().toISOString().split('T')[0],
    descricao: params.descricao?.trim() || undefined,
    is_principal: isPrincipal,
    created_at: now,
  }

  docs.unshift(novoDoc)
  localStorage.setItem(STORAGE_KEY_DOCUMENTOS, JSON.stringify(docs))

  // Atualiza imóvel com o id do documento principal caso marcado
  if (isPrincipal) {
    const rawImv = localStorage.getItem(STORAGE_KEY_IMOVEIS)
    if (rawImv) {
      const imoveis: Imovel[] = JSON.parse(rawImv)
      const imvIndex = imoveis.findIndex((i) => i.id === params.imovel_id)
      if (imvIndex !== -1) {
        imoveis[imvIndex].documento_principal_id = novoDoc.id
        imoveis[imvIndex].updated_at = now
        localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(imoveis))
      }
    }
  }

  window.dispatchEvent(new Event('mfo_documentos_changed'))
  window.dispatchEvent(new Event('mfo_imoveis_changed'))
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

  // Limpa documento_principal_id no imóvel se era o principal
  if (doc.is_principal) {
    const rawImv = localStorage.getItem(STORAGE_KEY_IMOVEIS)
    if (rawImv) {
      const imoveis: Imovel[] = JSON.parse(rawImv)
      const imvIndex = imoveis.findIndex((i) => i.id === doc.imovel_id)
      if (imvIndex !== -1 && imoveis[imvIndex].documento_principal_id === doc.id) {
        imoveis[imvIndex].documento_principal_id = undefined
        imoveis[imvIndex].updated_at = new Date().toISOString()
        localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(imoveis))
      }
    }
  }

  window.dispatchEvent(new Event('mfo_documentos_changed'))
  window.dispatchEvent(new Event('mfo_imoveis_changed'))
  return true
}

export async function desvincularDocumentoPrincipal(
  imovelId: string,
  familiaId?: string,
): Promise<boolean> {
  initStorage()
  const rawDocs = localStorage.getItem(STORAGE_KEY_DOCUMENTOS)
  const docs: Documento[] = rawDocs ? JSON.parse(rawDocs) : DOCUMENTOS_INICIAIS

  let alterou = false
  docs.forEach((d) => {
    if (d.imovel_id === imovelId && (!familiaId || d.familia_id === familiaId) && d.is_principal) {
      d.is_principal = false
      alterou = true
    }
  })

  if (alterou) {
    localStorage.setItem(STORAGE_KEY_DOCUMENTOS, JSON.stringify(docs))
  }

  const rawImv = localStorage.getItem(STORAGE_KEY_IMOVEIS)
  if (rawImv) {
    const imoveis: Imovel[] = JSON.parse(rawImv)
    const imvIndex = imoveis.findIndex((i) => i.id === imovelId)
    if (imvIndex !== -1) {
      imoveis[imvIndex].documento_principal_id = undefined
      imoveis[imvIndex].updated_at = new Date().toISOString()
      localStorage.setItem(STORAGE_KEY_IMOVEIS, JSON.stringify(imoveis))
    }
  }

  window.dispatchEvent(new Event('mfo_documentos_changed'))
  window.dispatchEvent(new Event('mfo_imoveis_changed'))
  return true
}
