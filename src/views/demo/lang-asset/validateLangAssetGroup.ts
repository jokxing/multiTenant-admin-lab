import { LANG_OPTIONS, cloneLangAssetGroup, type LangAssetFieldError, type LangAssetGroupValue, type LangCode } from './types';
import { findDemoAsset } from './demoAssets';

function isEntryFilled(entry: { title: string; description: string; assetId: string | null }) {
  return Boolean(entry.title.trim() || entry.description.trim() || entry.assetId);
}

/**
 * 主语言标题必填；其他语言可选，一旦填写则按约定校验，错误定位到 language.field。
 */
export function validateLangAssetGroup(
  raw: LangAssetGroupValue | null | undefined,
  primaryLang: LangCode = 'zh-CN',
  languages: LangCode[] = ['zh-CN', 'zh-TW', 'en']
): LangAssetFieldError {
  const value = cloneLangAssetGroup(raw);
  const errors: LangAssetFieldError = {};
  const primary = value[primaryLang];

  if (!primary.title.trim()) {
    errors[`${primaryLang}.title`] = `${LANG_OPTIONS.find(item => item.code === primaryLang)?.label || primaryLang}标题必填`;
  }

  languages.forEach(code => {
    const entry = value[code];
    const filled = isEntryFilled(entry);
    const isPrimary = code === primaryLang;
    if (!isPrimary && !filled) return;

    if (!isPrimary && filled && !entry.title.trim()) {
      errors[`${code}.title`] = '已填写该语言内容时，标题必填';
    }

    if (entry.description.trim().length > 120) {
      errors[`${code}.description`] = '说明不能超过 120 字';
    }

    if (entry.assetId && !findDemoAsset(entry.assetId)) {
      errors[`${code}.assetId`] = '请选择有效的本地素材样例';
    }
  });

  return errors;
}
