import { computed, reactive, ref, watch } from 'vue';
import { createEmptyLangAssetGroup, type LangAssetGroupValue } from '../../lang-asset/types';
import { validateLangAssetGroup } from '../../lang-asset/validateLangAssetGroup';
import {
  getLangAssetFailNext,
  loadLangAssetForm,
  saveLangAssetForm,
  setLangAssetFailNext
} from '../../lang-asset/langAssetStore';
import { componentOptions, defaultFormSchema } from '../constants';
import type { FieldType, FormField } from '../types';

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createFieldValue(type: FieldType) {
  if (type === 'switch') return false;
  if (type === 'lang-asset-group') return createEmptyLangAssetGroup();
  return null;
}

export function useFormConfig(pageScope: () => string = () => 'preview') {
  const formSchema = ref<FormField[]>(cloneJson(defaultFormSchema));
  const formJson = ref(JSON.stringify(formSchema.value, null, 2));
  const selectedIndex = ref(0);
  const ruleModalVisible = ref(false);
  const formModel = reactive<Record<string, any>>({
    name: '夏季增长活动',
    scene: 'signup',
    enabled: true,
    rewardAmount: 88
  });
  const formErrors = ref<Record<string, string>>({});
  const formSubmitting = ref(false);
  const formSaveError = ref('');
  const failNextSave = ref(getLangAssetFailNext());
  const typeOptions = componentOptions.map(item => ({ label: item.label, value: item.type }));
  const selectedField = computed(() => formSchema.value[selectedIndex.value]);
  const conditionFieldOptions = computed(() =>
    formSchema.value
      .filter((_, index) => index !== selectedIndex.value)
      .map(field => ({ label: field.label, value: field.field }))
  );
  const visibleFields = computed(() =>
    formSchema.value.filter(
      field => !field.visibleWhen?.field || String(formModel[field.visibleWhen.field]) === field.visibleWhen.equals
    )
  );
  const hasLangAssetGroup = computed(() => formSchema.value.some(field => field.type === 'lang-asset-group'));

  watch(
    formSchema,
    value => {
      formJson.value = JSON.stringify(value, null, 2);
    },
    { deep: true }
  );

  function ensureFormModel(fields: FormField[]) {
    Object.keys(formModel).forEach(key => {
      if (!fields.some(field => field.field === key) && !['name', 'scene', 'enabled', 'rewardAmount'].includes(key)) {
        delete formModel[key];
      }
    });
    fields.forEach(field => {
      if (!(field.field in formModel)) formModel[field.field] = createFieldValue(field.type);
    });
  }

  function hydrateLangAssetDraft() {
    const drafts = loadLangAssetForm(pageScope());
    formSchema.value.filter(field => field.type === 'lang-asset-group').forEach(field => {
      formModel[field.field] = cloneJson(drafts[field.field] || createEmptyLangAssetGroup());
    });
  }

  function setFormConfig(fields: FormField[]) {
    formSchema.value = cloneJson(fields);
    selectedIndex.value = 0;
    ensureFormModel(formSchema.value);
    formErrors.value = {};
    formSaveError.value = '';
    hydrateLangAssetDraft();
  }

  function resetFormSchema() {
    setFormConfig(defaultFormSchema);
  }

  function addField(type: FieldType) {
    const meta = componentOptions.find(item => item.type === type)!;
    const field = `field_${Date.now().toString().slice(-5)}`;
    const next: FormField = {
      field,
      label: meta.label,
      type,
      span: type === 'lang-asset-group' ? 2 : 1,
      options: type === 'select' ? [{ label: '选项一', value: 'option_1' }] : undefined,
      primaryLang: type === 'lang-asset-group' ? 'zh-CN' : undefined,
      languages: type === 'lang-asset-group' ? ['zh-CN', 'zh-TW', 'en'] : undefined
    };
    formSchema.value.push(next);
    formModel[field] = createFieldValue(type);
    selectedIndex.value = formSchema.value.length - 1;
  }

  function removeField(index: number) {
    if (formSchema.value.length === 1) return window.$message?.warning('至少保留一个字段');
    const [removed] = formSchema.value.splice(index, 1);
    if (removed) delete formModel[removed.field];
    selectedIndex.value = Math.min(selectedIndex.value, formSchema.value.length - 1);
  }

  function moveField(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= formSchema.value.length) return;
    const [field] = formSchema.value.splice(index, 1);
    formSchema.value.splice(target, 0, field);
    selectedIndex.value = target;
  }

  function updateOptions(text: string) {
    if (!selectedField.value) return;
    selectedField.value.options = text
      .split('\n')
      .filter(Boolean)
      .map((label, index) => ({ label, value: `option_${index + 1}` }));
  }

  function openRuleModal() {
    if (!selectedField.value) return;
    selectedField.value.visibleWhen ||= { field: '', equals: '' };
    ruleModalVisible.value = true;
  }

  function clearCondition() {
    if (selectedField.value) selectedField.value.visibleWhen = undefined;
    ruleModalVisible.value = false;
  }

  function saveRules() {
    if (selectedField.value?.visibleWhen && !selectedField.value.visibleWhen.field) {
      selectedField.value.visibleWhen = undefined;
    }
    ruleModalVisible.value = false;
  }

  function setFailNext(enabled: boolean) {
    failNextSave.value = enabled;
    setLangAssetFailNext(enabled);
  }

  function collectErrors() {
    const errors: Record<string, string> = {};
    visibleFields.value.forEach(field => {
      const value = formModel[field.field];
      if (field.type === 'lang-asset-group') {
        const groupErrors = validateLangAssetGroup(value as LangAssetGroupValue, field.primaryLang || 'zh-CN', field.languages);
        Object.entries(groupErrors).forEach(([key, message]) => { errors[`${field.field}.${key}`] = message; });
        return;
      }
      if (field.required && (value === '' || value == null)) {
        errors[field.field] = field.message || `${field.label}必填`;
      }
      if (field.type === 'number' && value != null) {
        if (field.min != null && value < field.min) errors[field.field] = `${field.label}不能小于 ${field.min}`;
        if (field.max != null && value > field.max) errors[field.field] = `${field.label}不能大于 ${field.max}`;
      }
      if (field.pattern) {
        try {
          if (value && !new RegExp(field.pattern).test(String(value))) errors[field.field] = field.message || `${field.label}格式不正确`;
        } catch { errors[field.field] = `${field.label}的正则表达式非法，请修正配置`; }
      }
    });
    return errors;
  }

  async function submitForm() {
    if (formSubmitting.value) {
      window.$message?.warning('表单提交中，请勿重复操作');
      return false;
    }

    const errors = collectErrors();
    formErrors.value = errors;
    formSaveError.value = '';
    if (Object.keys(errors).length > 0) {
      window.$message?.warning('请先修正表单校验错误');
      return false;
    }

    const langField = visibleFields.value.find(field => field.type === 'lang-asset-group');
    if (!langField) {
      window.$message?.success('表单校验通过，Schema 已生成');
      return true;
    }

    formSubmitting.value = true;
    const scope = pageScope();
    try {
      const result = await saveLangAssetForm(scope, Object.fromEntries(
        visibleFields.value.filter(field => field.type === 'lang-asset-group').map(field => [field.field, formModel[field.field]])
      ));
      if (scope !== pageScope()) return result.ok;
      failNextSave.value = getLangAssetFailNext();
      if (!result.ok) {
        formSaveError.value = result.message;
        window.$message?.error(result.message);
        return false;
      }
      Object.assign(formModel, result.value);
      window.$message?.success('多语言素材组已保存，再次打开可回填');
      return true;
    } finally {
      formSubmitting.value = false;
    }
  }

  return {
    conditionFieldOptions,
    failNextSave,
    formErrors,
    formJson,
    formModel,
    formSaveError,
    formSchema,
    formSubmitting,
    hasLangAssetGroup,
    ruleModalVisible,
    selectedField,
    selectedIndex,
    typeOptions,
    visibleFields,
    addField,
    clearCondition,
    moveField,
    openRuleModal,
    removeField,
    resetFormSchema,
    saveRules,
    setFailNext,
    setFormConfig,
    submitForm,
    updateOptions
  };
}
