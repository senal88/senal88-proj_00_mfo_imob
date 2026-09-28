import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL as CONFIG_SUPABASE_URL,
  SUPABASE_SCHEMA as CONFIG_SUPABASE_SCHEMA,
  SUPABASE_ANON_KEY as CONFIG_SUPABASE_ANON_KEY,
} from './supabaseConfig'

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
const envSchema = (import.meta.env.VITE_SUPABASE_SCHEMA as string | undefined)?.trim()

export const supabaseUrl = envUrl || CONFIG_SUPABASE_URL
export const supabaseSchema = envSchema || CONFIG_SUPABASE_SCHEMA
export const supabaseAnonKey = envAnonKey || CONFIG_SUPABASE_ANON_KEY

const urlSource = envUrl ? 'env' : 'gerado'
const schemaSource = envSchema ? 'env' : 'gerado'
const anonKeySource = envAnonKey ? 'env' : 'gerado'

console.info(
  `[Supabase] Conectado a ${supabaseUrl} (origem: ${urlSource}), schema "${supabaseSchema}" (origem: ${schemaSource}, chave: ${anonKeySource})`,
)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: supabaseSchema,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export default supabase
