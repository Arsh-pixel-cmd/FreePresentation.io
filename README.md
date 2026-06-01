# FreePresentation

**AI-powered presentation builder. 100% free. No watermarks. No limits.**

Build beautiful, export-ready presentations from a topic, a PDF upload, or pasted notes — in under 30 seconds.

---

## ✦ Features

| Feature | Details |
|---------|---------|
| **AI Generation** | Gemini Flash (primary) → DeepSeek (fallback) |
| **Input Modes** | Prompt · PDF Upload · Paste text |
| **Slide Count** | 10–15 slides per presentation |
| **Layouts** | title · content · two-col · image-right · image-left · image-full · quote · stats |
| **Themes** | Obsidian · Arctic · Aurora · Ember · Sage · Slate |
| **Images** | Unsplash API + Pollinations.ai fallback (no key required) |
| **Editor** | Click to edit · drag to reorder · add / delete slides |
| **Export** | .pptx (pptxgenjs) · .pdf (jsPDF) — no watermarks |
| **Queue** | Upstash Redis + QStash for rate limiting |
| **Monitoring** | Sentry (errors) + PostHog (analytics) |

---

## ⚡ Quick Start

### 1. Clone and install

```bash
git clone https://github.com/yourname/freepresentation.git
cd freepresentation
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in the values in `.env.local`. The only **required** keys to get started are:

```
GEMINI_API_KEY=        # Google Gemini (free tier works)
```

Everything else is optional — the app degrades gracefully without Unsplash, Upstash, etc.

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── page.tsx                    → Landing page (/)
│   ├── page-landing.tsx            → Landing component
│   ├── create/
│   │   ├── page.tsx                → Create route (/create)
│   │   └── create-page.tsx         → Create component
│   ├── editor/[id]/
│   │   └── page.tsx                → Editor route (/editor/:id)
│   ├── api/
│   │   ├── generate/route.ts       → POST: AI slide generation
│   │   ├── images/route.ts         → GET/POST: image fetching
│   │   ├── parse/route.ts          → POST: PDF text extraction
│   │   └── export/
│   │       ├── pptx/route.ts       → POST: PPTX export
│   │       └── pdf/route.ts        → POST: PDF export
│   ├── globals.css
│   └── layout.tsx
├── components/
│   └── editor/
│       └── SlideEditor.tsx         → Reusable editor component
├── lib/
│   ├── themes/themes.ts            → 6 theme configs
│   └── queue/upstash.ts            → Rate limiting + job queue
├── store/
│   └── presentationStore.ts        → Zustand state + localStorage
├── types/
│   └── presentation.ts             → All TypeScript types
└── monitoring/
    ├── sentry.ts                   → Sentry error tracking
    └── posthog.ts                  → PostHog analytics
```

---

## 🔄 Generation Flow

```
User Input (prompt / PDF / paste)
        ↓
/api/parse (if PDF) → extract text with pdf.js + tesseract.js
        ↓
/api/generate → Gemini Flash builds 12-slide JSON
        ↓  (fallback: DeepSeek)
For each slide: fetch image from Unsplash → Pollinations.ai
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

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` 14 | Framework (App Router) |
| `zustand` | State management |
| `pptxgenjs` | PowerPoint export |
| `jspdf` | PDF export |
| `pdfjs-dist` | PDF text extraction |
| `tesseract.js` | OCR for scanned PDFs |
| `@upstash/redis` | Rate limiting |
| `@upstash/qstash` | Job queuing |
| `lenis` | Smooth scroll |
| `framer-motion` | Animations |
| `@dnd-kit/*` | Drag-to-reorder |
| `@sentry/nextjs` | Error tracking |
| `posthog-js` | Analytics |

---

## 🔑 API Keys Setup

### Google Gemini (Required)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add to `.env.local` as `GEMINI_API_KEY`

### DeepSeek (Optional fallback)

1. Go to [DeepSeek Platform](https://platform.deepseek.com/api_keys)
2. Create API key
3. Add as `DEEPSEEK_API_KEY`

### Unsplash (Optional)

1. Go to [Unsplash Developers](https://unsplash.com/developers)
2. Create an app
3. Add Access Key as `UNSPLASH_ACCESS_KEY`

> **Note:** Without this, Pollinations.ai is used automatically. No setup needed.

### Upstash (Optional)

1. Go to [Upstash Console](https://console.upstash.com)
2. Create a Redis database
3. Create a QStash instance
4. Add the URLs and tokens to `.env.local`

> **Note:** Without this, rate limiting is skipped gracefully.

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in Vercel Dashboard → Settings → Environment Variables.

### Important Vercel settings

- **Function timeout**: Set to 60s for `/api/generate` and `/api/export/*` (Pro plan)
- **Max request size**: Set to 10MB for PDF upload support

---

## 📋 What You Need to Add (Auth + DB)

The project is set up to accept your own auth and database. Suggested stack:

```
Auth:     NextAuth.js (v5) or Clerk
Database: Supabase (PostgreSQL) or PlanetScale (MySQL)
ORM:      Prisma or Drizzle
```

Add a `presentations` table:

```sql
CREATE TABLE presentations (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  title       TEXT NOT NULL,
  topic       TEXT,
  slides      JSONB NOT NULL,
  theme_id    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

Replace `localStorage` persistence in `presentationStore.ts` with API calls to your DB.

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

Built with  using Next.js 14, Gemini, and zero paywalls.
