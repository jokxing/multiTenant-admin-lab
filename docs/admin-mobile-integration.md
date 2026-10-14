# 后台与移动端的关联

MultiTenant Admin Lab 与 Campaign Mobile Runtime 是两个独立工程，可分别运行和提供仓库。本文随后台保存，移动端维护自己的接口契约，不依赖工作区外层的共同文档。

## 职责与来源

原业务中本人主导 SaaS 后台前端，另一名前端主要负责移动端；首页和活动排版由后台配置与移动端展示协作完成。当前作品分别提炼编排侧与运行时侧，布局和实现经过重新组织。

本人也支援移动端首页与客服的页面和功能，首页组件字段与移动端同事约定；大部分移动端 UI 组件和主要接口联调由他及后端完成。原首页支持组件开关、排序、素材与跳转，后台发版后移动端刷新请求接口；当前 iframe 为展示预览，不能替代原发布机制。

| 工程 | 展示重点 |
| --- | --- |
| MultiTenant Admin Lab | 首页模块与活动配置编辑、版本记录、配置预览、服务台操作 |
| Campaign Mobile Runtime | 配置驱动首页与活动页面、会员及消息交互、本地 HTTP/SSE Mock、接口契约与异常状态 |

协议关联不意味着共用源码目录、账号系统或真实数据库。后台实时待办页的本地事件模拟，也不是移动端客服 SSE 通道。

客服会话是另一种关联：后台服务台通过移动端 origin 的 /api/support HTTP/SSE 访问同一 Nuxt 进程的内存数据。可以演示接入、双方回复、已读与结束，但不是跨账号生产授权或持久化数据库。后台相关入口及尚未修复的草稿/刷新问题见[客服导览](project-guide.md#双端客服会话台)。

## 配置预览链路

```text
后台首页 / 活动编排
  → iframe 移动端页面
  → PREVIEW_READY 就绪通知
  → postMessage 发送配置
  → 来源与配置校验
  → 移动端渲染预览
```

| 场景 | channel | 更新类型 | 配置 |
| --- | --- | --- | --- |
| 首页 | `mobile-home-composer` | `SCHEMA_UPDATE` | `HomeConfig` |
| 活动 | `campaign-studio` | `CONFIG_UPDATE` | `CampaignConfig` |

子页面以同一 channel 的 `PREVIEW_READY` 通知就绪。后台检查 origin 与 iframe source，移动端检查父窗口、来源白名单及配置结构。预览传递界面配置，不承载登录凭据。

后台发布记录保存在自己的浏览器存储。iframe 展示预览配置，不能把“点击发布”描述成已部署线上移动站；跨端预览也不等于服务端持久化。

## 本地联调

1. 分别启动两端：后台执行 `pnpm dev`；移动端执行 `npm install`，再启动开发服务，默认端口为 4180。
2. 移动端启动前显式开启预览，并把后台实际 origin 加入白名单：

```powershell
$env:NUXT_PUBLIC_PREVIEW_ENABLED = 'true'
$env:NUXT_PUBLIC_PREVIEW_ALLOWED_ORIGINS = 'http://localhost:9527'
npm run dev
```

3. 后台默认移动入口为 `http://localhost:4180/home`。地址不同时设置 `VITE_MOBILE_RUNTIME_URL` 并重启后台服务。
4. 打开“移动首页编排”或“营销活动编排”，编辑配置并查看 iframe。失败时核对服务地址、来源白名单和配置校验反馈。

`localhost` 与 `127.0.0.1` 是不同 origin，端口变化也会改变 origin，须按实际地址配置。移动端预览默认关闭，URL 参数不能扩大信任来源。

## 代码入口与验证范围

- [首页编排](../src/views/demo/home-composer/index.vue)：模块配置、快照和预览消息。
- [活动编排](../src/views/demo/campaign-studio/index.vue)：活动配置、发布版本和预览消息。
- 移动端 `docs/api-contract.md`：HTTP/SSE、预览协议、配置限制与模拟场景。
- 移动端 `shared/contracts/preview.ts`：预览来源及配置校验。

说明依据两端实现与契约核对。2026-10-09 的后台浏览器回归覆盖配置器、排序和素材组，没有重新验收整套双端预览或客服联调。真实后端、部署及生产权限须另行实现和验收。
