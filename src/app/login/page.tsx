"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          },
        });
        if (error) throw error;
        setSuccess("Check your email for a confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = "/create";
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-12 py-5 border-b border-surface-border backdrop-blur-md bg-surface/80">
        <Link href="/" className="font-serif text-[18px] text-cream no-underline">
          Free<span className="text-indigo">Presentation</span>
        </Link>
        <Link
          href="/create"
          className="font-mono text-[10px] tracking-wider uppercase text-zinc-500 hover:text-cream bg-transparent border border-surface-border-light hover:border-zinc-700 px-4 py-2.5 rounded-[2px] no-underline transition-colors duration-150"
        >
          Skip → Guest Mode
        </Link>
      </nav>

      <main className="min-h-screen flex items-center justify-center px-6 pt-[73px] bg-surface">
        <div className="w-full max-w-[420px]">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="font-mono text-[10px] tracking-widest uppercase text-indigo mb-4 flex items-center justify-center gap-2 before:content-[''] before:block before:w-4 before:h-[1px] before:bg-indigo after:content-[''] after:block after:w-4 after:h-[1px] after:bg-indigo">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </div>
            <h1 className="font-serif text-[36px] md:text-[44px] leading-none tracking-tight text-cream mb-3">
              {mode === "login" ? "Sign in" : "Get started"}
            </h1>
            <p className="text-zinc-500 text-sm font-light">
              {mode === "login"
                ? "Access your presentations from anywhere."
                : "Create your account to save presentations to the cloud."}
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              className="flex-1 bg-transparent border border-surface-border-light hover:border-zinc-700 hover:bg-surface-subtle text-cream py-3.5 rounded-[3px] font-mono text-[11px] tracking-wide uppercase cursor-pointer transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("github")}
              className="flex-1 bg-transparent border border-surface-border-light hover:border-zinc-700 hover:bg-surface-subtle text-cream py-3.5 rounded-[3px] font-mono text-[11px] tracking-wide uppercase cursor-pointer transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="font-mono text-[9px] tracking-widest uppercase text-zinc-700">
              or continue with email
            </span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block font-mono text-[10px] tracking-wider uppercase text-zinc-500 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#0c0c0c] border border-surface-border-light focus:border-indigo text-cream rounded-[3px] px-4 py-3.5 font-sans text-[14px] outline-none transition-colors duration-200 placeholder:text-zinc-700"
                  placeholder="Jane Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-zinc-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0c0c0c] border border-surface-border-light focus:border-indigo text-cream rounded-[3px] px-4 py-3.5 font-sans text-[14px] outline-none transition-colors duration-200 placeholder:text-zinc-700"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-zinc-500 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0c0c0c] border border-surface-border-light focus:border-indigo text-cream rounded-[3px] px-4 py-3.5 font-sans text-[14px] outline-none transition-colors duration-200 placeholder:text-zinc-700"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-[3px] text-red-400 font-mono text-xs tracking-wide">
                {error}
              </div>
            )}

            {success && (
              <div className="px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-[3px] text-green-400 font-mono text-xs tracking-wide">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`group w-full border font-mono text-[13px] tracking-wide uppercase cursor-pointer flex items-center justify-between px-6 py-[16px] rounded-[3px] transition-all duration-250 ${
                loading
                  ? "bg-[#1a1a1a] border-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-cream border-cream text-[#080808] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,228,220,0.12)]"
              }`}
            >
              <span>
                {loading
                  ? "Processing…"
                  : mode === "login"
                  ? "Sign in"
                  : "Create account"}
              </span>
              <span className="text-lg transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center mt-8 pb-12">
            <span className="text-zinc-600 text-sm">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
                setSuccess(null);
              }}
              className="bg-transparent border-none text-indigo hover:text-indigo-hover text-sm cursor-pointer underline underline-offset-4 transition-colors duration-200"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
