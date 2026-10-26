/**
 * Cloudflare Turnstile token verification helper.
 * Validates invisible human verification tokens to protect unauthenticated AI generation endpoints.
 */

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export async function verifyTurnstileToken(
  token?: string | null,
  remoteIp?: string | null
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  // Development bypass: if Turnstile secret is not configured, allow requests to proceed seamlessly
  if (!secretKey || secretKey === "your_turnstile_secret_key_here") {
    return { success: true };
  }

  if (!token) {
    return {
      success: false,
      error: "Cloudflare Turnstile verification token is missing.",
    };
  }

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = (await response.json()) as TurnstileVerifyResponse;

    if (!result.success) {
      return {
        success: false,
        error: `Turnstile verification failed: ${result["error-codes"]?.join(", ") || "invalid_token"}`,
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[Turnstile] Verification request error:", err);
    // If the Cloudflare endpoint is unreachable or times out, fail closed if enforced
    return {
      success: false,
      error: "Unable to verify Turnstile token due to upstream network issue.",
    };
  }
}
