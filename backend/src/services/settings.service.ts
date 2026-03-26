/**
 * settings.service.ts
 *
 * Reads all admin_settings (including API keys) from PostgreSQL.
 * Uses a short in-memory cache (60s) so the DB isn't hit on every cron tick.
 * The admin can update keys via the Admin Panel and they take effect within 60s
 * — no code change, no server restart needed.
 */

import { db } from '../config/database';
import { config } from '../config/env';

interface SettingsCache {
  data: Record<string, string>;
  fetchedAt: number;
}

let cache: SettingsCache | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

/** Returns all settings, merging DB values over .env defaults. */
export async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const result = await db.query('SELECT key, value FROM admin_settings');
    const dbSettings: Record<string, string> = {};
    for (const row of result.rows) {
      dbSettings[row.key] = row.value;
    }

    // Merge: DB values override .env defaults (so .env acts as fallback)
    const merged: Record<string, string> = {
      // .env fallbacks
      tron_api_key:          config.TRON_API_KEY,
      tron_api_url:          config.TRON_API_URL,
      company_wallet_trc20:  config.TRON_COMPANY_WALLET,
      infura_api_key:        config.INFURA_API_KEY,
      company_wallet_erc20:  config.ETH_COMPANY_WALLET,
      sendgrid_api_key:      config.SENDGRID_API_KEY,
      email_from:            config.EMAIL_FROM,
      // DB values win (override env)
      ...dbSettings,
    };

    cache = { data: merged, fetchedAt: now };
    return merged;
  } catch (e) {
    console.error('settings.service: DB read failed, using cache/env', e);
    return cache?.data ?? {};
  }
}

/** Force-invalidate cache (called after admin saves a setting). */
export function invalidateCache() {
  cache = null;
}

/** Convenience: get one key. */
export async function getSetting(key: string, fallback = ''): Promise<string> {
  const s = await getSettings();
  return s[key] || fallback;
}
