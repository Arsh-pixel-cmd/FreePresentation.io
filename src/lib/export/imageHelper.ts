/**
 * Image helper for presentation exports (PPTX / PDF).
 * Converts local data URLs or fetches remote images with a timeout,
 * returning base64 data URLs suitable for embedding.
 */
export interface ExportImage {
  dataUrl: string;
  format: "JPEG" | "PNG";
}

export async function resolveExportImage(
  url?: string,
  timeoutMs = 5000
): Promise<ExportImage | null> {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Already a base64 data URL
  if (trimmed.startsWith("data:")) {
    const isPng = trimmed.includes("image/png");
    return {
      dataUrl: trimmed,
      format: isPng ? "PNG" : "JPEG",
    };
  }

  // Remote HTTP/HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(trimmed, {
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });
      clearTimeout(timer);

      if (!res.ok) return null;

      const arrayBuf = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const isPng = contentType.toLowerCase().includes("png");
      const base64 = Buffer.from(arrayBuf).toString("base64");
      const mime = isPng ? "image/png" : "image/jpeg";

      return {
        dataUrl: `data:${mime};base64,${base64}`,
        format: isPng ? "PNG" : "JPEG",
      };
    } catch {
      // Gracefully return null if fetch times out or fails (e.g. offline, rate limit)
      return null;
    }
  }

  return null;
}

