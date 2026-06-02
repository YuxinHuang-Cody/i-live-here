# i-live-here

伦敦地图打标 MVP — 一个 web app，可以在地图上标注「我在这里做的好玩事情」和「想去做的事情」。

## 技术栈

- Vite + React 18 + TypeScript
- react-map-gl（Mapbox GL）做底图
- 数据层 `src/services/pinService.ts` 两种实现：
  - **本地模式**（默认）：pins / 图片 / 点赞 全在浏览器 localStorage
  - **Supabase 模式**（填了 env vars 自动启用）：Postgres + Storage + Realtime

## 启动

```bash
npm install

cp .env.example .env.local
# 编辑 .env.local，至少填 VITE_MAPBOX_TOKEN
# Supabase 的两个变量留空 → 本地模式；都填上 → Supabase 模式

npm run dev
```

打开 http://localhost:5173 。

## 接 Supabase（多人共享 + 持久化）

1. **建项目** — 在 https://supabase.com/dashboard 新建项目，等几分钟启动。
2. **跑 SQL** — Studio 左侧 SQL Editor → New query → 粘 `supabase/setup.sql` 内容 → Run。它会建表、加 RLS、建 RPC、建 storage bucket、开 realtime。
3. **拿凭据** — Project Settings → API：
   - `Project URL` → `.env.local` 的 `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
4. 重启 `npm run dev`。控制台日志里如果看到 realtime channel 订阅，就成了。
5. 部署到 Vercel 时，把这两个变量也加到 Vercel 的 Environment Variables 里。

### Supabase 模式下的安全模型

- **匿名读写**：任何访客都能列出所有 pin、新建 pin、点赞。
- **删除受 owner_token 保护**：创建 pin 时客户端生成一个随机 token 存在 localStorage，删除时通过 `delete_pin(id, token)` RPC 验证。换设备/清缓存 → 失去删除权（但 pin 还在）。
- **图片 bucket 是公开读**（getPublicUrl 才能用）；上传仅允许写到 `pin-images` 桶。
- **likes 走 RPC**，没法直接 update 表，防止刷负数。
- 没有真正的身份系统，所以仍然可被刷垃圾。要严肃上线建议加 Supabase Auth（哪怕只是匿名 sessions）+ 简单 rate limit。

## 操作

- 拖拽 / 双指缩放地图
- 进站自动定位到你当前位置（拒绝授权则退回 Jeremy Bentham Room）
- 右上角 ➕ → 选「在这里做的好玩事情」或「想去做的事情」
- 选完后地图中心出现一个浮动 pin，挪地图到目标位置 → 点底部「在这里打标」
- 表单从下方上滑：标题 / 展开说说 / 图片 / 名字（留空 = 栖居者）
- 点已有 pin 看详情，可以点赞、（自己的可以）删除

## 目录

```
src/
  components/
    Map/             地图、➕ 按钮、十字定位、Marker、定位按钮、用户蓝点
    BottomSheet/     可拖拽底部抽屉
    Forms/           新建表单 + 详情卡片
  hooks/
    usePins.ts       pin 列表 + likes + ownership
    useUserLocation.ts  geolocation
  services/
    pinService.ts          接口 + 自动切换 + 本地实现
    supabasePinService.ts  Supabase 实现
    supabase.ts            client
    imageCompress.ts       压图
    prefs.ts               本地用户偏好（liked / lastAuthor / ownerToken）
  types/pin.ts
  config.ts          初始视图、Mapbox token、style
supabase/
  setup.sql          一键建表 + RLS + RPC + bucket
```
