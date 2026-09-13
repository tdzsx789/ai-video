# AI金铲

AI金铲是一个面向视频与图片创作的 AI 工作区，当前保留 Seedance 文生视频任务链路，并预留图片创作、用户中心和积分体系。

## 业务框架

- 注册 / 登录：本地演示账户入口，后续可接入真实认证服务
- 用户中心：个人资料、API Key 和服务连接状态
- 充值积分：积分余额与套餐入口，当前为本地演示充值
- 工作台：视频创作和图片创作双模式
- 历史记录：视频任务自动归档、复制地址、继续查询

桌面端采用侧边导航，移动端自动切换为顶部品牌栏和底部导航。

## 技术栈

- React + Vite：模块化前端与响应式 UI
- Node.js + Express：任务创建、轮询和历史接口
- PostgreSQL：任务与视频地址持久化
- Docker Compose：本地启动 PostgreSQL

## 启动

```bash
npm install
npm run db:up
npm run db:migrate
npm run db:import
npm run dev
```

开发地址：

- 前端：`http://127.0.0.1:5180`
- 后端健康检查：`http://127.0.0.1:8787/api/health`
- PostgreSQL：`localhost:5434`

生产构建：

```bash
npm run build
npm start
```

生产模式下 Node 服务会直接托管 `web/dist`。

## 配置

复制 `server/.env.example` 为 `server/.env`，填写 `OPENAI_NEXT_API_KEY`。也可以在“用户中心”临时输入 API Key。密钥不会写入 PostgreSQL 历史记录。

旧版 `server/seedance-history.json` 可以用 `npm run db:import` 导入 PostgreSQL。
