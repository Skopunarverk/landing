# Sköpunarverk Landing

Sköpunarverk 项目群的统一入口，展示 TheWorldBook、Sevara 与 ex_mmo_cluster 三个项目如何共同组成一个可被书写、表达和运行的世界。

## 版本对比

- `/`：原版，以项目群和三仓关系为主。
- `/v2`：体素叙事版，融合星空、体素世界、滚动显现与更完整的世界系统叙事。

两版都在顶栏提供版本切换入口，原版不会被新版覆盖。

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm run build
npm test
npm run lint
```

页面使用 Tailwind CSS 4。共享令牌位于 `app/styles/theme.css`；通用 UI、站点外壳和动效基础设施分别位于 `app/components/ui/`、`app/components/site/`、`app/components/motion/`，每个公共 React 组件独占一个文件。版本专属艺术效果保留在各自样式文件中。详细治理规则见 `DESIGN_SYSTEM.md`。

## Cloudflare 部署

正式站使用 Cloudflare Worker `skopunarverk`，并将 `skopunarverk.com` 作为 Worker Custom Domain。Worker 同时上传 `dist/client` 静态资源；SSR、RSC 和动态 metadata 由 Vinext Worker 处理。

首次或手工发布：

```bash
npm run lint
npm test
npm run cloudflare:types
npm run cloudflare:check
npm run deploy:cloudflare
```

若要像 Wonderland 一样启用 Workers Builds，在 Cloudflare 的 `Workers & Pages → Import a repository` 中选择 landing 仓库，并设置：

- Production branch：`main`
- Root directory：`/`
- Build command：`npm run build`
- Deploy command：`npx wrangler deploy`
- Non-production deploy command：`npx wrangler versions upload`
- Non-production branch builds：启用
- Build watch paths：`*`
- Build cache：启用

当前站点不需要 D1、KV、R2 或构建密钥。`www.skopunarverk.com` 未绑定；若后续启用，优先用 Cloudflare Redirect Rule 永久跳转到根域，保持唯一规范地址。
