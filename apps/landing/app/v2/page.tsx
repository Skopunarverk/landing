import type { Metadata } from "next";
import { RevealManager } from "../components/motion/RevealManager";
import { SiteFooter } from "../components/site/SiteFooter";
import { SiteHeader } from "../components/site/SiteHeader";
import { ActionLink } from "../components/ui/ActionLink";
import { Eyebrow } from "../components/ui/Eyebrow";
import { MetricStrip } from "../components/ui/MetricStrip";
import { PageContainer } from "../components/ui/PageContainer";
import { PrincipleList } from "../components/ui/PrincipleList";
import { SectionHeading } from "../components/ui/SectionHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { siteConfig } from "../lib/site";
import { MotionField } from "./MotionField";
import { VoxelWorld } from "./VoxelWorld";
import styles from "./v2.module.css";

export const metadata: Metadata = {
  title: `${siteConfig.name}｜让世界真正发生`,
  description: `${siteConfig.name} 体素叙事版：从世界设定、魔法语言到服务端权威运行时，展示三个项目如何逐步汇合。`,
  openGraph: {
    title: `${siteConfig.name}｜让世界真正发生`,
    description: "世界设定、魔法语言与权威运行时，共同构成一个持续演化的体素世界。",
    type: "website",
    locale: "zh_CN",
    url: "/v2",
    images: [{ url: "/og-skopunarverk.png", width: 1730, height: 909, alt: `${siteConfig.name} 漂浮体素世界` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name}｜让世界真正发生`,
    description: "世界设定、魔法语言与权威运行时，共同构成一个持续演化的体素世界。",
    images: ["/og-skopunarverk.png"],
  },
};

const pipeline = [
  ["01", "定义边界", "TheWorldBook 说明世界允许什么、为什么成立。"],
  ["02", "表达意图", "Sevara 让复杂意图能够被自然地说出。"],
  ["03", "收束语义", "Canonical 层把表达归约为唯一、可检查的语义。"],
  ["04", "形成契约", "机制计划描述目标、锚点、预算与预期变化。"],
  ["05", "权威裁决", "运行时结合环境、资源与权限决定最终结果。"],
  ["06", "写回世界", "确认后的变化被持久化，并传播给所有参与者。"],
] as const;

const systems = [
  { title: "地形与体素", copy: "土地可以被挖掘、建造与改变；世界基线保持确定，长期变化只记录真正发生的差异。", status: "已有基础", tone: "cyan" },
  { title: "热、湿度与局部场", copy: "环境不是装饰数据。热量、湿度与局部场为火焰、导电和更多涌现现象提供共同介质。", status: "正在推进", tone: "violet" },
  { title: "生命与生态", copy: "当物种、资源和环境形成反馈，迁徙、繁衍与衰退才能成为世界历史的一部分。", status: "设计目标", tone: "gold" },
  { title: "魔法与机制图", copy: "魔法最终不是播放一个特效，而是在明确锚点、预算和世界规则下触发一组可解释机制。", status: "设计目标", tone: "pink" },
  { title: "社会与长期记忆", copy: "建筑、战争、组织与文明应留下后来者仍能感知的痕迹，让玩家行为真正进入世界史。", status: "设计目标", tone: "green" },
] as const;

const progress = [
  { name: "TheWorldBook", state: "持续完善", detail: "设定本体与跨仓决策共同推进，维护世界规律、文明与长期叙事的一致性。", href: siteConfig.links.worldBook },
  { name: "Sevara", state: "语言优先", detail: "优先完善规范、词库、长篇吟唱与教学资产，再让实现承接已经稳定的语言决定。", href: siteConfig.links.sevara },
  { name: "ex_mmo_cluster", state: "权威世界优先", detail: "当前聚焦体素权威化、远景渲染与局部场运行时，让世界状态可信、可扩展。", href: siteConfig.links.runtime },
] as const;

const navItems = [
  { label: "世界蓝图", href: "#blueprint" },
  { label: "三个项目", href: "#projects-v2" },
  { label: "运行链路", href: "#pipeline" },
  { label: "当前进展", href: "#progress" },
] as const;

const systemToneClasses = {
  cyan: styles.tonecyan,
  violet: styles.toneviolet,
  gold: styles.tonegold,
  pink: styles.tonepink,
  green: styles.tonegreen,
} as const;

const principles = [
  ["世界只有一份确认态", "客户端可以预测与呈现，最终发生了什么始终由权威运行时决定。"],
  ["规则先于一次性脚本", "火焰、雷击与护盾来自可组合机制，而不是彼此孤立的表演。"],
  ["系统彼此正交", "每个项目只守住自己的责任，通过稳定契约协作，不共享隐式假设。"],
  ["契约显式，失败可解释", "跨系统输入、输出与失败原因都应可观察、可诊断、可验证。"],
  ["独立成长，最终会合", "三个项目先各自成熟，再用最小端到端样例验证真正的融合。"],
] as const;

export default function V2Page() {
  return (
    <div data-visual="voxel" className={`${styles.page} min-h-screen overflow-hidden bg-canvas text-fg selection:bg-accent-cyan/25 selection:text-white`}>
      <MotionField />
      <RevealManager />
      <div className={styles.auroraA} aria-hidden="true" />
      <div className={styles.auroraB} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />

      <SiteHeader visual="voxel" activeVersion="v2" brandHref="/v2" mainHref="#v2-main" navItems={navItems} />

      <main id="v2-main" className="relative z-10">
        <PageContainer as="section" width="wide" className="relative grid min-h-[calc(100svh-76px)] items-center gap-8 pb-16 pt-14 lg:grid-cols-[0.94fr_1.06fr] lg:py-12">
          <div className="relative z-20 max-w-3xl" data-v2-reveal>
            <Eyebrow tone="accent" dot>Persistent world · Three evolving systems</Eyebrow>
            <h1 className="mt-7 text-[clamp(3.4rem,7vw,7.6rem)] font-[760] leading-[0.94] tracking-[-0.066em] text-white">
              让一个世界，
              <span className={styles.gradientText}>从被书写到真正发生。</span>
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-8 text-fg-muted sm:text-[1.08rem] sm:leading-9">
              Sköpunarverk 连接世界设定、魔法语言与服务端权威运行时。规则先被定义，再被表达，最终成为所有参与者共同经历、持续留下痕迹的世界状态。
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ActionLink variant="primary" shape="pill" href="#blueprint" endIcon="↓" iconMotion="down">了解这个世界</ActionLink>
              <ActionLink variant="secondary" shape="pill" href="#projects-v2" endIcon="✦" iconMotion="none">查看三个项目</ActionLink>
            </div>
            <MetricStrip className="mt-12 max-w-2xl" metrics={[
              { value: "03", label: "独立项目" },
              { value: "01", label: "共同世界" },
              { value: "∞", label: "演化契约" },
            ]} />
          </div>

          <div className="relative mx-auto w-full max-w-[700px]" data-v2-reveal>
            <VoxelWorld />
          </div>
        </PageContainer>

        <div className={styles.ticker} aria-label="Sköpunarverk 核心主题">
          <div className={styles.tickerTrack}>
            {["WORLD CANON", "SEVARA LANGUAGE", "SERVER AUTHORITY", "VOXEL TRUTH", "LOCAL FIELDS", "EXPLICIT CONTRACTS", "WORLD CANON", "SEVARA LANGUAGE", "SERVER AUTHORITY", "VOXEL TRUTH", "LOCAL FIELDS", "EXPLICIT CONTRACTS"].map((item, index) => (
              <span key={`${item}-${index}`}>{item}<i>✦</i></span>
            ))}
          </div>
        </div>

        <PageContainer as="section" id="blueprint" className="scroll-mt-24 py-24 sm:py-36" data-v2-reveal>
          <SectionHeading
            appearance="voxel"
            reveal
            eyebrow="01 · WORLD BLUEPRINT"
            title={<>世界不是一组功能，<br />而是一条持续生长的因果链。</>}
            description="地形影响水与热，环境改变生命与聚落，语言表达人的意图，权威运行时决定世界最终发生什么。变化被记录，也继续影响后来者。"
          />

          <div className="mt-14 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <article className={`${styles.glassPanel} min-h-[420px] p-6 sm:p-9`}>
              <div className="flex items-center justify-between gap-4">
                <StatusBadge tone="violet">机制示例 · 设计目标</StatusBadge>
                <span className="font-mono text-[0.58rem] tracking-[0.14em] text-white/35">LIGHTNING / 01</span>
              </div>
              <h3 className="mt-20 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">一次雷击，如何变成世界历史？</h3>
              <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-5">
                {["雷暴积聚", "地表潮湿", "导电路径", "环境受损", "状态写回"].map((item, index) => (
                  <div className={styles.causeStep} key={item}><span>0{index + 1}</span><strong>{item}</strong></div>
                ))}
              </div>
            </article>
            <aside className={`${styles.glassPanel} flex flex-col justify-between p-6 sm:p-9`}>
              <div className={styles.radar} aria-hidden="true"><i /><i /><span /></div>
              <div>
                <p className="font-mono text-[0.62rem] tracking-[0.14em] text-cyan-200">HONEST STATUS</p>
                <h3 className="mt-4 text-2xl font-semibold text-white">这是目标链路，不是已上线宣言。</h3>
                <p className="mt-4 text-sm leading-7 text-[#9aa6cc]">当前跨仓决策与契约设计已经建立，工程融合仍需用雷击、火球和护盾三个最小样例逐步验证。</p>
              </div>
            </aside>
          </div>
        </PageContainer>

        <PageContainer as="section" id="projects-v2" className="scroll-mt-24 py-24 sm:py-36">
          <SectionHeading
            appearance="voxel"
            reveal
            eyebrow="02 · THREE SYSTEMS"
            title="三个项目，守住三种不同的真相。"
            description="世界书决定边界，语言承载意图，权威运行时确认结果。它们不会被揉成一个仓库，却必须沿同一方向演化。"
          />

          <div className="mt-14 grid gap-4 lg:grid-cols-12">
            <article className={`${styles.projectPanel} ${styles.worldBookPanel} lg:col-span-7`} data-v2-reveal>
              <div className="flex items-start justify-between gap-4"><span className={styles.projectNumber}>01</span><StatusBadge tone="gold">世界设定 · 持续完善</StatusBadge></div>
              <div className="mt-24 max-w-2xl">
                <Eyebrow tone="accent">THEWORLDBOOK</Eyebrow>
                <h3>世界先拥有规律，故事才拥有重量。</h3>
                <p>从天文、地理和魔法，到历史、社会与文明。它不只是背景资料，也是跨项目规则和长期决策的真相源。</p>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["世界基础", "历史与社会", "文化与文明", "生活与挑战"].map((volume, index) => <span className={styles.volume} key={volume}>VOLUME {index + 1}<strong>{volume}</strong></span>)}
              </div>
              <a className={styles.panelLink} href={siteConfig.links.worldBook}>阅读世界设定 <span>→</span></a>
            </article>

            <article className={`${styles.projectPanel} ${styles.sevaraPanel} lg:col-span-5`} data-v2-reveal>
              <div className="flex items-start justify-between gap-4"><span className={styles.projectNumber}>02</span><StatusBadge tone="pink">语言优先</StatusBadge></div>
              <div className="mt-20">
                <Eyebrow tone="accent">SEVARA</Eyebrow>
                <h3>魔法不是按钮，而是一门能够被教会的语言。</h3>
                <p>自然感来自受控句段组织，而不是开放式模糊匹配。当前重心是让语言可说、可教、可扩词、可支持长篇吟唱。</p>
              </div>
              <ol className="mt-8 grid gap-2">
                {["Surface · 玩家说出的自然表达", "Canonical · 唯一、可检查的语义", "Execution · 面向权威环境的计划"].map((layer, index) => <li className={styles.languageLayer} key={layer}><span>0{index + 1}</span>{layer}</li>)}
              </ol>
              <a className={styles.panelLink} href={siteConfig.links.sevara}>了解 Sevara <span>→</span></a>
            </article>

            <article className={`${styles.projectPanel} ${styles.runtimePanel} lg:col-span-12`} data-v2-reveal>
              <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
                <div>
                  <div className="flex items-start justify-between gap-4"><span className={styles.projectNumber}>03</span><StatusBadge tone="cyan">服务端权威</StatusBadge></div>
                  <div className="mt-20">
                    <Eyebrow tone="accent">EX_MMO_CLUSTER</Eyebrow>
                    <h3>世界的最终答案，由权威运行时给出。</h3>
                    <p>客户端表达、预览与呈现；移动、体素、对象状态和局部场的确认态由服务端维护，并通过清晰边界持续演化。</p>
                  </div>
                </div>
                <ol className={styles.authorityFlow}>
                  {["玩家意图", "服务端裁决", "状态变化", "快照 / 增量", "共同结果"].map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong>{index < 4 && <i aria-hidden="true">→</i>}</li>)}
                </ol>
              </div>
              <a className={styles.panelLink} href="https://github.com/dyzdyz010/ex_mmo_cluster" target="_blank" rel="noreferrer">查看权威运行时 <span>↗</span></a>
            </article>
          </div>
        </PageContainer>

        <PageContainer as="section" id="pipeline" className="scroll-mt-24 py-24 sm:py-36">
          <SectionHeading
            appearance="voxel"
            align="center"
            reveal
            eyebrow="03 · TARGET PIPELINE"
            title="一个意图，如何成为世界中的事实？"
            description="这条链路描述三项目未来会合的目标方式。现在最重要的不是跳过边界，而是用可验证的最小契约把每一步接起来。"
          />
          <ol className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/[0.09] bg-white/[0.08] md:grid-cols-2 lg:grid-cols-3" data-v2-reveal>
            {pipeline.map(([index, title, copy]) => (
              <li className={styles.pipelineStep} key={index}><span>{index}</span><h3>{title}</h3><p>{copy}</p></li>
            ))}
          </ol>
          <div className={styles.currentState} data-v2-reveal>
            <span>当前阶段</span><p>跨仓决策与契约设计已经建立；全面工程融合尚未开始。下一步以雷击、火球、护盾三个最小样例验证端到端机制。</p>
          </div>
        </PageContainer>

        <PageContainer as="section" className="py-24 sm:py-36">
          <SectionHeading
            appearance="voxel"
            reveal
            eyebrow="04 · LIVING SYSTEMS"
            title="系统开始相互影响，世界才真正活起来。"
            description="每个系统都读写同一套世界状态，但成熟度不同。标签同时说明它是已有基础、正在推进，还是仍需验证的设计目标。"
          />
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            {systems.map((system, index) => (
              <article className={`${styles.systemCard} ${systemToneClasses[system.tone]} ${index < 2 ? "lg:col-span-3" : "lg:col-span-2"}`} key={system.title} data-v2-reveal>
                <StatusBadge tone={system.tone} dot>{system.status}</StatusBadge>
                <h3>{system.title}</h3><p>{system.copy}</p><span className={styles.systemIndex}>0{index + 1}</span>
              </article>
            ))}
          </div>
        </PageContainer>

        <PageContainer as="section" id="progress" className="scroll-mt-24 py-24 sm:py-36">
          <SectionHeading
            appearance="voxel"
            reveal
            eyebrow="05 · CURRENT PROGRESS"
            title="创世不是一次发布，而是三条轨道逐步会合。"
            description="先让每个项目在自己的边界内成熟，再冻结真正需要共享的契约。这比提前制造“已经融合”的假象更重要。"
          />
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {progress.map((item, index) => (
              <a
                className={styles.progressCard}
                key={item.name}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                data-v2-reveal
              >
                <span className={styles.progressIndex}>0{index + 1}</span><StatusBadge tone="cyan" className="absolute right-6 top-5">{item.state}</StatusBadge>
                <h3>{item.name}</h3><p>{item.detail}</p><i aria-hidden="true">{item.href.startsWith("http") ? "↗" : "→"}</i>
              </a>
            ))}
          </div>
        </PageContainer>

        <PageContainer as="section" className="py-24 sm:py-36">
          <SectionHeading
            appearance="voxel"
            reveal
            eyebrow="06 · PRINCIPLES"
            title="让复杂世界保持清晰，也保持诚实。"
            description="体素叙事版更浪漫、更丰富，但判断完成度仍以项目真实边界和可验证证据为准。"
          />
          <div className="mt-14" data-v2-reveal><PrincipleList principles={principles} appearance="voxel" /></div>
        </PageContainer>

        <PageContainer as="section" className="pb-28 pt-16 sm:pb-36" data-v2-reveal>
          <div className={styles.ctaPanel}>
            <div className={styles.ctaStars} aria-hidden="true" />
            <div className="relative z-10 max-w-4xl">
              <Eyebrow tone="accent">THE WORLD IS BEING WRITTEN</Eyebrow>
              <h2>这部创世之作，正在被一层层写成现实。</h2>
              <p>从世界书中的一条规则，到语言中的一句表达，再到运行时中的一次真实变化。Sköpunarverk 记录每一步，也保留尚未解决的问题。</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ActionLink variant="primary" shape="pill" href={siteConfig.links.github} target="_blank" endIcon="↗">查看项目群源码</ActionLink>
                <ActionLink variant="secondary" shape="pill" href="/" endIcon="←" iconMotion="none">返回原版对比</ActionLink>
              </div>
            </div>
          </div>
        </PageContainer>
      </main>

      <SiteFooter
        visual="voxel"
        description="世界设定 · 魔法语言 · 权威运行时"
        status="体素叙事版 / 所有系统持续演进"
      />
    </div>
  );
}
