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

### WorldBook 单一事实源

WorldBook 的卷名、摘要、章节与成熟度属于 TheWorldBook 内容仓，不在网站页面中
平行维护。发布准备会从固定提交的 `publication/worldbook.json` 生成
`apps/worldbook/src/generated/publication-index.json`；旧的固定提交尚无结构化清单时，
只允许从同一权威仓的 `README.md` 进入显式 `legacy-readme` 兼容模式，不回退到网站
手写内容。

```bash
pnpm worldbook-publication:generate
pnpm worldbook-publication:verify
pnpm worldbook-publication:verify:pinned
```

生成索引记录权威仓、完整 commit、源路径、源文件规范化 SHA-256 与生成模式；文本哈希
统一使用 UTF-8 与 LF 换行，避免 Git 在 Windows/Linux checkout 时引入伪漂移。网站首页、
四卷目录、下载列表和许可证展示只消费该索引。生成文件不得人工编辑；内容变化应先
进入 TheWorldBook，再通过 `pnpm publish:prepare` 重建网页、PDF 和 publication manifest。

网页正文制品使用 `authoritative-content` v3。发布准备会在安全审计之前通过 parse5 从同一份
Typst HTML 派生 h2–h4 目录、为缺少 label 的标题补确定性锚点，并为块级 MathML 增加独立
滚动边界；已有 Typst label 始终保留。验证阶段会从正文重新推导并逐项比对目录，网站不得
手写第二份章节数组。需要长期稳定的公开深链时，应在 TheWorldBook 的 Typst 源中补显式
label，而不是依赖标题生成的 fallback 锚点。

公开 landing 仓的 CI 会始终验证已提交制品、Manifest、站点构建与测试。若要让 CI 从两个
私有权威仓重新拉取并执行零漂移检查，需要配置只读 Actions secret
`SOURCE_REPO_TOKEN`，且只授予 Sevara 与 TheWorldBook 的 contents read 权限；未配置时
工作流会在 Summary 明确标记来源重建未执行。本地或发布者环境仍必须先运行
`pnpm publish:prepare`。

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

三个 Worker 均通过 Cloudflare Workers Builds 连接到 `Skopunarverk/landing`
的 `main` 分支。生产构建配置如下：

| Worker | 根目录 | 构建命令 | 部署命令 |
| --- | --- | --- | --- |
| `skopunarverk` | `/` | `npm run build` | `npx wrangler deploy` |
| `skopunarverk-sevara` | `/apps/sevara` | `pnpm --dir ../.. build` | `pnpm exec wrangler deploy --config wrangler.jsonc` |
| `skopunarverk-worldbook` | `/apps/worldbook` | `pnpm --dir ../.. build` | `pnpm exec wrangler deploy --config wrangler.jsonc` |

三个连接都监听生产分支的全部路径，因此同一提交会在通过完整出版校验后分别部署
三个站点，避免跨站版本漂移。两个静态文档 Worker 的非生产分支构建保持关闭；
需要预览环境时应为每个 Worker 单独配置对应的 `wrangler.jsonc`，不能复用仓库根
的 Landing 配置。

定向操作某个 workspace 时使用 `pnpm --filter <package-name> <command>`。Landing 的路由、开发和部署说明见 [`apps/landing/README.md`](apps/landing/README.md)。
