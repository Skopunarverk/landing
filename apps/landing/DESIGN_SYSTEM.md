# Sköpunarverk Design System

## 1. 品牌真相

- 面向用户的唯一项目名：`Sköpunarverk`。
- 全大写展示：`SKÖPUNARVERK`。
- npm、路径与机器标识：`skopunarverk`。
- `TheWorldBook`、`Sevara`、`ex_mmo_cluster` 是真实子项目名，不做品牌替换。
- `Genesis` 只表示本地顶层协作工作区，不再出现在 landing 的对外界面与元数据中。

品牌名称、描述、链接和版本列表统一维护在 `app/lib/site.ts`。

## 2. 分层

```text
app/lib/
├── site.ts                           品牌与链接真相源
└── cn.ts                             纯 class 组合工具
app/components/
├── ui/                               无业务含义的设计系统组件
│   ├── ActionLink.tsx
│   ├── Eyebrow.tsx
│   ├── MetricStrip.tsx
│   ├── PageContainer.tsx
│   ├── PrincipleList.tsx
│   ├── SectionHeading.tsx
│   └── StatusBadge.tsx
├── site/                             品牌、导航与站点外壳
│   ├── BrandLockup.tsx
│   ├── NavigationLinks.tsx
│   ├── SiteFooter.tsx
│   ├── SiteHeader.tsx
│   ├── VersionSwitcher.tsx
│   ├── chromeStyles.ts
│   └── types.ts
└── motion/                           公共客户端动效生命周期
app/styles/theme.css                  Tailwind 4 CSS-first 语义令牌
app/globals.css                       基础样式与 classic 专属艺术样式入口
app/v2/v2.module.css                  voxel 专属艺术效果
```

公共层统一语义、交互、焦点、响应式和 reduced-motion；classic 与 voxel 只在艺术表达上分叉。

每个 `.tsx` 公共组件文件只定义一个 React 组件。页面和组件直接导入具体文件，不使用混合 Server / Client 的顶层 barrel；组件专属 Props 与静态 variant 映射和组件共置，共享类型才进入 `types.ts`。

## 3. 语义令牌

组件只消费这些语义 utility：

- `bg-canvas`、`bg-surface`、`bg-surface-strong`
- `text-fg`、`text-fg-muted`、`text-fg-dim`
- `border-line`
- `text-accent-cyan`、`text-accent-violet`、`text-accent-magenta`、`text-accent-gold`
- `text-positive`
- `ease-emphasized`、`shadow-panel`、`shadow-floating`

实际颜色由页面根节点的 `data-visual="classic | voxel"` 提供。公共组件不得直接绑定版本颜色。

## 4. 公共组件

- `PageContainer`：统一 1344 / 1440 宽度和响应式 gutter。
- `ActionLink`：`primary | secondary | quiet`、`sm | md`、`rounded | pill`。
- `Eyebrow`：章节短标签，可选状态点。
- `StatusBadge`：受控 tone 与可选状态点。
- `MetricStrip`：三项指标结构。
- `SectionHeading`：`split | center` 与 `classic | voxel` 排版。
- `PrincipleList`：共享原则列表语义与交互。
- `SiteHeader` / `SiteFooter` / `BrandLockup`：两版共享站点框架。
- `VersionSwitcher`：唯一版本切换实现。

新增页面优先组合这些组件，不复制已有 class 列表。

## 5. Tailwind 约定

1. 使用 Tailwind 4 CSS-first 配置，不新增 `tailwind.config.js`。
2. variant 必须映射到完整静态 class；禁止 `bg-${tone}` 一类动态拼接。
3. React 组件负责跨文件重复；CSS Module 只负责复杂伪元素、mask、Canvas 外框和专属动画。
4. 不用 `@apply` 重建传统 BEM 组件。
5. `className` 只用于外层布局；颜色、尺寸和状态使用受控 props。
6. 移动优先，简单动效优先使用 `motion-safe` / `motion-reduce`；Canvas 同时在 JS 层响应 reduced-motion、页面可见性和视口可见性。
7. 页面内容默认可见，渐显只在 JS 成功初始化后启用。
8. 一组件一文件；通用 UI、站点外壳和客户端动效之间不建立跨层聚合入口。

## 6. 验收

- `/` 与 `/v2` 均需通过 SSR 渲染测试。
- 运行 `npm test` 和 `npm run lint`。
- 浏览器至少检查桌面、平板、390px 手机宽度。
- 检查版本切换、键盘焦点、横向溢出、控制台错误和 reduced-motion 降级。
