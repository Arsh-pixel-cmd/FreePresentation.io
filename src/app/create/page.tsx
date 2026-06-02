"use client";

import { useState, useRef, useCallback } from "react";
import { ThemeId } from "@/types/presentation";
import { THEME_LIST } from "@/lib/themes/themes";
import { usePresentationStore } from "@/store/presentationStore";

type Tab = "prompt" | "upload" | "paste" | "url";

const TAB_LABELS: Record<Tab, string> = {
  prompt: "Write a topic",
  upload: "Upload PDF",
  paste: "Paste text",
  url: "Import URL",
};

const EXAMPLE_PROMPTS = [
  "The future of renewable energy in 2040",
  "How machine learning is changing healthcare",
  "Startup pitch deck for a food delivery app",
  "History of the Roman Empire",
  "Climate change: causes, effects & solutions",
  "Introduction to quantum computing",
];

const LOAD_STEPS = [
  "Analyzing your topic…",
  "Writing slide content…",
  "Structuring the narrative…",
  "Sourcing images…",
  "Assembling your presentation…",
];

export default function CreatePage() {
  const { setPresentation, savePresentation } = usePresentationStore();
  const [tab, setTab] = useState<Tab>("prompt");
  const [prompt, setPrompt] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>("obsidian");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState("General Public");
  const [tone, setTone] = useState("Professional & Clean");
  const [slideCount, setSlideCount] = useState(12);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleGenerate = useCallback(async () => {
    const hasInput =
      (tab === "prompt" && prompt.trim()) ||
      (tab === "paste" && pasteText.trim()) ||
      (tab === "upload" && file) ||
      (tab === "url" && urlInput.trim());
    if (!hasInput) return;

    setLoading(true);
    setLoadStep(0);
    setError(null);

    const interval = setInterval(() => {
      setLoadStep((s) => (s < LOAD_STEPS.length - 1 ? s + 1 : s));
    }, 1800);

    try {
      const formData = new FormData();
      formData.append("themeId", themeId);
      formData.append("audience", audience);
      formData.append("tone", tone);
      formData.append("slideCount", String(slideCount));

      if (tab === "prompt") {
        formData.append("mode", "prompt");
        formData.append("prompt", prompt);
      } else if (tab === "paste") {
        formData.append("mode", "paste");
        formData.append("text", pasteText);
      } else if (tab === "url" && urlInput.trim()) {
        setLoadStep(0);
        const parseRes = await fetch("/api/parse/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput }),
        });
        const parseData = await parseRes.json();
        if (parseData.error) throw new Error(parseData.error);
        formData.append("mode", "paste");
        formData.append("text", parseData.text);
      } else if (tab === "upload" && file) {
        setLoadStep(0);
        const parseForm = new FormData();
        parseForm.append("file", file);
        const parseRes = await fetch("/api/parse", { method: "POST", body: parseForm });
        const parseData = await parseRes.json();
        if (parseData.error) throw new Error(parseData.error);
        formData.append("mode", "paste");
        formData.append("text", parseData.text);
      }

      setLoadStep(1);
      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      if (data.presentation?.id) {
        setPresentation(data.presentation);
        savePresentation(data.presentation);
        window.location.href = `/editor/${data.presentation.id}`;
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Something went wrong. Please try again.");
      setLoading(false);
    } finally {
      clearInterval(interval);
    }
  }, [tab, prompt, pasteText, urlInput, file, themeId, savePresentation, setPresentation, audience, tone, slideCount]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") {
      setFile(f);
      setTab("upload");
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-10">
            <div className="absolute inset-0 border border-indigo/30 border-t-indigo rounded-full animate-spin-slow" />
            <div className="absolute inset-2 border border-indigo/10 border-t-indigo/50 rounded-full animate-spin-reverse" />
          </div>
          <div className="font-serif text-2xl text-cream tracking-tight mb-7 min-h-[36px] transition-opacity duration-300">
            {LOAD_STEPS[loadStep]}
          </div>
          <div className="flex gap-2 justify-center mb-8">
            {LOAD_STEPS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-400 ${i <= loadStep ? "bg-indigo" : "bg-zinc-800"}`} />
            ))}
          </div>
          <div className="font-mono text-[11px] tracking-widest uppercase text-zinc-500">
            Using theme:{" "}
            <span style={{ color: THEME_LIST.find((t) => t.id === themeId)?.accent }}>
              {THEME_LIST.find((t) => t.id === themeId)?.name}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-12 py-5 border-b border-surface-border backdrop-blur-md bg-surface/80">
        <a href="/" className="font-serif text-[18px] text-cream no-underline">
          Free<span className="text-indigo">Presentation</span>
        </a>
        <div className="flex items-center">
          <span className="font-mono text-[10px] tracking-wider uppercase text-green-600 bg-green-600/10 border border-green-600/20 px-3 py-1 rounded-[2px]">
            Always Free
          </span>
        </div>
      </nav>

      <main className="grid grid-cols-1 md:grid-cols-[1fr_380px] min-h-screen pt-[73px]">
        <div className="px-6 md:px-14 py-10 md:py-16 border-r border-surface-border">
          <div className="font-mono text-[10px] tracking-widest uppercase text-indigo mb-4 flex items-center gap-2 before:content-[''] before:block before:w-4 before:h-[1px] before:bg-indigo">
            New Presentation
          </div>
          <h1 className="font-serif text-[36px] md:text-[52px] leading-none tracking-tight text-cream mb-10">
            What&apos;s it about?
          </h1>

          <div className="flex gap-0 border border-surface-border-light rounded-[3px] overflow-hidden mb-7 w-fit">
            {(["prompt", "upload", "paste", "url"] as Tab[]).map((t) => (
              <button
                key={t}
                className={`bg-transparent border-none px-5 py-2.5 font-mono text-[11px] tracking-wide uppercase cursor-pointer transition-all duration-200 border-r border-surface-border-light last:border-r-0 ${
                  tab === t
                    ? "bg-indigo text-white"
                    : "text-zinc-500 hover:text-cream hover:bg-surface-subtle"
                }`}
                onClick={() => setTab(t)}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="mb-8">
            {tab === "prompt" && (
              <div>
                <textarea
                  className="w-full bg-[#0c0c0c] border border-surface-border-light focus:border-indigo text-cream rounded-[3px] p-5 resize-y font-sans text-[15px] leading-relaxed font-light outline-none transition-colors duration-200 placeholder:text-zinc-700"
                  placeholder="e.g. The impact of remote collaboration on team productivity…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                />
                <div className="font-mono text-[10px] tracking-wider uppercase text-zinc-700 mt-5 mb-3">
                  Or try an example:
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      className="bg-transparent border border-surface-border-light text-zinc-500 hover:border-indigo hover:text-indigo-300 hover:bg-indigo/4 px-3.5 py-1.5 rounded-[2px] text-xs cursor-pointer transition-all duration-200 text-left font-sans"
                      onClick={() => setPrompt(ex)}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "upload" && (
              <div
                className={`border border-dashed rounded-[3px] px-8 py-12 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? "border-indigo bg-indigo/4"
                    : file
                    ? "border-solid border-indigo"
                    : "border-zinc-800 hover:border-indigo hover:bg-indigo/4"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setFile(e.target.files[0]);
                  }}
                />
                {file ? (
                  <div className="flex items-center gap-4 text-left justify-center">
                    <div className="bg-indigo/10 border border-indigo/30 text-indigo px-3 py-2 rounded-[2px] font-mono text-[11px] tracking-wide">
                      PDF
                    </div>
                    <div>
                      <div className="text-sm text-cream mb-0.5">{file.name}</div>
                      <div className="font-mono text-[11px] text-zinc-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      className="bg-transparent border-none text-zinc-500 hover:text-cream text-xl cursor-pointer ml-auto transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="text-[28px] text-zinc-700 mb-3">↑</div>
                    <div className="font-serif text-xl text-cream mb-1.5">Drop a PDF here</div>
                    <div className="text-xs text-zinc-700 font-mono tracking-wide">
                      or click to browse · PDF only
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "paste" && (
              <textarea
                className="w-full bg-[#0c0c0c] border border-surface-border-light focus:border-indigo text-cream rounded-[3px] p-5 resize-y font-sans text-[15px] leading-relaxed font-light outline-none transition-colors duration-200 placeholder:text-zinc-700"
                placeholder="Paste your notes, outline, or any text here. We'll turn it into slides."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
              />
            )}

            {tab === "url" && (
              <div>
                <input
                  type="url"
                  className="w-full bg-[#0c0c0c] border border-surface-border-light focus:border-indigo text-cream rounded-[3px] p-5 font-sans text-[15px] outline-none transition-colors duration-200 placeholder:text-zinc-700"
                  placeholder="e.g. https://en.wikipedia.org/wiki/Artificial_intelligence"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <div className="font-mono text-[10px] tracking-wider uppercase text-zinc-700 mt-3">
                  Enter any article, blog post, or webpage URL to scrape and convert to slides.
                </div>
              </div>
            )}
          </div>

          {/* Customizations: Audience, Tone, and Slide Count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-zinc-500 mb-2">Target Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full bg-[#0c0c0c] border border-surface-border-light focus:border-indigo text-cream rounded-[3px] px-3.5 py-3 font-sans text-xs md:text-sm outline-none transition-colors duration-200 cursor-pointer"
              >
                <option value="General Public">General Public</option>
                <option value="Investors / Venture Capital">Investors / Venture Capital</option>
                <option value="Business Professionals">Business Professionals</option>
                <option value="Students / Academic">Students / Academic</option>
                <option value="Technical / Developers">Technical / Developers</option>
                <option value="Creative / Designers">Creative / Designers</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-zinc-500 mb-2">Tone of Voice</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-[#0c0c0c] border border-surface-border-light focus:border-indigo text-cream rounded-[3px] px-3.5 py-3 font-sans text-xs md:text-sm outline-none transition-colors duration-200 cursor-pointer"
              >
                <option value="Professional & Clean">Professional & Clean</option>
                <option value="Persuasive & Convincing">Persuasive & Convincing</option>
                <option value="Casual & Conversational">Casual & Conversational</option>
                <option value="Inspirational & Bold">Inspirational & Bold</option>
                <option value="Analytical & Detailed">Analytical & Detailed</option>
                <option value="Witty & Humorous">Witty & Humorous</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-zinc-500 mb-2">Slide Count</label>
              <select
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value, 10))}
                className="w-full bg-[#0c0c0c] border border-surface-border-light focus:border-indigo text-cream rounded-[3px] px-3.5 py-3 font-sans text-xs md:text-sm outline-none transition-colors duration-200 cursor-pointer"
              >
                <option value="8">8 Slides (Short & Sweet)</option>
                <option value="10">10 Slides (Standard Pitch)</option>
                <option value="12">12 Slides (Detailed)</option>
                <option value="15">15 Slides (Comprehensive)</option>
              </select>
            </div>
          </div>

          <button
            className={`group w-full border font-mono text-[13px] tracking-wide uppercase cursor-pointer flex items-center justify-between px-8 py-[18px] rounded-[3px] transition-all duration-250 ${
              (tab === "prompt" && prompt.trim()) ||
              (tab === "paste" && pasteText.trim()) ||
              (tab === "upload" && file) ||
              (tab === "url" && urlInput.trim())
                ? "bg-cream border-cream text-[#080808] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,228,220,0.12)]"
                : "bg-[#1a1a1a] border-zinc-800 text-zinc-500"
            }`}
            onClick={handleGenerate}
          >
            <span>Generate presentation</span>
            <span className="text-lg transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </button>

          <div className="font-mono text-[10px] tracking-wider uppercase text-zinc-700 text-center mt-4">
            10–15 slides · Real images · Export-ready · No watermark
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-[3px] color-[#f87171] font-mono text-xs tracking-wide">
              {error}
            </div>
          )}
        </div>

        <div className="px-8 py-10 md:py-16 bg-[#060606] md:sticky md:top-[73px] md:h-[calc(100vh-73px)] overflow-y-auto [&::-webkit-scrollbar]:w-0">
          <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-700 mb-6">
            Choose a theme
          </div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {THEME_LIST.map((theme) => {
              const isSelected = themeId === theme.id;
              return (
                <button
                  key={theme.id}
                  className={`bg-transparent border rounded-[4px] p-3 cursor-pointer transition-all duration-200 relative ${
                    isSelected ? "" : "border-surface-border-light hover:border-zinc-700"
                  }`}
                  onClick={() => setThemeId(theme.id)}
                  style={{
                    borderColor: isSelected ? theme.accent : undefined,
                  }}
                >
                  <div
                    className="rounded-[3px] p-3 mb-2 h-[90px]"
                    style={{ background: theme.bg, border: `1px solid ${theme.border}` }}
                  >
                    <div
                      style={{
                        background: theme.accent,
                        height: 2,
                        width: "35%",
                        borderRadius: 1,
                        marginBottom: 8,
                      }}
                    />
                    <div
                      style={{
                        background: theme.text,
                        height: 7,
                        width: "85%",
                        borderRadius: 2,
                        opacity: 0.9,
                        marginBottom: 5,
                      }}
                    />
                    <div
                      style={{
                        background: theme.text,
                        height: 4,
                        width: "100%",
                        borderRadius: 2,
                        opacity: 0.3,
                        marginBottom: 3,
                      }}
                    />
                    <div
                      style={{
                        background: theme.text,
                        height: 4,
                        width: "70%",
                        borderRadius: 2,
                        opacity: 0.3,
                        marginBottom: 10,
                      }}
                    />
                    <div style={{ background: theme.border, height: 40, borderRadius: 3, opacity: 0.6 }} />
                    <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
                      {[100, 70, 85].map((w, i) => (
                        <div
                          key={i}
                          style={{
                            background: theme.text,
                            height: 3,
                            width: `${w / 3}px`,
                            borderRadius: 1,
                            opacity: 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div
                    className="font-mono text-[10px] tracking-wide uppercase transition-colors duration-200 text-left"
                    style={{ color: isSelected ? theme.accent : "#52525b" }}
                  >
                    {theme.name}
                  </div>
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                      style={{ background: theme.accent }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-surface-border pt-6 flex items-center justify-between">
            <div className="font-mono text-[10px] tracking-wider uppercase text-zinc-700">
              Selected
            </div>
            <div
              className="font-serif text-xl tracking-tight transition-colors duration-300"
              style={{ color: THEME_LIST.find((t) => t.id === themeId)?.accent }}
            >
              {THEME_LIST.find((t) => t.id === themeId)?.name}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
