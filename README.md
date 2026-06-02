# i-live-here

伦敦地图打标 MVP — 一个 web app，可以在地图上标注「我在这里做的好玩事情」和「想去做的事情」，手机电脑都能用。

## 技术栈

- Vite + React 18 + TypeScript
- react-map-gl（Mapbox GL）做底图
- localStorage 暂代后端，所有读写都走 `src/services/pinService.ts`，将来直接换成 HTTP 实现即可

## 启动

```bash
# 1. 装依赖
npm install

# 2. 配置 Mapbox token
cp .env.example .env.local
# 编辑 .env.local，填入你在 https://account.mapbox.com/access-tokens/ 拿到的 token

# 3. 跑开发服务器
npm run dev
```

打开 http://localhost:5173 — 手机访问同局域网 IP 也可。

## 操作

- 拖拽/双指缩放地图
- 右上角 ➕ 按钮 → 选择「在这里做的好玩事情」或「想去做的事情」
- 选完后地图中心会出现一个 pin，挪地图到目标位置 → 点底部「在这里打标」
- 表单从下方弹出，填完保存
- 点已有 pin 查看详情；详情卡片里可以删除

## 目录

```
src/
  components/
    Map/            地图、➕ 按钮、十字定位、Marker
    BottomSheet/    Apple Maps 风格的可拖拽底部抽屉
    Forms/          新建表单 + 详情卡片
  hooks/usePins.ts  pin 列表状态
  services/pinService.ts  数据层（换后端只动这里）
  types/pin.ts      Pin 类型
  config.ts         初始视图、token、style
```

## 之后接后端

替换 `src/services/pinService.ts` 里 `localPinService` 为 HTTP 版本（文件底部已有注释模板），UI 不用动。
