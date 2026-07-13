import { SiteFooter } from "./components/site/SiteFooter";
import { SiteHeader } from "./components/site/SiteHeader";
import { ActionLink } from "./components/ui/ActionLink";
import { Eyebrow } from "./components/ui/Eyebrow";
import { MetricStrip } from "./components/ui/MetricStrip";
import { PageContainer } from "./components/ui/PageContainer";
import { PrincipleList } from "./components/ui/PrincipleList";
import { SectionHeading } from "./components/ui/SectionHeading";
import { StatusBadge } from "./components/ui/StatusBadge";
import { siteConfig } from "./lib/site";

const projects = [
  {
    index: "01",
    title: "TheWorldBook",
    label: "世界设定",
    description:
      "记录天文、地理、魔法、文明与历史，让世界拥有一致、可追溯的规则与记忆。",
    color: "gold",
    signal: "Lore / Canon",
    tags: ["世界基础", "文明演化", "魔法体系"],
    href: siteConfig.links.worldBook,
  },
  {
    index: "02",
    title: "Sevara",
    label: "魔法语言",
    description:
      "一门可说、可教、可扩展的魔法语言，把自然吟唱收束为清晰、受控的执行语义。",
    color: "violet",
    signal: "Surface / Canonical / Execution",
    tags: ["Lexicon-first", "语言规范", "语义接口"],
    href: siteConfig.links.sevara,
  },
  {
    index: "03",
    title: "ex_mmo_cluster",
    label: "权威世界运行时",
    description:
      "让体素、移动、物理与局部场在服务端成为真实世界状态，并持续演化、扩展与自愈。",
    color: "cyan",
    signal: "Server Authoritative",
    tags: ["Elixir / OTP", "Rust NIF", "Emergent World"],
    href: siteConfig.links.runtime,
  },
] as const;

const principles = [
  ["统一真相", "设定、语言和运行时通过明确契约相连，不依赖隐式猜测。"],
  ["涌现优先", "世界行为来自规则与交互，而不是一次性的脚本表演。"],
  ["持续演化", "三个项目独立成长，在同一方向上逐步收束为完整世界。"],
] as const;

const navItems = [
  { label: "项目群", href: "#projects" },
  { label: "协作系统", href: "#system" },
  { label: "设计原则", href: "#principles" },
] as const;

const projectCardClasses = {
  gold: "project-card project-gold",
  violet: "project-card project-violet",
  cyan: "project-card project-cyan",
} as const;

export default function Home() {
  return (
    <div data-visual="classic" className="relative min-h-screen overflow-hidden bg-canvas text-fg selection:bg-accent-violet/30 selection:text-white">
      <div className="star-field pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="nebula nebula-violet pointer-events-none fixed" aria-hidden="true" />
      <div className="nebula nebula-cyan pointer-events-none fixed" aria-hidden="true" />

      <SiteHeader visual="classic" activeVersion="v1" brandHref="#top" mainHref="#top" navItems={navItems} />

      <main id="top" className="relative z-10">
        <PageContainer as="section" width="wide" className="grid min-h-[calc(100vh-5rem)] items-center gap-16 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
          <div className="relative z-20 max-w-3xl">
            <Eyebrow dot className="mb-7">Sköpunarverk Initiative · Project Constellation</Eyebrow>
            <h1 className="font-display text-[clamp(3.5rem,7vw,7.8rem)] font-medium leading-[0.93] tracking-[-0.055em] text-white">
              让世界被书写，
              <span className="title-gradient">也被运行。</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-fg-muted sm:text-lg">
              从世界设定，到魔法语言，再到服务端权威运行时。Sköpunarverk 把想象、表达与演化连接为同一个可生长的世界。
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ActionLink variant="primary" shape="rounded" href="#projects" endIcon="↓" iconMotion="down">
                探索项目群
              </ActionLink>
              <ActionLink
                variant="secondary"
                shape="rounded"
                href={siteConfig.links.worldBook}
                endIcon="→"
                iconMotion="none"
              >
                阅读世界设定
              </ActionLink>
            </div>

            <MetricStrip
              className="mt-14 max-w-xl border-b border-line pb-5"
              metrics={[
                { value: "03", label: "核心项目" },
                { value: "01", label: "统一世界" },
                { value: "∞", label: "演化可能" },
              ]}
            />
          </div>

          <div className="relative mx-auto flex aspect-square w-full max-w-[720px] items-center justify-center lg:translate-x-8" aria-label="Sköpunarverk 三项目轨道关系图">
            <div className="axis axis-x" aria-hidden="true" />
            <div className="axis axis-y" aria-hidden="true" />
            <span className="coordinate coordinate-top">N 00° / SKÖPUNARVERK</span>
            <span className="coordinate coordinate-side">E 120° / HEMIFUTURE</span>

            <div className="orbit orbit-outer" aria-hidden="true" />
            <div className="orbit orbit-middle" aria-hidden="true" />
            <div className="orbit orbit-inner" aria-hidden="true" />

            <div className="brand-core">
              <span className="core-halo" aria-hidden="true" />
              <span className="font-mono text-[0.58rem] tracking-[0.25em] text-star-400">ORIGIN</span>
              <strong className="mt-1 text-[0.7rem] tracking-[0.12em] text-white">SKÖPUNARVERK</strong>
            </div>

            <a className="orbit-node node-book" href="#project-worldbook" aria-label="查看 TheWorldBook 项目">
              <span className="node-pulse node-pulse-gold" aria-hidden="true" />
              <span><small>01 · CANON</small>TheWorldBook</span>
            </a>
            <a className="orbit-node node-sevara" href="#project-sevara" aria-label="查看 Sevara 项目">
              <span className="node-pulse node-pulse-violet" aria-hidden="true" />
              <span><small>02 · LANGUAGE</small>Sevara</span>
            </a>
            <a className="orbit-node node-runtime" href="#project-runtime" aria-label="查看 ex_mmo_cluster 项目">
              <span className="node-pulse node-pulse-cyan" aria-hidden="true" />
              <span><small>03 · RUNTIME</small>ex_mmo_cluster</span>
            </a>

            <div className="orbit-legend" aria-hidden="true">
              <span>LINK STATUS</span><strong>STABLE</strong><i />
            </div>
          </div>
        </PageContainer>

        <PageContainer as="section" id="projects" className="scroll-mt-24 py-24 sm:py-32">
          <SectionHeading
            eyebrow="Project Constellation / 03 Nodes"
            title="三个系统，构成一个世界。"
            description="每个项目独立生长，也通过清晰契约把设定、表达与执行连接起来。"
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                className={projectCardClasses[project.color]}
                id={
                  project.index === "01"
                    ? "project-worldbook"
                    : project.index === "02"
                      ? "project-sevara"
                      : "project-runtime"
                }
                key={project.title}
              >
                <div className="flex items-start justify-between gap-6">
                  <span className="project-index">{project.index}</span>
                  <StatusBadge tone={project.color} dot>{project.signal}</StatusBadge>
                </div>
                <div className="mt-24 lg:mt-32">
                  <p className="font-mono text-[0.64rem] uppercase tracking-[0.22em] text-star-500">{project.label}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{project.title}</h3>
                  <p className="mt-4 min-h-24 text-sm leading-7 text-star-300">{project.description}</p>
                </div>
                <div className="mt-7 flex flex-wrap gap-2">
                  {project.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                </div>
                <a
                  className="card-link focus-ring"
                  href={project.href}
                  target={project.href.startsWith("http") ? "_blank" : undefined}
                  rel={project.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  查看项目 <span aria-hidden="true">{project.href.startsWith("http") ? "↗" : "→"}</span>
                </a>
              </article>
            ))}
          </div>
        </PageContainer>

        <PageContainer as="section" id="system" className="scroll-mt-24 py-24 sm:py-32">
          <div className="system-panel">
            <div className="max-w-xl">
              <Eyebrow>One World / Three Responsibilities</Eyebrow>
              <h2 className="mt-6 font-display text-4xl leading-tight tracking-[-0.04em] text-white sm:text-6xl">从想象到真实，沿同一条轨道运行。</h2>
              <p className="mt-6 text-base leading-8 text-star-300">世界书定义边界，Sevara 提供表达，运行时维护权威状态。职责彼此正交，结果彼此连通。</p>
            </div>

            <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] lg:grid-cols-3">
              <li className="flow-step">
                <span className="flow-index">01</span><strong>书写世界</strong><p>建立世界观、规律与文明的长期真相。</p><small>TheWorldBook</small>
              </li>
              <li className="flow-step">
                <span className="flow-index">02</span><strong>表达意图</strong><p>让魔法能够被自然吟唱，也能被准确理解。</p><small>Sevara</small>
              </li>
              <li className="flow-step">
                <span className="flow-index">03</span><strong>运行规律</strong><p>由服务端确认世界状态，让变化持续存在。</p><small>ex_mmo_cluster</small>
              </li>
            </ol>
          </div>
        </PageContainer>

        <PageContainer as="section" id="principles" className="scroll-mt-24 py-24 sm:py-32">
          <SectionHeading
            eyebrow="Design Principles"
            title="让复杂世界保持清晰。"
            description="不是把三个仓库放在一起，而是让它们在同一套原则下协作。"
          />
          <div className="mt-12"><PrincipleList principles={principles} /></div>
        </PageContainer>
      </main>

      <SiteFooter
        visual="classic"
        description="一个由世界设定、魔法语言与权威运行时共同组成的长期项目群。"
        statusLabel="Constellation status"
        status="All systems evolving"
      />
    </div>
  );
}
