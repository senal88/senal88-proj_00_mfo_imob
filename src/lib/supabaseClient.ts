/**
 * Cliente Supabase self-hosted para o MFO Imob
 * Conexão configurada para o schema "imob" com isolamento RLS por família
 */

export interface SupabaseConfig {
  url: string
  anonKey: string
  schema: string
}

const STORAGE_SESSION_KEY = 'mfo_imob_supabase_session_v1'

export function getSupabaseConfig(): SupabaseConfig {
  const url =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
    (typeof window !== 'undefined'
      ? (window as unknown as { __SUPABASE_URL__?: string }).__SUPABASE_URL__ || ''
      : '')

  const anonKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
    (typeof window !== 'undefined'
      ? (window as unknown as { __SUPABASE_ANON_KEY__?: string }).__SUPABASE_ANON_KEY__ || ''
      : '')

  return {
    url: url.replace(/\/+$/, ''),
    anonKey,
    schema: 'imob',
  }
}

export interface StoredSession {
  access_token: string
  refresh_token?: string
  expires_at?: number
  user: {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
    app_metadata?: Record<string, unknown>
  }
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

export function setStoredSession(session: StoredSession | null): void {
  if (typeof window === 'undefined') return
  if (session) {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(STORAGE_SESSION_KEY)
  }
}

/**
 * Executa requisições REST ao Supabase PostgREST no schema "imob"
 */
export async function supabaseRest<T = unknown>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
    body?: unknown
    headers?: Record<string, string>
    schema?: string
    prefer?: string
  } = {},
): Promise<T> {
  const cfg = getSupabaseConfig()
  if (!cfg.url) {
    throw new Error(
      'VITE_SUPABASE_URL não configurada. Defina a variável de ambiente do Supabase self-hosted.',
    )
  }

  const session = getStoredSession()
  const token = session?.access_token || cfg.anonKey

  const headers: Record<string, string> = {
    apikey: cfg.anonKey,
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Profile': options.schema || cfg.schema,
    'Content-Profile': options.schema || cfg.schema,
    ...options.headers,
  }

  if (options.prefer) {
    headers['Prefer'] = options.prefer
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const targetUrl = `${cfg.url}/rest/v1${cleanEndpoint}`

  const res = await fetch(targetUrl, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    let errorDetail = ''
    try {
      const errJson = (await res.json()) as { message?: string; details?: string; hint?: string }
      errorDetail = errJson.message || errJson.details || JSON.stringify(errJson)
    } catch {
      errorDetail = await res.text()
    }
    throw new Error(
      `Supabase REST error (${res.status} ${res.statusText}): ${errorDetail || 'Falha na requisição'}`,
    )
  }

  // Alguns métodos DELETE / PATCH com return=minimal devolvem status 204 No Content
  if (res.status === 204) {
    return null as unknown as T
  }

  const text = await res.text()
  if (!text) return null as unknown as T
  return JSON.parse(text) as T
}

/**
 * Autenticação por e-mail/senha no Supabase Auth (/auth/v1/token?grant_type=password)
 */
export async function supabaseSignIn(email: string, password: string): Promise<StoredSession> {
  const cfg = getSupabaseConfig()
  if (!cfg.url) {
    throw new Error(
      'VITE_SUPABASE_URL não configurada. Defina a variável de ambiente do Supabase self-hosted.',
    )
  }

  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    let errorDetail = 'Credenciais inválidas'
    try {
      const errJson = (await res.json()) as { error_description?: string; msg?: string }
      errorDetail = errJson.error_description || errJson.msg || errorDetail
    } catch {
      // noop
    }
    throw new Error(errorDetail)
  }

  const data = (await res.json()) as StoredSession
  setStoredSession(data)
  return data
}

/**
 * Solicitação de redefinição de senha via Supabase Auth
 */
export async function supabaseResetPassword(email: string): Promise<boolean> {
  const cfg = getSupabaseConfig()
  if (!cfg.url) {
    throw new Error('VITE_SUPABASE_URL não configurada.')
  }

  const redirectTo = `${window.location.origin}/redefinir-senha`
  const res = await fetch(`${cfg.url}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  })

  if (!res.ok) {
    let errorDetail = 'Erro ao enviar e-mail de recuperação'
    try {
      const errJson = (await res.json()) as { error_description?: string; msg?: string }
      errorDetail = errJson.error_description || errJson.msg || errorDetail
    } catch {
      // noop
    }
    throw new Error(errorDetail)
  }

  return true
}

/**
 * Atualização de senha de usuário logado ou via token de recuperação
 */
export async function supabaseUpdatePassword(novaSenha: string): Promise<boolean> {
  const cfg = getSupabaseConfig()
  if (!cfg.url) {
    throw new Error('VITE_SUPABASE_URL não configurada.')
  }

  const session = getStoredSession()
  if (!session?.access_token) {
    throw new Error('Sessão expirada ou não autenticada para alteração de senha.')
  }

  const res = await fetch(`${cfg.url}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: novaSenha }),
  })

  if (!res.ok) {
    let errorDetail = 'Erro ao atualizar senha'
    try {
      const errJson = (await res.json()) as { error_description?: string; msg?: string }
      errorDetail = errJson.error_description || errJson.msg || errorDetail
    } catch {
      // noop
    }
    throw new Error(errorDetail)
  }

  return true
}

/**
 * Encerra sessão
 */
export async function supabaseSignOut(): Promise<void> {
  const cfg = getSupabaseConfig()
  const session = getStoredSession()

  if (cfg.url && session?.access_token) {
    try {
      await fetch(`${cfg.url}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
      })
    } catch {
      // noop
    }
  }

  setStoredSession(null)
}
