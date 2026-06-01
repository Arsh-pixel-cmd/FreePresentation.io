import { NextRequest, NextResponse } from "next/server";

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "presentation background";
  const source = searchParams.get("source") || "auto";

  const result = await fetchImage(query, source);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { queries } = await req.json();

  if (!Array.isArray(queries) || queries.length === 0) {
    return NextResponse.json({ error: "queries array required" }, { status: 400 });
  }

  const images = await Promise.all(
    queries.map(async (query: string) => {
      const result = await fetchImage(query, "auto");
      return { query, ...result };
    })
  );

  return NextResponse.json({ images });
}

async function fetchImage(query: string, source: string) {
  if ((source === "auto" || source === "unsplash") && UNSPLASH_KEY) {
    const unsplash = await tryUnsplash(query);
    if (unsplash) return unsplash;
  }

  const pollinationsUrl = buildPollinationsUrl(query);
  return {
    url: pollinationsUrl,
    credit: "Pollinations.ai",
    source: "pollinations",
  };
}

async function tryUnsplash(query: string) {
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      url: data.urls?.regular,
      thumbUrl: data.urls?.thumb,
      credit: `Photo by ${data.user?.name} on Unsplash`,
      creditUrl: `${data.links?.html}?utm_source=freepresentation&utm_medium=referral`,
      source: "unsplash",
    };
  } catch {
    return null;
  }
}

function buildPollinationsUrl(query: string): string {
  const enhancedQuery = `${query}, professional photography, high quality, 16:9`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedQuery)}?width=1280&height=720&nologo=true&enhance=true`;
}
