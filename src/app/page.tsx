"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function Marquee() {
  const words = [
    "FREE FOREVER",
    "NO WATERMARKS",
    "SMART DESIGN",
    "EXPORT TO PPTX",
    "10–15 SLIDES",
    "ANY TOPIC",
    "PDF EXPORT",
  ];
  const list = [...words, ...words, ...words];

  return (
    <div className="overflow-hidden border-y border-surface-border py-4 bg-surface-raised">
      <div className="flex whitespace-nowrap animate-marquee hover:[animation-play-state:paused]">
        {list.map((w, i) => (
          <span key={i} className="font-mono text-[12px] tracking-widest text-slate-300 px-7 uppercase font-medium flex items-center">
            {w}
            <span className="text-indigo ml-7 text-sm">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, visible } = useReveal(0.1);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setVal(target);
        clearInterval(timer);
      } else {
        setVal(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const HERO_PREVIEWS = [
  {
    slideNumber: "01",
    layout: "Title & Key Insights",
    tag: "MARKET OVERVIEW",
    title: "Accelerating Growth with Generative Intelligence",
    subtitle: "Strategic breakdown of enterprise productivity gains, adoption roadmaps, and competitive levers.",
    stats: [
      { label: "Efficiency Gain", val: "+74%" },
      { label: "Deck Build Time", val: "18s" },
      { label: "Production Cost", val: "0$" },
    ],
    accent: "#6366f1",
    themeName: "Obsidian",
  },
  {
    slideNumber: "02",
    layout: "Architecture & Scalability",
    tag: "TECHNICAL SPECS",
    title: "Edge Delivery & High-Throughput Synthesis",
    subtitle: "Instant slide compilation with zero server bottleneck, real-time font rendering, and seamless export.",
    stats: [
      { label: "Format Support", val: "PPTX/PDF" },
      { label: "Slide Quality", val: "4K Vector" },
      { label: "Paywall / Ads", val: "Zero" },
    ],
    accent: "#38bdf8",
    themeName: "Slate",
  },
  {
    slideNumber: "03",
    layout: "Executive Roadmap",
    tag: "KEY MILESTONES",
    title: "Unrestricted Presentation Creation for Everyone",
    subtitle: "Built to empower pitch decks, academic research, and business reviews without watermarks.",
    stats: [
      { label: "Active Decks", val: "150K+" },
      { label: "User Rating", val: "4.9/5" },
      { label: "Always Free", val: "100%" },
    ],
    accent: "#a855f7",
    themeName: "Aurora",
  },
];

const FEATURES = [
  {
    tag: "GENERATION",
    title: "Prompt to 15 slides",
    body: "Type a topic. Our builder designs a structured, professional presentation in under 30 seconds. No template limits.",
    size: "large",
    accent: "#6366f1",
  },
  {
    tag: "IMPORT",
    title: "Upload your PDF",
    body: "Drop a research paper or document. We parse the text, structure the insights, and layout slides instantly.",
    size: "small",
    accent: "#f97316",
  },
  {
    tag: "IMAGES",
    title: "Relevant photography",
    body: "Every slide gets context-matched high-quality images from Unsplash or designer assets, keeping layouts cohesive.",
    size: "small",
    accent: "#38bdf8",
  },
  {
    tag: "THEMES",
    title: "6 distinct themes",
    body: "From Obsidian dark to Arctic light. Change themes in one click and watch every slide adapt dynamically.",
    size: "medium",
    accent: "#a78bfa",
  },
  {
    tag: "EDITOR",
    title: "Custom slide editor",
    body: "Double-click any slide to modify content, replace images, adjust layouts, and drag-and-drop to reorder.",
    size: "medium",
    accent: "#10b981",
  },
  {
    tag: "EXPORT",
    title: "PPTX + PDF. Yours.",
    body: "Single-click download. Production-ready file format, no watermarks, no account registration required.",
    size: "large",
    accent: "#f59e0b",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Input your content",
    body: "Provide a brief description, paste notes, or drop a reference PDF to begin.",
  },
  {
    n: "02",
    title: "Select your layout theme",
    body: "Choose from six curated layouts: Obsidian, Arctic, Aurora, Ember, Sage, or Slate.",
  },
  {
    n: "03",
    title: "Auto-generate",
    body: "The engine structures your outline, designs body content, and matches assets.",
  },
  {
    n: "04",
    title: "Refine and export",
    body: "Make modifications on the canvas, reorder slides, and export to PDF or PowerPoint.",
  },
];

const THEME_PREVIEWS = [
  { name: "Obsidian", bg: "#090d16", accent: "#6366f1", text: "#f8fafc", muted: "#334155" },
  { name: "Arctic", bg: "#f8fafc", accent: "#0ea5e9", text: "#0f172a", muted: "#cbd5e1" },
  { name: "Aurora", bg: "#0f0c29", accent: "#a78bfa", text: "#f0eeff", muted: "#4c3a7a" },
  { name: "Ember", bg: "#140a02", accent: "#f97316", text: "#fef3e2", muted: "#5a3a1a" },
  { name: "Sage", bg: "#f0fdf4", accent: "#16a34a", text: "#052e16", muted: "#86efac" },
  { name: "Slate", bg: "#0d131f", accent: "#38bdf8", text: "#e2e8f0", muted: "#334155" },
];

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function MiniSlide({ theme }: { theme: typeof THEME_PREVIEWS[0] }) {
  return (
    <div
      className="rounded-xl p-5 w-[200px] shrink-0 transition-all duration-300 hover:scale-105 shadow-lg border"
      style={{ background: theme.bg, borderColor: theme.muted }}
    >
      <div className="rounded-full mb-3" style={{ background: theme.accent, height: 4, width: "45%" }} />
      <div className="rounded-sm mb-2" style={{ background: theme.text, height: 9, width: "85%", opacity: 0.95 }} />
      <div className="rounded-sm mb-1.5" style={{ background: theme.text, height: 6, width: "100%", opacity: 0.6 }} />
      <div className="rounded-sm mb-4" style={{ background: theme.text, height: 6, width: "70%", opacity: 0.6 }} />
      <div className="rounded-md" style={{ background: theme.muted, height: 54, opacity: 0.65 }} />
      <div className="mt-3 font-mono text-[11px] font-semibold tracking-wider flex items-center justify-between" style={{ color: theme.accent }}>
        <span>{theme.name.toUpperCase()}</span>
        <span className="text-xs">→</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [heroWord, setHeroWord] = useState(0);
  const [activeSlideTab, setActiveSlideTab] = useState(0);
  const heroWords = ["Slides", "Decks", "Pitches", "Ideas"];

  useEffect(() => {
    const totalWords = heroWords.length;
    const t = setInterval(() => {
      setHeroWord((w) => (w + 1) % totalWords);
    }, 2400);
    return () => clearInterval(t);
  }, [heroWords.length]);

  const currentPreview = HERO_PREVIEWS[activeSlideTab];

  return (
    <div className="min-h-screen bg-surface text-foreground selection:bg-indigo selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-[100] flex items-center justify-between px-6 md:px-12 py-4 border-b border-surface-border backdrop-blur-xl bg-surface/85">
        <div className="font-serif text-xl tracking-tight text-cream flex items-center gap-2">
          <span>Free<span className="text-indigo font-bold">Presentation</span></span>
          <span className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            100% Free
          </span>
        </div>
        <div className="hidden md:flex gap-8 items-center text-[13px] tracking-wide uppercase text-slate-300 font-medium">
          <a href="#how" className="hover:text-white hover:text-indigo transition-colors duration-200">How it works</a>
          <a href="#features" className="hover:text-white hover:text-indigo transition-colors duration-200">Features</a>
          <a href="#themes" className="hover:text-white hover:text-indigo transition-colors duration-200">Themes</a>
        </div>
        <button
          className="bg-indigo text-white border-none py-2.5 px-6 rounded-md font-mono text-xs tracking-wide uppercase transition-all duration-200 hover:bg-indigo-hover hover:shadow-lg hover:shadow-indigo/25 hover:-translate-y-px cursor-pointer"
          onClick={() => (window.location.href = "/create")}
        >
          Start Free →
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 max-w-[1440px] mx-auto min-h-screen flex flex-col justify-center">
        {/* Modern glowing background accents */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 90% 80% at 50% 35%, black 40%, transparent 100%)",
          }}
        />
        <div className="absolute top-[18%] left-[10%] w-[500px] h-[400px] pointer-events-none z-0 bg-[radial-gradient(ellipse,rgba(99,102,241,0.18)_0%,transparent_70%)]" />
        <div className="absolute top-[30%] right-[10%] w-[550px] h-[420px] pointer-events-none z-0 bg-[radial-gradient(ellipse,rgba(56,189,248,0.14)_0%,transparent_70%)]" />

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-[1]">
          {/* Left Column: Headlines, Copy, CTA */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2.5 font-mono text-xs tracking-widest uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full w-fit mb-6">
              <span className="w-2 h-2 rounded-full bg-indigo animate-pulse" />
              Smart Presentation Creator
            </div>

            <h1 className="font-serif text-[clamp(44px,6vw,92px)] leading-[1.02] tracking-tighter text-cream">
              Build beautiful<br />
              <span className="italic text-indigo inline-block min-w-[260px]">
                <span className="inline-block animate-word-fade" key={heroWord}>
                  {heroWords[heroWord]}
                </span>
              </span>
              <br />
              Completely free.
            </h1>

            <p className="mt-7 text-[18px] leading-relaxed text-slate-300 max-w-[560px] font-light">
              Type a topic, upload a PDF, or paste your raw notes. Get 10–15 polished, presentation-ready slides in seconds — with context-matched imagery, crisp typography, and zero watermarks.
            </p>

            <div className="mt-10 flex flex-wrap gap-4 items-center">
              <button
                className="group bg-cream text-surface font-semibold py-4 px-8 font-mono text-[13px] tracking-wide uppercase rounded-md transition-all duration-200 inline-flex items-center gap-2.5 hover:bg-white hover:shadow-xl hover:shadow-white/10 hover:-translate-y-0.5 cursor-pointer"
                onClick={() => (window.location.href = "/create")}
              >
                Create a presentation
                <span className="transition-transform duration-200 group-hover:translate-x-1 font-bold">→</span>
              </button>
              <button
                className="bg-surface-raised/70 text-slate-200 border border-surface-border-light hover:border-slate-500 hover:text-white py-4 px-7 font-mono text-[13px] tracking-wide uppercase rounded-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer backdrop-blur-sm"
                onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
              >
                See how it works
              </button>
            </div>

            {/* Trust Metrics Bar */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-surface-border">
              {[
                { num: <AnimatedNumber target={0} suffix="$" />, label: "Always free" },
                { num: <AnimatedNumber target={15} />, label: "Slides generated" },
                { num: <AnimatedNumber target={30} suffix="s" />, label: "Build time" },
                { num: <AnimatedNumber target={6} />, label: "Layout themes" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="font-serif text-3xl md:text-4xl text-cream tracking-tight font-medium">{s.num}</div>
                  <div className="text-xs text-slate-400 tracking-wider uppercase mt-1 font-mono font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Slide Showcase Preview */}
          <div className="lg:col-span-5 relative">
            {/* Top Floating Glass Badge */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="absolute -top-6 right-2 sm:right-6 z-20 bg-surface-overlay/90 backdrop-blur-md border border-indigo/40 px-4 py-2 rounded-full shadow-xl shadow-indigo/10 flex items-center gap-2.5 text-xs font-mono text-slate-200"
            >

              <span>⚡ PPTX & PDF Export · Ready</span>
            </motion.div>

            {/* Main Interactive Slide Card */}
            <div className="bg-surface-raised border border-surface-border rounded-2xl p-6 sm:p-7 shadow-2xl relative shadow-indigo/10 transition-all duration-300 hover:border-slate-600">
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <span className="ml-2 font-mono text-[11px] text-slate-400 uppercase tracking-wide">
                    Live Slide Preview
                  </span>
                </div>
                <div className="flex gap-1.5 bg-surface-subtle p-1 rounded-md border border-surface-border">
                  {HERO_PREVIEWS.map((s, idx) => (
                    <button
                      key={s.slideNumber}
                      onClick={() => setActiveSlideTab(idx)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono tracking-wider transition-all duration-150 ${activeSlideTab === idx
                        ? "bg-indigo text-white font-semibold shadow-sm"
                        : "text-slate-400 hover:text-white"
                        }`}
                    >
                      {s.slideNumber}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slide Canvas Mockup */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPreview.slideNumber}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl p-6 bg-surface-overlay border border-surface-border-light relative overflow-hidden min-h-[300px] flex flex-col justify-between"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: currentPreview.accent,
                  }}
                >
                  {/* Subtle canvas glow */}
                  <div
                    className="absolute -right-16 -top-16 w-44 h-44 rounded-full pointer-events-none opacity-20 blur-2xl"
                    style={{ background: currentPreview.accent }}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm bg-surface-subtle"
                        style={{ color: currentPreview.accent }}
                      >
                        {currentPreview.tag}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Layout: {currentPreview.layout}
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl text-cream leading-tight tracking-tight mb-3">
                      {currentPreview.title}
                    </h3>

                    <p className="text-sm leading-relaxed text-slate-300 font-light">
                      {currentPreview.subtitle}
                    </p>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-surface-border">
                    {currentPreview.stats.map((m, idx) => (
                      <div key={idx} className="bg-surface-subtle/70 rounded-lg p-2.5 border border-surface-border">
                        <div className="font-serif text-lg text-cream font-medium" style={{ color: currentPreview.accent }}>
                          {m.val}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 tracking-wide uppercase mt-0.5">
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Bottom Card Footer */}
              <div className="mt-5 flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: currentPreview.accent }} />
                  <span>Theme: {currentPreview.themeName}</span>
                </div>
                <button
                  onClick={() => setActiveSlideTab((prev) => (prev + 1) % HERO_PREVIEWS.length)}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors duration-150 flex items-center gap-1 cursor-pointer"
                >
                  Next slide sample <span>→</span>
                </button>
              </div>
            </div>

            {/* Bottom Floating Glass Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="absolute -bottom-5 left-4 sm:left-8 z-20 bg-surface-overlay/95 backdrop-blur-md border border-surface-border-light px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 text-xs font-mono text-slate-200"
            >

              <span>No Signup Required · Instant PPTX Download</span>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 flex items-center gap-3 font-mono text-[11px] tracking-widest uppercase text-slate-400 z-[1]">
          <div className="w-10 h-px bg-slate-600 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-indigo after:animate-scroll-line" />
          Scroll to explore
        </div>
      </section>

      <Marquee />

      {/* How it works */}
      <section className="py-28 px-6 md:px-12 max-w-[1440px] mx-auto" id="how">
        <Reveal>
          <div className="font-mono text-xs tracking-widest uppercase text-indigo-400 mb-4 flex items-center gap-2 before:block before:w-4 before:h-px before:bg-indigo">
            Process
          </div>
          <h2 className="font-serif text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-tight text-cream max-w-[700px]">
            From idea to deck<br /><em className="italic text-indigo">in four steps.</em>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-16 border border-surface-border rounded-xl overflow-hidden bg-surface-raised/40">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <div className="p-8 md:p-10 border-b lg:border-b-0 lg:border-r border-surface-border last:border-r-0 relative transition-colors duration-300 hover:bg-surface-subtle/80">
                <div className="font-mono text-xs text-indigo-400 font-bold tracking-wide mb-6">{step.n}</div>
                <div className="font-serif text-[24px] text-cream mb-3 tracking-tight">{step.title}</div>
                <div className="text-[14px] text-slate-300 leading-relaxed font-light">{step.body}</div>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-12 -right-px w-5 h-px bg-indigo z-[1]" />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="h-px bg-surface-border max-w-[1440px] mx-auto px-6 md:px-12" />

      {/* Stats bar */}
      <div className="bg-surface-raised border-y border-surface-border">
        <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4">
          {[
            { n: "100%", label: "Free, no limits" },
            { n: "0", label: "Watermarks" },
            { n: "6", label: "Slide themes" },
            { n: "∞", label: "Presentations" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="py-12 px-6 md:px-10 border-b md:border-b-0 md:border-r border-surface-border last:border-r-0 transition-colors duration-300 hover:bg-surface-subtle/60 text-center md:text-left">
                <div className="font-serif text-[48px] md:text-[56px] text-cream leading-none tracking-tighter">
                  <span className="text-indigo">{s.n}</span>
                </div>
                <div className="font-mono text-xs tracking-widest uppercase text-slate-300 mt-3 font-medium">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="py-28 px-6 md:px-12 max-w-[1440px] mx-auto" id="features">
        <Reveal>
          <div className="font-mono text-xs tracking-widest uppercase text-indigo-400 mb-4 flex items-center gap-2 before:block before:w-4 before:h-px before:bg-indigo">
            Features
          </div>
          <h2 className="font-serif text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-tight text-cream max-w-[700px]">
            Everything you need.<br />
            <em className="italic text-indigo">Nothing you don&apos;t.</em>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-surface-border border border-surface-border rounded-xl mt-16 overflow-hidden">
          {FEATURES.map((f, i) => (
            <Reveal
              key={i}
              delay={i * 0.07}
              className={`group bg-surface-raised relative overflow-hidden transition-colors duration-300 hover:bg-surface-subtle ${f.size === "large" ? "md:col-span-2" : ""}`}
            >
              <div className="p-8 md:p-10 relative z-10">
                <div
                  className="absolute top-0 left-0 w-full h-1 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                  style={{ background: f.accent }}
                />
                <div className="font-mono text-[11px] tracking-widest uppercase mb-4 font-bold" style={{ color: f.accent }}>
                  {f.tag}
                </div>
                <div className="font-serif text-2xl leading-tight tracking-tight text-cream mb-3">{f.title}</div>
                <div className="text-[15px] leading-relaxed text-slate-300 font-light max-w-[460px]">{f.body}</div>
                <div className="absolute bottom-6 right-8 font-serif text-7xl leading-none text-white/[0.04] pointer-events-none select-none font-bold">
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Themes */}
      <section className="py-28 px-6 md:px-12 max-w-[1440px] mx-auto pb-20" id="themes">
        <Reveal>
          <div className="font-mono text-xs tracking-widest uppercase text-indigo-400 mb-4 flex items-center gap-2 before:block before:w-4 before:h-px before:bg-indigo">
            Themes
          </div>
          <h2 className="font-serif text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-tight text-cream max-w-[700px]">
            Six moods.<br />
            <em className="italic text-indigo">Pick yours.</em>
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="flex gap-5 overflow-x-auto py-4 pb-6 mt-12 scrollbar-none [&::-webkit-scrollbar]:hidden">
            {THEME_PREVIEWS.map((t) => (
              <MiniSlide key={t.name} theme={t} />
            ))}
          </div>
        </Reveal>
      </section>

      <div className="h-px bg-surface-border max-w-[1440px] mx-auto px-6 md:px-12" />

      {/* CTA */}
      <section className="py-36 px-6 md:px-12 text-center relative overflow-hidden max-w-[1440px] mx-auto">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[radial-gradient(ellipse,rgba(99,102,241,0.14)_0%,transparent_70%)] pointer-events-none" />
        <Reveal>
          <h2 className="font-serif text-[clamp(44px,6vw,84px)] leading-none tracking-tighter text-cream mb-6 relative z-[1]">
            Stop paying for<br /><em className="italic text-indigo">presentation tools.</em>
          </h2>
          <p className="text-[17px] text-slate-300 mb-10 font-light relative z-[1] max-w-[560px] mx-auto">
            No account needed. No watermarks. No &quot;upgrade to export.&quot;<br />
            Just design your presentation and download it.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="relative z-[1] flex gap-4 justify-center">
            <button
              className="group bg-cream text-surface font-semibold py-4 px-10 font-mono text-sm tracking-wide uppercase rounded-md transition-all duration-200 inline-flex items-center gap-2.5 hover:bg-white hover:shadow-2xl hover:shadow-white/10 hover:-translate-y-0.5 cursor-pointer"
              onClick={() => (window.location.href = "/create")}
            >
              Create for free <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </button>
          </div>
          <div className="font-mono text-xs tracking-wider uppercase text-slate-400 mt-6 relative z-[1]">
            Free · No signup · No watermark · Always
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="p-8 md:p-12 border-t border-surface-border flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left max-w-[1440px] mx-auto">
        <div className="font-serif text-lg text-cream">
          Free<span className="text-indigo font-semibold">Presentation</span>
        </div>
        <div className="font-mono text-xs tracking-wider uppercase text-slate-400">
          © 2025 FreePresentation · All rights reserved
        </div>
        <div className="flex gap-6 text-xs text-slate-300 font-mono tracking-wide">
          <a href="#" className="hover:text-white transition-colors duration-200">Privacy</a>
          <a href="#" className="hover:text-white transition-colors duration-200">Terms</a>
          <a href="#" className="hover:text-white transition-colors duration-200">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
