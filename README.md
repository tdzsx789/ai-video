# AI金铲

AI金铲是一个面向视频与图片创作的 AI 工作区，当前接入 Seedance 文生视频任务链路与 `gpt-image`、`Gemini-nano-banana` 图片生成，并提供用户中心和积分体系。

## 业务框架

- 登录：当前预置两个 mock 账户，注册流程暂不开放
- 用户中心：账户资料、邮箱与手机号、密码安全设置
- 充值积分：账户余额、充值订单和不可变积分流水，当前充值为 mock 入账
- 视频创作 / 图片创作：视频走 Seedance 任务链路，视频工作台支持官方常用的时长、帧数、分辨率、画幅、音频、水印、尾帧、提示词扩写、参考素材、随机种子、回调地址和任务有效期配置；图片通过 OpenAI 兼容接口调用 `gpt-image-2.5`、`gpt-image-2.5-sunburst` 或 `gemini-2.5-flash-image`
- 历史记录：视频与图片任务按账户自动归档、复制地址、继续查询

当前 mock 账户：

- 账号 `zhugexu`，密码 `zhugexu`
- 账号 `liyunqi`，密码 `liyunqi`
- 每个账户首次初始化获得 1,000 积分

## 数据与并发设计

- 浏览器不保存登录身份和余额；登录后只持有 `HttpOnly`、`SameSite=Lax` 会话 Cookie。
- 数据库保存密码哈希、会话哈希、账户余额、充值订单、积分流水、统一生成请求、视频任务和图片任务。
- 余额变更使用 PostgreSQL 事务和条件更新：`UPDATE ... WHERE balance >= cost`，避免并发扣成负数。
- 每次生成和充值都支持 `Idempotency-Key`，重复点击或网络重试不会重复扣费或重复入账。
- 生成请求的数据库事务不包含外部视频/图片接口调用，连接池不会被长时间生成任务占住。
- 任务和历史查询全部带 `user_id` 条件，历史清空使用软删除，不会删除其他账户的数据，也保留计费审计记录。
- 上游请求内容会限制大小并过滤密钥、Token、Cookie 等敏感字段后再写入 JSONB；用户 API Key 不写入历史和数据库。
- PostgreSQL 连接池、查询超时、事务空闲超时和分页上限均有配置，默认连接池为 20，可根据数据库规格调整。
- 图片接口返回 base64 时只在当前响应中展示，不直接把大段 base64 写入 PostgreSQL；后续接对象存储后再持久化图片资产。

这套结构适合当前的 100-1,000 并发起步。正式上线前还应在反向代理层增加限流、HTTPS、日志脱敏、对象存储和支付回调签名校验；如果继续扩大到更高并发，再将生成提交和状态轮询拆到队列/worker。

桌面端采用顶部横向导航，移动端自动切换为顶部品牌栏和底部导航。

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

复制 `server/.env.example` 为 `server/.env`，填写 `OPENAI_NEXT_API_KEY`。图片工作台支持 `gpt-image-2.5`、`gpt-image-2.5-sunburst` 和 `gemini-2.5-flash-image`，服务端默认使用 `gpt-image-2.5`；`DRAW_BASE_URL` 支持填写带或不带 `/v1` 的地址。`gemini-2.5-flash-image` 会优先调用 `/v1/chat/completions`，兼容你提供的 OpenAI SDK Demo。也可以在视频工作区侧栏的“生成密钥”面板临时输入 API Key。密钥只参与当前会话的生成请求，不会写入 PostgreSQL 历史记录或生成请求 JSON。

旧版 `server/seedance-history.json` 可以用 `npm run db:import` 导入 PostgreSQL。

## Docker 生产预览

生产预览使用 `docker-compose.prod.yml`，前端和 Node API 由同一个应用容器提供，PostgreSQL 只在 Docker 内网开放：

```bash
cp deploy.env.example .env
docker compose -f docker-compose.prod.yml up -d --build
```

默认预览地址为 `http://服务器IP:30081/`。如果通过已有的 OpenResty / Nginx 反向代理接入 `80/443`，可以只开放代理端口，不需要把 PostgreSQL 或 Node 内部端口暴露到公网。
