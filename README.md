# FreePresentation.io

**AI-powered presentation builder. 100% free. No watermarks. No limits.**

Build beautiful, export-ready presentations from a topic, a PDF upload, or pasted notes — in under 30 seconds.

> **Live:** [freepresentation.io](https://freepresentation.io)

---

## ✦ Features

| Feature | Details |
|---------|---------|
| **AI Generation** | NVIDIA Nemotron 3 Ultra (primary) → Google Gemma 4 31B (fallback) via NVIDIA API |
| **Input Modes** | Prompt · PDF Upload · Paste text |
| **Slide Count** | Configurable (default 12 slides) |
| **Layouts** | title · content · two-col · image-right · image-left · image-full · quote · stats |
| **Themes** | Obsidian · Arctic · Aurora · Ember · Sage · Slate |
| **Images** | Unsplash API + Pollinations.ai fallback (no key required) |
| **Editor** | Click to edit · drag to reorder · add / delete slides · annotation canvas |
| **Export** | .pptx (pptxgenjs) · .pdf (jsPDF) — no watermarks |
| **Auth** | Supabase authentication (email + social) |
| **Queue** | Upstash Redis + QStash for rate limiting |
| **Monitoring** | Sentry (errors) + PostHog (analytics) |

---

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Version | Check Command | Install |
|------|---------|---------------|---------|
| **Node.js** | v18.17+ (v20 LTS recommended) | `node -v` | [nodejs.org](https://nodejs.org) |
| **npm** | v9+ (comes with Node) | `npm -v` | Bundled with Node.js |
| **Git** | Any recent version | `git --version` | [git-scm.com](https://git-scm.com) |

---

## ⚡ Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Arsh-pixel-cmd/FreePresentation.io.git
cd FreePresentation.io
```

### 2. Install dependencies

```bash
npm install
```

> This installs all packages listed in `package.json`. It may take a minute on the first run.

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in your API keys. See the **[Environment Variables](#-environment-variables)** section below for details on each key.

**Minimum required to run:**

```env
# At least ONE of these NVIDIA keys (get free keys at https://build.nvidia.com)
NVIDIA_nemotron-3-ultra-550b-a55b_API_KEY=nvapi-xxxxxxxxxxxxx
NVIDIA_diffusiongemma-26b-a4b-it_API_KEY=nvapi-xxxxxxxxxxxxx

# App URL (keep as-is for local dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 🎉

### 5. (Optional) Run other commands

```bash
# Type-check the project (no output = no errors)
npm run type-check

# Lint the codebase
npm run lint

# Create a production build
npm run build

# Start the production server (run build first)
npm start
```

---

## 🔑 Environment Variables

All environment variables are documented in [`.env.example`](.env.example). Copy it to `.env` and fill in your values.

### Required Keys

| Variable | Where to Get It | Purpose |
|----------|----------------|---------|
| `NVIDIA_nemotron-3-ultra-550b-a55b_API_KEY` | [NVIDIA Build](https://build.nvidia.com) → Search "Nemotron" → Get API Key | Primary AI model for slide generation |
| `NVIDIA_diffusiongemma-26b-a4b-it_API_KEY` | [NVIDIA Build](https://build.nvidia.com) → Search "Gemma" → Get API Key | Backup AI model (used if primary times out) |

> **Note:** You need **at least one** NVIDIA key. Both are free. Having both gives you automatic failover.

### Optional Keys (app works without these)

| Variable | Where to Get It | What Happens Without It |
|----------|----------------|------------------------|
| `UNSPLASH_ACCESS_KEY` | [Unsplash Developers](https://unsplash.com/developers) → Create App | Falls back to Pollinations.ai for images |
| `UNSPLASH_SECRET_KEY` | Same as above | Falls back to Pollinations.ai for images |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | PDF OCR parsing uses basic extraction only |
| `UPSTASH_REDIS_REST_URL` | [Upstash Console](https://console.upstash.com) → Create Redis DB | Rate limiting is skipped |
| `UPSTASH_REDIS_REST_TOKEN` | Same as above | Rate limiting is skipped |
| `QSTASH_TOKEN` | [Upstash Console](https://console.upstash.com) → QStash tab | Background job queue disabled |
| `NEXT_PUBLIC_SUPABASE_URL` | [Supabase Dashboard](https://supabase.com/dashboard) → New Project | Auth and DB persistence disabled |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above → Settings → API | Auth and DB persistence disabled |
| `NEXT_PUBLIC_SENTRY_DSN` | [Sentry](https://sentry.io) → Create Project | Error tracking disabled |
| `NEXT_PUBLIC_POSTHOG_KEY` | [PostHog](https://posthog.com) → Project Settings | Analytics disabled |

---

## 🗂️ Project Structure

```
FreePresentation.io/
├── src/
│   ├── app/
│   │   ├── page.tsx                    → Landing page (/)
│   │   ├── layout.tsx                  → Root layout + providers
│   │   ├── globals.css                 → Global styles + Tailwind
│   │   ├── actions.ts                  → Server actions
│   │   ├── create/                     → /create route
│   │   ├── editor/                     → /editor/:id route
│   │   ├── login/                      → /login route (Supabase auth)
│   │   └── api/
│   │       ├── generate/route.ts       → POST: AI slide generation (NVIDIA)
│   │       ├── generate/outline/       → POST: Outline-based generation
│   │       ├── generate/worker/        → Background generation worker
│   │       ├── images/route.ts         → GET/POST: Unsplash image fetching
│   │       ├── parse/route.ts          → POST: PDF text extraction
│   │       ├── export/                 → PPTX + PDF export endpoints
│   │       └── auth/                   → Supabase auth callbacks
│   ├── components/
│   │   ├── CustomCursor.tsx            → Custom cursor effect
│   │   ├── SelectionLoader.tsx         → Selection loading animation
│   │   ├── SkeletonLoader.tsx          → Skeleton placeholder
│   │   ├── SlideAnnotationCanvas.tsx   → Drawing/annotation on slides
│   │   └── ui/                         → Reusable UI components (shadcn)
│   ├── lib/
│   │   ├── themes/themes.ts            → 6 theme configurations
│   │   ├── queue/upstash.ts            → Rate limiting + job queue
│   │   ├── supabase/                   → Supabase client + storage helpers
│   │   ├── hooks/                      → Custom React hooks
│   │   └── utils.ts                    → Utility functions
│   ├── store/
│   │   └── presentationStore.ts        → Zustand state management
│   ├── providers/                      → React context providers
│   ├── monitoring/
│   │   ├── sentry.ts                   → Sentry error tracking
│   │   └── posthog.ts                  → PostHog analytics
│   └── types/
│       └── presentation.ts             → TypeScript type definitions
├── supabase/
│   └── migrations/                     → Database migration files
├── storage/                            → Local file storage
├── .env.example                        → Environment variable template
├── next.config.mjs                     → Next.js configuration
├── tailwind.config.ts                  → Tailwind CSS configuration
├── tsconfig.json                       → TypeScript configuration
└── package.json                        → Dependencies & scripts
```

---

## 🔄 Generation Flow

```
User Input (prompt / PDF / paste)
        ↓
/api/parse (if PDF) → extract text with pdf.js + tesseract.js OCR
        ↓
/api/generate → NVIDIA Nemotron 3 Ultra builds slide JSON
        ↓  (fallback: Google Gemma 4 31B via NVIDIA)
For each slide: fetch image from Unsplash → Pollinations.ai fallback
        ↓
Return Presentation object → save to Zustand store
        ↓
Redirect to /editor/:id
```

---

## 🎨 Slide Themes

| Theme | Background | Accent |
|-------|-----------|--------|
| **Obsidian** | #0a0a0a | #6366f1 (indigo) |
| **Arctic** | #f8fafc | #0ea5e9 (sky blue) |
| **Aurora** | #0f0c29 | #a78bfa (violet) |
| **Ember** | #0f0700 | #f97316 (orange) |
| **Sage** | #f0fdf4 | #16a34a (green) |
| **Slate** | #0d1117 | #38bdf8 (light blue) |

---

## 📦 Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16 | Framework (App Router, React Server Components) |
| `react` | 19 | UI library |
| `tailwindcss` | 3.4 | Utility-first CSS |
| `zustand` | 4.5 | Lightweight state management |
| `framer-motion` | 11 | Animations & transitions |
| `pptxgenjs` | 3.12 | PowerPoint (.pptx) export |
| `jspdf` | 4.2 | PDF export |
| `pdfjs-dist` | 4.4 | PDF text extraction |
| `tesseract.js` | 5.1 | OCR for scanned PDFs |
| `@supabase/supabase-js` | 2.x | Auth + database |
| `@upstash/redis` | 1.x | Rate limiting |
| `@upstash/qstash` | 2.x | Background job queue |
| `@dnd-kit/*` | latest | Drag-to-reorder slides |
| `lenis` | 1.x | Smooth scrolling |
| `@sentry/nextjs` | 10.x | Error tracking |
| `posthog-js` | 1.x | Product analytics |

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "ready to deploy"
   git push origin main
   ```

2. **Import the project on Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select your GitHub repo
   - Vercel auto-detects Next.js

3. **Add environment variables:**
   - Go to **Settings → Environment Variables** in your Vercel project
   - Add all the keys from your `.env` file
   - Make sure to update `NEXT_PUBLIC_APP_URL` to your production domain

4. **Deploy:**
   ```bash
   npx vercel --prod
   ```

### Important Vercel Settings

- **Function timeout**: Set to 60s+ for `/api/generate` and `/api/export/*` (Pro plan recommended)
- **Max request size**: Ensure 10MB+ for PDF upload support

### Other Platforms

The app is a standard Next.js 16 project. It can be deployed to any platform that supports Node.js:
- **Railway**: `railway up`
- **Render**: Connect GitHub repo, set build command to `npm run build`, start command to `npm start`
- **Docker**: Build with `FROM node:20-alpine`, run `npm run build && npm start`

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm install` fails | Make sure you're on Node.js v18.17+. Run `node -v` to check. |
| "NVIDIA API Key not configured" | Add at least one NVIDIA key to your `.env` file. |
| Images not loading | Unsplash key missing — this is fine, Pollinations.ai will be used as fallback. |
| Rate limit errors locally | Either add Upstash keys or remove rate limiting (it gracefully skips if unconfigured). |
| PDF parsing fails | Ensure `pdfjs-dist` installed correctly. Try `npm rebuild`. |
| Build errors with Sentry | Sentry config is optional. Set `SENTRY_ORG` and `SENTRY_PROJECT` or remove `withSentryConfig` wrapper in `next.config.mjs`. |
| Port 3000 already in use | Run with a different port: `npx next dev -p 3001` |

---

## 🤝 Contributing

1. **Fork** the repo
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/FreePresentation.io.git
   cd FreePresentation.io
   ```
3. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install & run**:
   ```bash
   npm install
   cp .env.example .env
   # Fill in your .env keys
   npm run dev
   ```
5. **Make your changes** and test them
6. **Commit** with a descriptive message:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
7. **Push** and open a Pull Request:
   ```bash
   git push origin feature/your-feature-name
   ```

---

## 🛣️ Roadmap

- [ ] User accounts + presentation history
- [ ] Collaborative editing (Yjs / Liveblocks)
- [ ] More slide layouts (timeline, comparison table, cover)
- [ ] Custom font selection per presentation
- [ ] AI image regeneration per slide
- [ ] Presentation sharing via public link
- [ ] Mobile editor view
- [ ] Spline 3D integration in landing hero

---

## 📄 License

MIT — free to use, modify, and distribute.

---

Built with ❤️ using Next.js 16, NVIDIA AI, and zero paywalls.
