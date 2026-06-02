import { NextRequest, NextResponse } from "next/server";

function cleanHtmlText(html: string): string {
  let text = html;
  
  // Remove scripts, styles, head
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  
  // Remove navigation, headers, footers, sidebars to avoid scraping site nav
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  text = text.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");
  
  // Replace block elements and line breaks with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>|<\/tr>|<\/section>/gi, "\n");
  
  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "-");
    
  // Collapse whitespace
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
    
  return text.substring(0, 8000);
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }
    
    // Ensure valid URL scheme
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }
    
    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch page. Status: ${response.status}` }, { status: 422 });
    }
    
    const html = await response.text();
    const scrapedText = cleanHtmlText(html);
    
    if (!scrapedText || scrapedText.length < 50) {
      return NextResponse.json({ error: "No substantial content found on this webpage. Please try copying and pasting it instead." }, { status: 422 });
    }
    
    return NextResponse.json({
      text: scrapedText,
      charCount: scrapedText.length,
      title: targetUrl.hostname
    });
  } catch (err: any) {
    console.error("URL Scraper error:", err);
    return NextResponse.json({ error: err.message || "Failed to parse webpage" }, { status: 500 });
  }
}
