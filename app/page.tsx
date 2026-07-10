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
    href: "https://github.com/Hemifuture/TheWorldBook",
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
    href: "https://github.com/dyzdyz010/sevara",
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
    href: "https://github.com/dyzdyz010/ex_mmo_cluster",
  },
] as const;

const principles = [
  ["统一真相", "设定、语言和运行时通过明确契约相连，不依赖隐式猜测。"],
  ["涌现优先", "世界行为来自规则与交互，而不是一次性的脚本表演。"],
  ["持续演化", "三个项目独立成长，在同一方向上逐步收束为完整世界。"],
] as const;

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-space-950 text-star-100 selection:bg-violet-400/30 selection:text-white">
      <div className="star-field pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="nebula nebula-violet pointer-events-none fixed" aria-hidden="true" />
      <div className="nebula nebula-cyan pointer-events-none fixed" aria-hidden="true" />

      <header className="relative z-50 border-b border-white/[0.08] bg-space-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#top" className="group flex items-center gap-3 rounded-lg focus-ring" aria-label="返回 Genesis 首页">
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <span>
              <span className="block text-[0.82rem] font-semibold tracking-[0.28em] text-white">GENESIS</span>
              <span className="mt-0.5 block font-mono text-[0.56rem] tracking-[0.2em] text-star-500">WORLD SYSTEMS</span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            <a className="nav-link" href="#projects">项目群</a>
            <a className="nav-link" href="#system">协作系统</a>
            <a className="nav-link" href="#principles">设计原则</a>
          </nav>

          <a
            className="button button-quiet hidden sm:inline-flex"
            href="https://github.com/dyzdyz010"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <span aria-hidden="true">↗</span>
          </a>

          <details className="mobile-menu relative md:hidden">
            <summary className="icon-button focus-ring" aria-label="打开导航菜单">
              <span aria-hidden="true">•••</span>
            </summary>
            <nav className="absolute right-0 top-12 grid w-52 gap-1 rounded-2xl border border-white/10 bg-space-900/95 p-2 shadow-orbit backdrop-blur-xl" aria-label="移动端导航">
              <a className="nav-link" href="#projects">项目群</a>
              <a className="nav-link" href="#system">协作系统</a>
              <a className="nav-link" href="#principles">设计原则</a>
            </nav>
          </details>
        </div>
      </header>

      <main id="top" className="relative z-10">
        <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1440px] items-center gap-16 px-5 py-20 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-16">
          <div className="relative z-20 max-w-3xl">
            <p className="eyebrow mb-7">
              <span className="status-dot" aria-hidden="true" />
              Genesis Initiative · Project Constellation
            </p>
            <h1 className="font-display text-[clamp(3.5rem,7vw,7.8rem)] font-medium leading-[0.93] tracking-[-0.055em] text-white">
              让世界被书写，
              <span className="title-gradient">也被运行。</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-star-300 sm:text-lg">
              从世界设定，到魔法语言，再到服务端权威运行时。Genesis 把想象、表达与演化连接为同一个可生长的世界。
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a className="button button-primary" href="#projects">
                探索项目群 <span className="button-arrow" aria-hidden="true">↓</span>
              </a>
              <a
                className="button button-secondary"
                href="https://github.com/Hemifuture/TheWorldBook"
                target="_blank"
                rel="noreferrer"
              >
                阅读世界设定 <span className="button-arrow" aria-hidden="true">↗</span>
              </a>
            </div>

            <dl className="mt-14 grid max-w-xl grid-cols-3 border-y border-white/[0.08] py-5">
              <div>
                <dt className="metric-value">03</dt>
                <dd className="metric-label">核心项目</dd>
              </div>
              <div className="border-x border-white/[0.08] px-5 sm:px-8">
                <dt className="metric-value">01</dt>
                <dd className="metric-label">统一世界</dd>
              </div>
              <div className="pl-5 sm:pl-8">
                <dt className="metric-value">∞</dt>
                <dd className="metric-label">演化可能</dd>
              </div>
            </dl>
          </div>

          <div className="relative mx-auto flex aspect-square w-full max-w-[720px] items-center justify-center lg:translate-x-8" aria-label="Genesis 三项目轨道关系图">
            <div className="axis axis-x" aria-hidden="true" />
            <div className="axis axis-y" aria-hidden="true" />
            <span className="coordinate coordinate-top">N 00° / GENESIS</span>
            <span className="coordinate coordinate-side">E 120° / HEMIFUTURE</span>

            <div className="orbit orbit-outer" aria-hidden="true" />
            <div className="orbit orbit-middle" aria-hidden="true" />
            <div className="orbit orbit-inner" aria-hidden="true" />

            <div className="genesis-core">
              <span className="core-halo" aria-hidden="true" />
              <span className="font-mono text-[0.58rem] tracking-[0.25em] text-star-400">ORIGIN</span>
              <strong className="mt-1 text-sm tracking-[0.16em] text-white">GENESIS</strong>
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
        </section>

        <section id="projects" className="section-shell scroll-mt-24 py-24 sm:py-32">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Project Constellation / 03 Nodes</p>
              <h2>三个系统，构成一个世界。</h2>
            </div>
            <p>每个项目独立生长，也通过清晰契约把设定、表达与执行连接起来。</p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                className={`project-card project-${project.color}`}
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
                  <span className="signal-pill"><i /> {project.signal}</span>
                </div>
                <div className="mt-24 lg:mt-32">
                  <p className="font-mono text-[0.64rem] uppercase tracking-[0.22em] text-star-500">{project.label}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{project.title}</h3>
                  <p className="mt-4 min-h-24 text-sm leading-7 text-star-300">{project.description}</p>
                </div>
                <div className="mt-7 flex flex-wrap gap-2">
                  {project.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                </div>
                <a className="card-link focus-ring" href={project.href} target="_blank" rel="noreferrer">
                  查看项目 <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="system" className="section-shell scroll-mt-24 py-24 sm:py-32">
          <div className="system-panel">
            <div className="max-w-xl">
              <p className="eyebrow">One World / Three Responsibilities</p>
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
        </section>

        <section id="principles" className="section-shell scroll-mt-24 py-24 sm:py-32">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Design Principles</p>
              <h2>让复杂世界保持清晰。</h2>
            </div>
            <p>不是把三个仓库放在一起，而是让它们在同一套原则下协作。</p>
          </div>
          <div className="mt-12 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {principles.map(([title, description], index) => (
              <div className="principle-row" key={title}>
                <span>0{index + 1}</span><h3>{title}</h3><p>{description}</p><i aria-hidden="true">↗</i>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.08]">
        <div className="section-shell flex flex-col gap-8 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-white">GENESIS</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-star-500">一个由世界设定、魔法语言与权威运行时共同组成的长期项目群。</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-star-500">Constellation status</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-star-300 sm:justify-end"><span className="status-dot" aria-hidden="true" /> All systems evolving</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
