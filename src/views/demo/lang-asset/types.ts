export type LangCode = 'zh-CN' | 'zh-TW' | 'en';

export type LangAssetEntry = {
  title: string;
  description: string;
  assetId: string | null;
};

export type LangAssetGroupValue = Record<LangCode, LangAssetEntry>;

export type DemoAssetOption = {
  id: string;
  label: string;
  /** 本地脱敏样例，使用内联 SVG data URI，不请求远程图片 */
  preview: string;
};

export type LangAssetFieldError = Record<string, string>;

export const LANG_OPTIONS: Array<{ code: LangCode; label: string }> = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁体中文' },
  { code: 'en', label: 'English' }
];

export function createEmptyLangEntry(): LangAssetEntry {
  return { title: '', description: '', assetId: null };
}

export function createEmptyLangAssetGroup(): LangAssetGroupValue {
  return {
    'zh-CN': createEmptyLangEntry(),
    'zh-TW': createEmptyLangEntry(),
    en: createEmptyLangEntry()
  };
}

export function cloneLangAssetGroup(value: LangAssetGroupValue | null | undefined): LangAssetGroupValue {
  const base = createEmptyLangAssetGroup();
  if (!value || typeof value !== 'object') return base;
  (Object.keys(base) as LangCode[]).forEach(code => {
    const entry = value[code];
    base[code] = {
      title: String(entry?.title ?? ''),
      description: String(entry?.description ?? ''),
      assetId: entry?.assetId == null || entry.assetId === '' ? null : String(entry.assetId)
    };
  });
  return base;
}
