import { PAGE_CONFIG_STORAGE_KEYS } from '../page-config/constants';
import { cloneLangAssetGroup, type LangAssetGroupValue } from './types';

export type LangAssetSaveResult = { ok: true; value: LangAssetGroupValue } | { ok: false; message: string };

export function loadLangAssetForm(scope: string): Record<string, LangAssetGroupValue> {
  try {
    const stored = JSON.parse(localStorage.getItem(PAGE_CONFIG_STORAGE_KEYS.langAssetDraft) || '{}');
    return stored.forms?.[scope] || {};
  } catch { return {}; }
}

/** 同一页的多个素材组一次保存，按页面和字段隔离，失败时整个表单不落库。 */
export async function saveLangAssetForm(scope: string, values: Record<string, LangAssetGroupValue>) {
  const snapshot = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, cloneLangAssetGroup(value)]));
  await new Promise(resolve => setTimeout(resolve, 380));
  try {
    if (getLangAssetFailNext()) {
      setLangAssetFailNext(false);
      return { ok: false as const, message: 'Mock 保存失败：素材组服务暂不可用，已保留当前输入，可重试。' };
    }
    const stored = JSON.parse(localStorage.getItem(PAGE_CONFIG_STORAGE_KEYS.langAssetDraft) || '{}');
    localStorage.setItem(PAGE_CONFIG_STORAGE_KEYS.langAssetDraft, JSON.stringify({
      forms: { ...stored.forms, [scope]: snapshot }
    }));
    return { ok: true as const, value: snapshot };
  } catch {
    return { ok: false as const, message: '本地保存失败：存储不可用或草稿损坏，已保留当前输入。' };
  }
}

export function getLangAssetFailNext(): boolean {
  return localStorage.getItem(`${PAGE_CONFIG_STORAGE_KEYS.langAssetDraft}_fail_next`) === '1';
}

export function setLangAssetFailNext(enabled: boolean) {
  const key = `${PAGE_CONFIG_STORAGE_KEYS.langAssetDraft}_fail_next`;
  if (enabled) localStorage.setItem(key, '1');
  else localStorage.removeItem(key);
}

export function loadLangAssetDraft(): LangAssetGroupValue | null {
  try {
    const raw = localStorage.getItem(PAGE_CONFIG_STORAGE_KEYS.langAssetDraft);
    if (!raw) return null;
    return cloneLangAssetGroup(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearLangAssetDraft() {
  localStorage.removeItem(PAGE_CONFIG_STORAGE_KEYS.langAssetDraft);
  setLangAssetFailNext(false);
}

/** 本地异步 Mock 保存；失败时不落库，调用方保留输入。 */
export async function saveLangAssetDraft(
  value: LangAssetGroupValue,
  options?: { delayMs?: number }
): Promise<LangAssetSaveResult> {
  const delayMs = options?.delayMs ?? 380;
  const cloned = cloneLangAssetGroup(value);
  await new Promise(resolve => setTimeout(resolve, delayMs));

  if (getLangAssetFailNext()) {
    setLangAssetFailNext(false);
    return { ok: false, message: 'Mock 保存失败：素材组服务暂不可用，已保留当前输入，可重试。' };
  }

  try {
    localStorage.setItem(PAGE_CONFIG_STORAGE_KEYS.langAssetDraft, JSON.stringify(cloned));
  } catch {
    return { ok: false, message: '本地保存失败：存储空间不足或不可用，已保留当前输入。' };
  }
  return { ok: true, value: cloned };
}
