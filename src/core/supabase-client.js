// @ts-check
import { readJson, writeJson } from './storage.js';

const CONFIG_KEY = 'pt_workspace_supabase_cfg_v2';

export function readSupabaseConfig() {
  const saved = readJson(CONFIG_KEY, {});
  const url = String(saved.url || window.__WORKSPACE_SUPABASE_URL__ || '').replace(/\/+$/, '');
  const key = String(saved.key || window.__WORKSPACE_SUPABASE_KEY__ || '');
  if (!url || !key) return null;
  writeJson(CONFIG_KEY, { ...saved, url, key, source: saved.source || 'bundled-pro' });
  return { url, key };
}

export function getSupabaseClient() {
  try {
    const stateClient = window.appStore && window.appStore.getState ? window.appStore.getState().sb : null;
    if (stateClient) return stateClient;
  } catch {}
  if (window.sb) return window.sb;
  if (!window.supabase || !window.supabase.createClient) throw new Error('Supabase SDK is not loaded');
  const config = readSupabaseConfig();
  if (!config) throw new Error('Supabase configuration is missing');
  return window.supabase.createClient(config.url, config.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
}
