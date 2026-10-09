# 实现与验证记录：列表排序及多语言素材组

更新：2026-10-09。本记录覆盖列表排序、多语言素材组及相关配置器交互，不代表全工程或双端联调的完整验收。

## 浏览器复盘与修复

- 弹窗无法关闭、JSON 切换后高度塌陷：`useTableRowDrag` 在 `tbody` 尚未挂载时初始化 Sortable，抛出的异常中断 Vue 更新。改为关闭自动启动，DOM 就绪后绑定，目标替换时销毁重绑，卸载后不再延迟初始化；筛选禁用状态不再被拖拽结束强行解除。修复后取消关闭和连续三次 JSON/可视化切换通过浏览器验证。
- 新建模板：选多语言素材组时默认切到表单页面，选推荐列表时切到列表页面，避免一直沿用“列表 + 表单”。
- 素材组：按页面、字段隔离草稿，同一表单多个素材组一次保存；错误带字段前缀，避免组间串错；校验自动定位到出错语言，只校验配置启用的语言。
- 非法 JSON：应用前拒绝非法类型、语言码、缺失主语言和非法正则；失败不重新初始化预览，保留未保存输入。发布前也检查表单结构。
- 异步保存：提交时取快照，页面切换后不把旧请求结果回填到新页面；本地存储失败返回明确错误并保留输入。数字范围和正则校验同步到表单运行时。
- 素材布局：“已选”提示与卡片网格置于同一纵向容器，显示在网格下方；Edge 浏览器已验证提示位置及网格宽度。

## 两阶段实现范围

### 第一阶段：配置驱动列表排序（内容推荐列表）

- 新增列类型 `sortable`，经页面配置启用，接入配置器预览与 Schema 运行时。
- 统一动作入口：`drag-sort` / `sortTop` / `sort-up` / `sort-down`。
- 交互：拖拽（复用已有 `vue-draggable-plus`）、置顶、上移、下移。
- 稳定实体 ID（如 `cr_1001`），不以显示索引作为业务身份。
- 首项/末项/提交中禁用；有筛选时禁用排序并提示原因；完整列表内排序（无分页演示数据）。
- 本地异步 Mock 保存顺序；可控“下次保存失败”，失败回滚原顺序并可重试；提交锁防止连续操作错乱。

### 第二阶段：配置驱动复杂表单（多语言素材组）

- 新增字段类型 `lang-asset-group`，设计器组件库 / JSON / 运行时同一入口。
- 可复用组件 `LangAssetGroupField`：简体/繁体/英文，各含标题、说明、本地素材选择。
- 素材为本地 SVG data URI 样例，无上传、无远程图片。
- v-model / events 传递克隆值，不直接改写外部共享对象。
- 主语言标题必填；其他语言可选，填写后按约定校验；错误定位到 `language.field`。
- Mock 保存与回填；保存失败保留输入；非法 JSON 配置拒绝应用并保留原有效配置。

## 修改文件与原因

| 路径 | 原因 |
| --- | --- |
| `src/views/demo/list-sort/*` | 排序纯函数、Mock 存储、统一动作、拖拽绑定、排序列 UI、内容推荐 Schema、验证 |
| `src/views/demo/lang-asset/*` | 多语言素材组类型、样例素材、校验、Mock 存储、可复用组件、验证 |
| `src/views/demo/shared.ts` | `PageColumn.type` 增加 `sortable`；`buildColumns` 渲染排序列；角色权限补充 |
| `src/views/demo/page-config/types.ts` | `FieldType` 增加 `lang-asset-group`；表单字段扩展 |
| `src/views/demo/page-config/constants.ts` | 存储键、模板选项、组件库、默认素材组 Schema |
| `src/views/demo/page-config/formSchemaGuard.ts` | JSON 表单结构运行时校验 |
| `src/views/demo/page-config/composables/useTableConfig.ts` | 排序列数据源、筛选禁用、拖拽落库接入 |
| `src/views/demo/page-config/composables/useFormConfig.ts` | 素材组初始值、校验、Mock 保存 |
| `src/views/demo/page-config/components/*` | 设计器列类型、表单预览渲染、排序提示 |
| `src/views/demo/page-config/index.vue` | 两个模板、非法 JSON 拒绝应用、预览 props |
| `src/views/demo/runtime/[pageKey].vue` | 排序运行时 + `pageType: form` 表单运行时 |
| `README.md` | 项目阅读导航、能力说明与验证命令 |
| `package.json` | 增加 `test:demo` |
| `docs/implementation-review.md` | 本复盘 |

## 配置 → 组件 → 动作 → Mock 保存入口

### 列表排序

```text
页面模板 content-recommend / 列 type=sortable
        ↓ 发布 mtal_published_config
runtime/[pageKey].vue 或 TableRuntimePreview
        ↓ SortableColumnCell / useTableRowDrag
useListSortActions.dispatchSortAction
        ↓ applySortAction（按实体 ID）
saveContentRecommendOrder → localStorage mtal_content_recommend_order
```

关键文件：

- 配置：`list-sort/contentRecommendSchema.ts`，`page-config/index.vue` → `createContentRecommendTemplate`
- 组件：`list-sort/SortableColumnCell.vue`
- 动作：`list-sort/useListSortActions.ts`，`list-sort/reorder.ts`
- Mock：`list-sort/contentRecommendStore.ts`

### 多语言素材组

```text
字段 type=lang-asset-group（设计器 / JSON / 模板）
        ↓ FormRuntimePreview 或 runtime form 分支
LangAssetGroupField（v-model 克隆）
        ↓ validateLangAssetGroup
saveLangAssetForm（页面 / 字段隔离）→ localStorage mtal_lang_asset_draft
```

关键文件：

- 配置：`constants.ts` → `defaultLangAssetFormSchema`，`formSchemaGuard.ts`
- 组件：`lang-asset/LangAssetGroupField.vue`
- 校验/保存：`validateLangAssetGroup.ts`，`langAssetStore.ts`
- 设计器/预览：`useFormConfig.ts`，`FormRuntimePreview.vue`
- 运行时：`runtime/[pageKey].vue`（`pageType === 'form'`）

## 验证命令及结果

| 命令 | 结果 |
| --- | --- |
| `pnpm test:demo` | 通过（排序边界/失败回滚/重复提交；素材组校验/回填/失败保留/非法 JSON） |
| `pnpm typecheck` | 通过 |
| `pnpm build` | 通过 |
| 本地 Edge / Playwright 浏览器回归 | 弹窗取消关闭、JSON 重复切换、新建素材组模板与发布、非法 JSON 保留输入、按钮排序与真实鼠标拖拽、刷新回填、失败回滚、筛选禁用、语言校验定位及保存失败保留输入通过；无未处理浏览器异常 |

浏览器脚本：`scripts/review-demo-browser.cjs`。需本机安装 Edge 和 Playwright；`PLAYWRIGHT_MODULE` 可指定 Playwright 包位置，`DEMO_URL` 可指定本地开发服务地址。每次使用独立浏览器上下文，不改日常浏览器的存储。

## 已知限制与未验证项

- 浏览器回归已执行；仍建议展示前在自己的窗口中走一次上述路线。没有验证触屏拖拽、所有屏幕尺寸和多浏览器兼容性。
- 素材组草稿改为按页面、字段保存，早期单组草稿结构不会自动迁移，可重新填写后保存。
- 若本地已有旧的 `mtal_published_config`，不会自动注入新模板页；可用首页「重置 Demo」或配置器「按模板新建」。
- 排序仅覆盖完整列表；不支持跨页、子列表。
- 多语言素材组不扩展为完整 i18n 平台、富文本或文件管理。
- 前端权限隐藏 ≠ 真实接口授权或租户隔离（既有声明不变）。
- 配置发布/版本回滚语义未改。

## 对已有功能的影响

- 审核列表、运营模板、权限、发布回滚、消息演示逻辑保持原语义。
- 运行时增加：存在 `sortable` 列时改用内容推荐 Mock 数据；`pageType === 'form'` 时渲染表单而非列表。
- `normalizePageConfig` 允许空 `table`/`form`/`search` 数组，避免表单页被回填默认审核列。
- 「重置 Demo」会清理新增的排序顺序与素材组草稿键（已并入 `PAGE_CONFIG_STORAGE_KEYS`）。

## 两个案例体验路线

### 案例 A：内容推荐列表排序

1. 打开 `/demo/page-config`；若无「内容推荐列表」，用模板新建或先「重置 Demo」。
2. 确认表格含「排序」列（`type: sortable`），发布配置。
3. 进入 `/demo/runtime/content-recommend`。
4. 使用拖拽 / 置顶 / 上移 / 下移；刷新页面确认顺序恢复。
5. 输入筛选条件 → 排序控件禁用并看到原因提示；清空筛选后恢复。
6. 打开「下次保存失败」→ 再排序 → 看到错误、顺序回滚 → 关闭开关后重试成功。
7. 提交中再次点击应提示勿连续操作。

### 案例 B：多语言素材组表单

1. 配置器新建/打开「多语言素材组表单」模板，确认字段类型为 `lang-asset-group`，发布。
2. 进入 `/demo/runtime/lang-asset-form`（或在配置器表单预览区操作）。
3. 填写简体中文标题与素材；切换到英文/繁体输入，再切回确认内容保留。
4. 清空主语言标题提交 → 错误定位到简体标题；给英文只填说明不填标题 → 英文标题报错。
5. 正常保存后刷新/再进入 → 回填成功。
6. 打开「下次保存失败」→ 提交 → 明确错误且输入保留 → 重试成功。
7. 在 JSON 模式写入非法 `type` 或非法 `primaryLang` → 应用失败并保留原有效配置。
