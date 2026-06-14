# i-live-here

[English](./README.md) · **简体中文**

伦敦地图打标 MVP — 一个 web app,可以在地图上标注「我在这里做的事情」和「想去做的事情」。

## 技术栈

- **Vite + React 18 + TypeScript**(ESM,除了 `vite.config.ts` 没有额外打包配置)
- **react-map-gl**(Mapbox GL v3)做底图,默认样式 `mapbox://styles/mapbox/standard`
- **@supabase/supabase-js** 接可选的云端后端(Postgres + Storage + Realtime)
- 没有状态管理库 — 用本地 React state 加一个自定义 hook(`usePins`)
- 没有 CSS 框架 — 每个组件独立的纯 CSS

数据层 `src/services/pinService.ts` 在同一个接口下有两种实现:

- **本地模式**(默认):pins / 图片 / 点赞 全在浏览器 localStorage,图片以 data URL 内嵌。
- **Supabase 模式**(`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 都填了时自动启用):pins 存 Postgres,图片存公开 Storage bucket,列表通过 Realtime 通道实时更新。

## 启动

```bash
npm install

cp .env.example .env.local
# 编辑 .env.local,至少填 VITE_MAPBOX_TOKEN
# Supabase 的两个变量留空 → 本地模式;都填上 → Supabase 模式

npm run dev      # Vite 开发服务器在 http://localhost:5173
```

### 脚本

| 脚本 | 作用 |
|---|---|
| `npm run dev` | 带 HMR 的 Vite 开发服务器 |
| `npm run build` | `tsc -b` 然后 `vite build` → `dist/` |
| `npm run preview` | 本地预览生产构建 |
| `npm run typecheck` | 项目引用类型检查,不输出文件 |

### 环境变量

所有变量都用 `VITE_*` 前缀,Vite 才会把它们注入到客户端 bundle。

| 变量 | 是否必填 | 用途 |
|---|---|---|
| `VITE_MAPBOX_TOKEN` | 必填 | Mapbox 公开访问 token(`pk.*`)。在 Mapbox dashboard 用 URL 白名单锁一下。 |
| `VITE_SUPABASE_URL` | 可选 | Supabase 项目 URL。留空 → 本地模式。 |
| `VITE_SUPABASE_ANON_KEY` | 可选 | Supabase anon public key。必须和 URL 配对填。 |

### 浏览器要求

用到了 `createImageBitmap`(带 `imageOrientation: 'from-image'`)、`crypto.randomUUID`、Geolocation API,以及现代浏览器才支持的 CSS 特性 — 现代 Chrome / Safari / Firefox / Edge 都可以。没有针对 IE / 旧 Safari 的回退。

## 接 Supabase(多人共享 + 持久化)

1. **建项目** — 在 https://supabase.com/dashboard 新建项目,等几分钟启动。
2. **跑 SQL** — Studio 左侧 SQL Editor → New query → 粘 `supabase/setup.sql` 内容 → Run。脚本是幂等的,可以重复执行。它会建 `pins` 表、加 RLS、建 `toggle_pin_like` 和 `delete_pin` RPC、建 `pin-images` storage bucket 和它的策略,并把表加入 `supabase_realtime` publication。
3. **拿凭据** — Project Settings → API:
   - `Project URL` → `.env.local` 的 `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
4. 重启 `npm run dev`。控制台看到 realtime channel 订阅日志就成了。
5. 部署到 Vercel(或其他平台)时,把这两个变量也加到对应的 Environment Variables 里。

### Supabase 模式下的安全模型

- **匿名读写**:任何访客都能列出所有 pin、新建 pin、点赞。没有身份验证。
- **读取时排除 `owner_token`**:用列级 `GRANT SELECT (...)` 跳过了 token 列,即便 RLS 允许 row 上的 `select`,anon client 也读不到别人的 token。
- **删除受 `owner_token` 保护**:创建 pin 时客户端生成一个随机 token,以 pin id 为 key 存在 localStorage,同时写到那一行。删除走 `delete_pin(id, token)` RPC,只有 token 匹配才删。换设备 / 清缓存 → 失去删除权,但 pin 还在。
- **客户端不能直接 `update` / `delete` 表** — 没有任何策略授权这两类操作。所有变更都通过 RPC。
- **点赞走 `toggle_pin_like(id, delta)`** — 服务端用 `>= 0` 截断,数值刷不到负数。
- **图片 bucket** `pin-images` 公开可读(用 `getPublicUrl` 需要)。上传只允许写到这个桶。还有一条 delete 策略允许任何人删除「孤儿」图片(不再被任何 pin 引用的),这撑起了 `supabasePinService` 删除后的清理逻辑 — 但删不掉还在用的图。
- 没有真正的身份系统,所以仍然可被刷垃圾。要严肃上线建议加 Supabase Auth(哪怕只是匿名 session) + 简单 rate limit。

## 操作

- 拖拽 / 双指缩放地图。
- 首次打开时会请求地理位置授权,定位到你。拒绝授权则退回 UCL 的 **Jeremy Bentham Room**(`-0.13396, 51.5246`,zoom 16.4) — 改默认位置看 `src/config.ts`。
- 右上角 ➕ → 选「在这里做的事情」(`doing`)或「想去做的事情」(`wishlist`)。
- 选完后地图中心出现一个浮动 pin 和十字定位,挪地图到目标位置 → 点底部「在这里打标」。
- 底部抽屉上滑出来:**标题** / **展开说说** / **图片** / **名字**(留空 → `栖居者`)。
- 图片在存储前会被压到长边最大 1200px、JPEG 重编码(质量 0.85),会尊重 EXIF 朝向。本地模式下作为 data URL 内嵌;Supabase 模式下上传到 bucket,行里存路径。
- 点已有 pin 看详情,可以点赞、(自己的可以,即 localStorage 里有它的 `ownerToken`)删除。

## 数据模型

```ts
type PinKind = 'doing' | 'wishlist';

interface Pin {
  id: string;
  kind: PinKind;
  title: string;
  note: string;
  lng: number;
  lat: number;
  author: string;     // 输入留空 → '栖居者'
  imageUrl?: string;  // data URL(本地)或 Supabase 公开 URL
  likes: number;      // 截断到 >= 0
  createdAt: number;  // 毫秒时间戳
}
```

浏览器本地偏好存在 localStorage(`src/services/prefs.ts`):

- 当前浏览器点过赞的 pin id(UI 用来显示已点状态)
- 上次用过的作者名(下次自动填)
- 每个 pin 的 `ownerToken`(Supabase 模式),用来授权删除

## 目录

```
src/
  components/
    Map/             MapView、➕ 按钮、十字定位、pin marker、定位按钮、用户蓝点
    BottomSheet/     可拖拽底部抽屉
    Forms/           新建表单 + 详情卡片
  hooks/
    usePins.ts          pin 列表 + likes + ownership;Supabase 模式下接 realtime
    useUserLocation.ts  geolocation 封装
  services/
    pinService.ts          接口 + 自动切换 + 本地实现
    supabasePinService.ts  Supabase 实现(Postgres + Storage + Realtime)
    supabase.ts            client(env vars 缺失时为 null)
    imageCompress.ts       压图 + JPEG 重编码 + dataURL 工具
    prefs.ts               本地用户偏好(liked / lastAuthor / ownerToken)
  types/pin.ts        Pin / PinDraft / PinKind / ANONYMOUS_AUTHOR
  config.ts           INITIAL_VIEW、MAPBOX_TOKEN、MAP_STYLE
supabase/
  setup.sql           一键:建表 + RLS + RPC + bucket + realtime
```

## 部署

任何静态托管都可以(Vercel、Netlify、Cloudflare Pages 等)。构建命令 `npm run build`,产物在 `dist/`。别忘了在托管平台的环境变量里设 `VITE_MAPBOX_TOKEN`(以及可选的两个 Supabase 变量)。
