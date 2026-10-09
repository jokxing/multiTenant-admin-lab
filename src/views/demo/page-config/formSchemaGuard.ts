import { FORM_FIELD_TYPES, type FormField } from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** 运行时结构校验：非法 JSON 配置在应用前拒绝，不只依赖 TypeScript。 */
export function assertValidFormSchema(value: unknown): FormField[] {
  if (!Array.isArray(value)) throw new Error('表单配置必须是数组');

  const fields = value.map((item, index) => {
    if (!isPlainObject(item)) throw new Error(`表单字段[${index}]必须是对象`);
    if (typeof item.field !== 'string' || !item.field.trim()) {
      throw new Error(`表单字段[${index}]缺少有效 field`);
    }
    if (typeof item.label !== 'string' || !item.label.trim()) {
      throw new Error(`表单字段[${index}]缺少有效 label`);
    }
    if (typeof item.type !== 'string' || !FORM_FIELD_TYPES.includes(item.type as FormField['type'])) {
      throw new Error(`表单字段[${index}]存在未知组件类型：${String(item.type)}`);
    }

    if (item.pattern != null) {
      if (typeof item.pattern !== 'string') throw new Error(`字段 ${item.field} 的 pattern 必须是字符串`);
      try { new RegExp(item.pattern); } catch { throw new Error(`字段 ${item.field} 的正则表达式非法`); }
    }

    if (item.type === 'lang-asset-group') {
      if (item.primaryLang != null && !['zh-CN', 'zh-TW', 'en'].includes(String(item.primaryLang))) {
        throw new Error(`字段 ${item.field} 的 primaryLang 非法`);
      }
      if (item.languages != null) {
        if (!Array.isArray(item.languages) || item.languages.length === 0) {
          throw new Error(`字段 ${item.field} 的 languages 必须是非空数组`);
        }
        if (item.languages.some(code => typeof code !== 'string' || !['zh-CN', 'zh-TW', 'en'].includes(code))) {
          throw new Error(`字段 ${item.field} 的 languages 含非法语言码`);
        }
        if (new Set(item.languages).size !== item.languages.length) throw new Error(`字段 ${item.field} 的语言码重复`);
        if (!item.languages.includes(item.primaryLang ?? 'zh-CN')) throw new Error(`字段 ${item.field} 的 languages 必须包含主语言`);
      }
    }

    return item as FormField;
  });

  const fieldNames = fields.map(field => field.field);
  const duplicated = fieldNames.find((name, index) => fieldNames.indexOf(name) !== index);
  if (duplicated) throw new Error(`表单字段名重复：${duplicated}`);

  return fields;
}
