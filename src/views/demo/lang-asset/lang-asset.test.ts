import assert from 'node:assert/strict';
import { createEmptyLangAssetGroup, cloneLangAssetGroup } from './types';
import { validateLangAssetGroup } from './validateLangAssetGroup';
import { assertValidFormSchema } from '../page-config/formSchemaGuard';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem(key: string) {
      return memory.has(key) ? memory.get(key)! : null;
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    },
    removeItem(key: string) {
      memory.delete(key);
    }
  },
  configurable: true
});

const { saveLangAssetDraft, loadLangAssetDraft, setLangAssetFailNext, saveLangAssetForm, loadLangAssetForm } = await import('./langAssetStore');

function testValidationAndLanguageIsolation() {
  const value = createEmptyLangAssetGroup();
  const emptyErrors = validateLangAssetGroup(value, 'zh-CN');
  assert.equal(emptyErrors['zh-CN.title'], '简体中文标题必填');

  value['zh-CN'].title = '春季主题';
  value.en.description = 'Spring only desc';
  const partialErrors = validateLangAssetGroup(value, 'zh-CN');
  assert.equal(partialErrors['en.title'], '已填写该语言内容时，标题必填');
  assert.equal(partialErrors['zh-CN.title'], undefined);
  assert.deepEqual(validateLangAssetGroup(value, 'zh-CN', ['zh-CN']), {});

  // 切换语言后数据应保留（克隆语义）
  value['zh-TW'].title = '春季主題';
  const cloned = cloneLangAssetGroup(value);
  cloned.en.title = 'Spring';
  assert.equal(value.en.title, '');
  assert.equal(cloned['zh-TW'].title, '春季主題');
}

async function testSaveSuccessRefillAndFailureKeepInput() {
  memory.clear();
  const value = createEmptyLangAssetGroup();
  value['zh-CN'].title = '首页素材';
  value['zh-CN'].assetId = 'asset_banner_spring';
  value.en.title = 'Home asset';

  const ok = await saveLangAssetDraft(value, { delayMs: 0 });
  assert.equal(ok.ok, true);
  const loaded = loadLangAssetDraft();
  assert.equal(loaded?.['zh-CN'].title, '首页素材');
  assert.equal(loaded?.en.title, 'Home asset');

  setLangAssetFailNext(true);
  const keep = cloneLangAssetGroup(value);
  keep['zh-CN'].title = '未落库的修改';
  const failed = await saveLangAssetDraft(keep, { delayMs: 0 });
  assert.equal(failed.ok, false);
  // 失败不写库，调用方保留输入；本地草稿仍是上一次成功值
  assert.equal(loadLangAssetDraft()?.['zh-CN'].title, '首页素材');
  assert.equal(keep['zh-CN'].title, '未落库的修改');
}

function testInvalidJsonRejected() {
  assert.throws(() => assertValidFormSchema([{ field: 'x', label: 'X', type: 'input', pattern: '[' }]), /正则表达式非法/);
  assert.throws(() => assertValidFormSchema([{ field: 'x', label: 'X', type: 'lang-asset-group', languages: ['en'] }]), /包含主语言/);
  assert.throws(() => assertValidFormSchema({ field: 'x' }), /必须是数组/);
  assert.throws(
    () => assertValidFormSchema([{ field: 'a', label: 'A', type: 'unknown-type' }]),
    /未知组件类型/
  );
  assert.throws(
    () =>
      assertValidFormSchema([
        { field: 'materialGroup', label: '素材', type: 'lang-asset-group', primaryLang: 'fr' }
      ]),
    /primaryLang 非法/
  );

  const valid = assertValidFormSchema([
    {
      field: 'materialGroup',
      label: '多语言素材组',
      type: 'lang-asset-group',
      primaryLang: 'zh-CN',
      languages: ['zh-CN', 'zh-TW', 'en']
    }
  ]);
  assert.equal(valid[0]?.type, 'lang-asset-group');
}

testValidationAndLanguageIsolation();
await testSaveSuccessRefillAndFailureKeepInput();
testInvalidJsonRejected();

memory.clear();
const first = createEmptyLangAssetGroup();
first['zh-CN'].title = '第一组';
const second = createEmptyLangAssetGroup();
second['zh-CN'].title = '第二组';
const pending = saveLangAssetForm('page-a', { first, second });
first['zh-CN'].title = '提交后修改';
assert.equal((await pending).ok, true);
assert.equal(loadLangAssetForm('page-a').first['zh-CN'].title, '第一组');
assert.equal(loadLangAssetForm('page-a').second['zh-CN'].title, '第二组');
await saveLangAssetForm('page-b', { first });
assert.equal(loadLangAssetForm('page-a').first['zh-CN'].title, '第一组');
setLangAssetFailNext(true);
assert.equal((await saveLangAssetForm('page-a', { first, second })).ok, false);
assert.equal(loadLangAssetForm('page-a').first['zh-CN'].title, '第一组');
console.log('lang-asset tests passed');
