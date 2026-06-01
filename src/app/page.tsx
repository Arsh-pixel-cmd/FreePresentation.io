"use client";

import { useEffect, useRef, useState } from "react";

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
    <div className="overflow-hidden border-y border-surface-border-light py-3.5 bg-[#0a0a0a]">
      <div className="flex whitespace-nowrap animate-marquee hover:[animation-play-state:paused]">
        {list.map((w, i) => (
          <span key={i} className="font-mono text-[11px] tracking-widest text-zinc-700 px-6 uppercase">
            {w}
            <span className="text-indigo ml-6">·</span>
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
    accent: "#16a34a",
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
  { name: "Obsidian", bg: "#0a0a0a", accent: "#6366f1", text: "#f5f5f5", muted: "#3f3f46" },
  { name: "Arctic", bg: "#f8fafc", accent: "#0ea5e9", text: "#0f172a", muted: "#cbd5e1" },
  { name: "Aurora", bg: "#0f0c29", accent: "#a78bfa", text: "#f0eeff", muted: "#2d2760" },
  { name: "Ember", bg: "#0f0700", accent: "#f97316", text: "#fef3e2", muted: "#292010" },
  { name: "Sage", bg: "#f0fdf4", accent: "#16a34a", text: "#052e16", muted: "#bbf7d0" },
  { name: "Slate", bg: "#0d1117", accent: "#38bdf8", text: "#e6edf3", muted: "#21262d" },
];

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(48px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s cubic-bezier(.22,1,.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function MiniSlide({ theme }: { theme: typeof THEME_PREVIEWS[0] }) {
  return (
    <div
      className="rounded-lg p-4 w-[180px] shrink-0 transition-transform duration-300 hover:scale-105"
      style={{ background: theme.bg, border: `1px solid ${theme.muted}` }}
    >
      <div className="rounded-sm mb-2.5" style={{ background: theme.accent, height: 3, width: "40%" }} />
      <div className="rounded-sm mb-1.5" style={{ background: theme.text, height: 8, width: "80%", opacity: 0.9 }} />
      <div className="rounded-sm mb-1" style={{ background: theme.text, height: 5, width: "100%", opacity: 0.35 }} />
      <div className="rounded-sm mb-3" style={{ background: theme.text, height: 5, width: "70%", opacity: 0.35 }} />
      <div className="rounded" style={{ background: theme.muted, height: 50, opacity: 0.5 }} />
      <div className="mt-2.5 font-mono text-[10px] tracking-wide" style={{ color: theme.accent }}>
        {theme.name.toUpperCase()}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [cursorPos, setCursorPos] = useState({ x: -200, y: -200 });
  const [heroWord, setHeroWord] = useState(0);
  const heroWords = ["Slides", "Decks", "Pitches", "Ideas"];

  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const totalWords = heroWords.length;
    const t = setInterval(() => {
      setHeroWord((w) => (w + 1) % totalWords);
    }, 2000);
    return () => clearInterval(t);
  }, [heroWords.length]);

  return (
    <>
      {/* Custom cursor */}
      <div
        className="fixed w-2.5 h-2.5 bg-indigo rounded-full pointer-events-none z-[9999] mix-blend-difference transition-transform duration-100"
        style={{ left: cursorPos.x - 5, top: cursorPos.y - 5 }}
      />
      <div
        className="fixed w-9 h-9 border border-indigo-muted rounded-full pointer-events-none z-[9998] transition-all duration-300"
        style={{ left: cursorPos.x - 18, top: cursorPos.y - 18 }}
      />

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-[100] flex items-center justify-between px-12 py-5 border-b border-white/[0.04] backdrop-blur-xl bg-surface/70">
        <div className="font-serif text-lg tracking-tight text-cream">
          Free<span className="text-indigo">Presentation</span>
        </div>
        <div className="hidden md:flex gap-8 items-center text-[13px] tracking-wide uppercase text-zinc-500 font-medium">
          <a href="#how" className="hover:text-cream transition-colors duration-200">How it works</a>
          <a href="#features" className="hover:text-cream transition-colors duration-200">Features</a>
          <a href="#themes" className="hover:text-cream transition-colors duration-200">Themes</a>
        </div>
        <button
          className="bg-indigo text-white border-none py-2.5 px-5 rounded-sm font-mono text-xs tracking-wide uppercase transition-all duration-200 hover:bg-indigo-hover hover:-translate-y-px cursor-none"
          onClick={() => (window.location.href = "/create")}
        >
          Start Free →
        </button>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col justify-center pt-36 pb-20 px-12 max-md:px-6 max-md:pt-28 relative overflow-hidden cursor-none">
        {/* Grid background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 100%)",
          }}
        />
        {/* Glow */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none z-0 bg-[radial-gradient(ellipse,rgba(99,102,241,0.12)_0%,transparent_70%)]" />

        <div className="font-mono text-[11px] tracking-widest uppercase text-indigo mb-7 flex items-center gap-2.5 relative z-[1] before:block before:w-6 before:h-px before:bg-indigo">
          Smart Presentation Creator
        </div>

        <h1 className="font-serif text-[clamp(52px,8vw,110px)] leading-[0.95] tracking-tighter text-cream relative z-[1] max-w-[900px]">
          Build beautiful<br />
          <em className="italic text-indigo inline-block min-w-[280px]">
            <span className="inline-block animate-word-fade" key={heroWord}>
              {heroWords[heroWord]}
            </span>
          </em>
          <br />
          Completely free.
        </h1>

        <p className="mt-9 text-[17px] leading-relaxed text-zinc-500 max-w-[460px] relative z-[1] font-light">
          Type a topic, upload a PDF, or paste your raw notes. Get 10–15 polished slides in seconds — with relevant photography, custom layouts, and zero watermarks.
        </p>

        <div className="mt-12 flex gap-4 items-center relative z-[1]">
          <button
            className="group bg-cream text-surface border-none py-3.5 px-8 font-mono text-[13px] tracking-wide uppercase rounded-sm transition-all duration-200 inline-flex items-center gap-2 hover:bg-white hover:-translate-y-0.5 cursor-none"
            onClick={() => (window.location.href = "/create")}
          >
            Create a presentation
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </button>
          <button
            className="bg-transparent text-zinc-500 border border-zinc-800 py-3.5 px-7 font-mono text-[13px] tracking-wide uppercase rounded-sm transition-all duration-200 hover:text-cream hover:border-zinc-600 hover:-translate-y-0.5 cursor-none"
            onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
          >
            See how it works
          </button>
        </div>

        <div className="mt-[72px] flex gap-14 max-md:gap-8 max-md:flex-wrap relative z-[1] pt-10 border-t border-surface-border-light">
          {[
            { num: <AnimatedNumber target={0} suffix="$" />, label: "Always free" },
            { num: <AnimatedNumber target={15} />, label: "Slides generated" },
            { num: <AnimatedNumber target={30} suffix="s" />, label: "Build time" },
            { num: <AnimatedNumber target={6} />, label: "Layout themes" },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-serif text-4xl text-cream tracking-tight">{s.num}</div>
              <div className="text-xs text-zinc-600 tracking-wide uppercase mt-1 font-mono">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-10 left-12 flex items-center gap-3 font-mono text-[10px] tracking-widest uppercase text-zinc-700 z-[1]">
          <div className="w-10 h-px bg-zinc-700 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-indigo after:animate-scroll-line" />
          Scroll to explore
        </div>
      </section>

      <Marquee />

      {/* How it works */}
      <section className="py-28 px-12 max-md:py-20 max-md:px-6" id="how">
        <Reveal>
          <div className="font-mono text-[10px] tracking-widest uppercase text-indigo mb-5 flex items-center gap-2 before:block before:w-4 before:h-px before:bg-indigo">
            Process
          </div>
          <h2 className="font-serif text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-tight text-cream max-w-[700px]">
            From idea to deck<br /><em className="italic text-indigo">in four steps.</em>
          </h2>
        </Reveal>

        <div className="grid grid-cols-4 max-md:grid-cols-2 mt-16 border border-surface-border-light overflow-hidden">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <div className="p-10 max-md:p-6 border-r border-surface-border-light last:border-r-0 relative transition-colors duration-300 hover:bg-surface-subtle">
                <div className="font-mono text-[11px] text-indigo tracking-wide mb-7">{step.n}</div>
                <div className="font-serif text-[22px] text-cream mb-3 tracking-tight">{step.title}</div>
                <div className="text-[13px] text-zinc-600 leading-relaxed font-light">{step.body}</div>
                {i < STEPS.length - 1 && (
                  <div className="absolute top-12 -right-px w-5 h-px bg-indigo z-[1]" />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="h-px bg-surface-border mx-12 max-md:mx-6" />

      {/* Stats bar */}
      <div className="bg-[#0a0a0a] border-y border-surface-border-light grid grid-cols-4 max-md:grid-cols-2">
        {[
          { n: "100%", label: "Free, no limits" },
          { n: "0", label: "Watermarks" },
          { n: "6", label: "Slide themes" },
          { n: "∞", label: "Presentations" },
        ].map((s, i) => (
          <Reveal key={i} delay={i * 0.08}>
            <div className="py-12 px-10 border-r border-surface-border-light last:border-r-0 transition-colors duration-300 hover:bg-surface-subtle">
              <div className="font-serif text-[52px] text-cream leading-none tracking-tighter">
                <span className="text-indigo">{s.n}</span>
              </div>
              <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-700 mt-2">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Features */}
      <section className="py-28 px-12 max-md:py-20 max-md:px-6" id="features">
        <Reveal>
          <div className="font-mono text-[10px] tracking-widest uppercase text-indigo mb-5 flex items-center gap-2 before:block before:w-4 before:h-px before:bg-indigo">
            Features
          </div>
          <h2 className="font-serif text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-tight text-cream max-w-[700px]">
            Everything you need.<br />
            <em className="italic text-indigo">Nothing you don&apos;t.</em>
          </h2>
        </Reveal>

        <div className="grid grid-cols-3 max-md:grid-cols-1 gap-px bg-surface-border-light border border-surface-border-light mt-16 overflow-hidden">
          {FEATURES.map((f, i) => (
            <Reveal
              key={i}
              delay={i * 0.07}
              className={`group bg-surface-raised relative overflow-hidden transition-colors duration-300 hover:bg-[#111] ${f.size === "large" ? "col-span-2 max-md:col-span-1" : ""}`}
            >
              <div
                className="p-10"
                style={{ "--card-accent": f.accent } as React.CSSProperties}
              >
                {/* Accent bar on hover */}
                <div
                  className="absolute top-0 left-0 w-full h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                  style={{ background: f.accent }}
                />
                <div className="font-mono text-[9px] tracking-widest uppercase mb-5 opacity-80" style={{ color: f.accent }}>
                  {f.tag}
                </div>
                <div className="font-serif text-2xl leading-tight tracking-tight text-cream mb-3">{f.title}</div>
                <div className="text-sm leading-relaxed text-zinc-600 font-light max-w-[400px]">{f.body}</div>
                <div className="absolute bottom-6 right-8 font-serif text-7xl leading-none text-white/[0.025] pointer-events-none select-none">
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Themes */}
      <section className="py-28 px-12 max-md:py-20 max-md:px-6 pb-20" id="themes">
        <Reveal>
          <div className="font-mono text-[10px] tracking-widest uppercase text-indigo mb-5 flex items-center gap-2 before:block before:w-4 before:h-px before:bg-indigo">
            Themes
          </div>
          <h2 className="font-serif text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-tight text-cream max-w-[700px]">
            Six moods.<br />
            <em className="italic text-indigo">Pick yours.</em>
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="flex gap-4 overflow-x-auto py-2 pb-4 mt-12 scrollbar-none [&::-webkit-scrollbar]:hidden">
            {THEME_PREVIEWS.map((t) => (
              <MiniSlide key={t.name} theme={t} />
            ))}
          </div>
        </Reveal>
      </section>

      <div className="h-px bg-surface-border mx-12 max-md:mx-6" />

      {/* CTA */}
      <section className="py-40 px-12 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />
        <Reveal>
          <h2 className="font-serif text-[clamp(48px,6vw,88px)] leading-none tracking-tighter text-cream mb-8 relative z-[1]">
            Stop paying for<br /><em className="italic text-indigo">presentation tools.</em>
          </h2>
          <p className="text-[15px] text-zinc-600 mb-12 font-light relative z-[1]">
            No account needed. No watermarks. No &quot;upgrade to export.&quot;<br />
            Just design your presentation and download it.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="relative z-[1] flex gap-4 justify-center">
            <button
              className="group bg-cream text-surface border-none py-4 px-10 font-mono text-sm tracking-wide uppercase rounded-sm transition-all duration-200 inline-flex items-center gap-2 hover:bg-white hover:-translate-y-0.5 cursor-none"
              onClick={() => (window.location.href = "/create")}
            >
              Create for free <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </button>
          </div>
          <div className="font-mono text-[10px] tracking-wider uppercase text-zinc-700 mt-6 relative z-[1]">
            Free · No signup · No watermark · Always
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="p-12 border-t border-surface-border flex max-md:flex-col items-center justify-between max-md:gap-6 max-md:text-center">
        <div className="font-serif text-base text-zinc-800">
          Free<span className="text-zinc-700">Presentation</span>
        </div>
        <div className="font-mono text-[10px] tracking-wider uppercase text-zinc-800">
          © 2025 FreePresentation · All rights reserved
        </div>
        <div className="flex gap-6 text-xs text-zinc-700 font-mono tracking-wide">
          <a href="#" className="hover:text-zinc-500 transition-colors duration-200">Privacy</a>
          <a href="#" className="hover:text-zinc-500 transition-colors duration-200">Terms</a>
          <a href="#" className="hover:text-zinc-500 transition-colors duration-200">GitHub</a>
        </div>
      </footer>
    </>
  );
}
