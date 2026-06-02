import { createClient } from "./server";

const hasSupabaseConfig = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url_here"
);

/**
 * Downloads an external image (Unsplash or Pollinations) and caches it in Supabase Storage.
 * Returns the public CDN URL if successful, otherwise falls back to the original URL.
 */
export async function uploadExternalImageToStorage(imageUrl: string, filename: string): Promise<string> {
  if (!hasSupabaseConfig) {
    return imageUrl;
  }

  try {
    const supabase = await createClient();

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Guest mode - do not cache in cloud storage
      return imageUrl;
    }

    // Fetch the image content
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";

    const storagePath = `${user.id}/${filename}`;

    // Upload to 'presentation-assets' bucket
    const { data, error } = await supabase.storage
      .from("presentation-assets")
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error("[Supabase Storage] Upload error:", error);
      return imageUrl;
    }

    // Retrieve public URL
    const { data: { publicUrl } } = supabase.storage
      .from("presentation-assets")
      .getPublicUrl(storagePath);

    return publicUrl;
  } catch (err) {
    console.warn("[Supabase Storage] Failed to cache image, using original url:", err);
    return imageUrl;
  }
}
