# Sköpunarverk Web

Sköpunarverk 公共网站 monorepo。三个站点在同一个 lockfile 下协作，但保留独立的页面设计、构建产物和 Cloudflare 部署边界。

```text
apps/
├── landing/
├── sevara/
└── worldbook/
packages/
├── brand/
├── ui/
└── docs/
```

## 本地开发

```bash
pnpm install
pnpm dev:landing
```

## 全仓验证

```bash
pnpm build
pnpm lint
pnpm test
pnpm cloudflare:check
```

## Typst 内容发布

Sevara 与 The World Book 的网页正文不是手写副本。发布阶段从
`sources.lock.json` 指定的权威 Git 提交生成 HTML 内容制品与 PDF：

```bash
pnpm publish:prepare
```

该命令会同步 `.sources/`、校验远端地址、提交 SHA 与干净状态，然后调用
Typst 生成制品和发布清单。普通 `pnpm build` 不依赖系统 Typst 或本地内容仓，
只验证已提交制品与 lock 一致，因此 Cloudflare 的干净 checkout 可以重建 Web。

## Cloudflare 部署

仓库根的 `wrangler.jsonc` 是 Cloudflare Workers Builds 使用的稳定入口，适配
`npx wrangler deploy` 这一根目录部署命令。Landing 自身的部署配置仍归
`apps/landing/wrangler.jsonc` 管理；根配置只负责把路径转换为 monorepo 路径。

```bash
pnpm deploy:sevara
pnpm deploy:worldbook
pnpm deploy:landing
```

根站由 Worker `skopunarverk` 承载；`/sevara*` 与 `/worldbook*` 分别由独立
静态资产 Worker 承载。文档站部署命令会先重新构建，避免发布陈旧 `dist`。

定向操作某个 workspace 时使用 `pnpm --filter <package-name> <command>`。Landing 的路由、开发和部署说明见 [`apps/landing/README.md`](apps/landing/README.md)。
