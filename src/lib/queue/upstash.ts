import { Redis } from "@upstash/redis";
import { Client as QStashClient } from "@upstash/qstash";

const hasRedisConfig = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const hasQStashConfig = !!process.env.QSTASH_TOKEN;

export const redis = hasRedisConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export const qstash = hasQStashConfig
  ? new QStashClient({
      token: process.env.QSTASH_TOKEN!,
    })
  : null;

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 10;

export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetIn: number;
}> {
  if (!redis) {
    return { allowed: true, remaining: RATE_LIMIT_MAX, resetIn: RATE_LIMIT_WINDOW };
  }

  const key = `rl:gen:${ip}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    const ttl = await redis.ttl(key);
    const allowed = current <= RATE_LIMIT_MAX;
    return {
      allowed,
      remaining: Math.max(0, RATE_LIMIT_MAX - current),
      resetIn: ttl,
    };
  } catch (err) {
    console.warn("Rate limiting check failed, bypassing:", err);
    return { allowed: true, remaining: RATE_LIMIT_MAX, resetIn: RATE_LIMIT_WINDOW };
  }
}

export type JobStatus = "pending" | "processing" | "done" | "failed";

export interface JobRecord {
  id: string;
  status: JobStatus;
  presentationId?: string;
  error?: string;
  createdAt: number;
}

export async function createJob(jobId: string): Promise<void> {
  if (!redis) return;
  try {
    const record: JobRecord = {
      id: jobId,
      status: "pending",
      createdAt: Date.now(),
    };
    await redis.set(`job:${jobId}`, JSON.stringify(record), { ex: 3600 });
  } catch (err) {
    console.error("Failed to create job in store:", err);
  }
}

export async function updateJob(
  jobId: string,
  updates: Partial<JobRecord>
): Promise<void> {
  if (!redis) return;
  try {
    const existing = await redis.get<string>(`job:${jobId}`);
    if (!existing) return;
    const record = { ...JSON.parse(existing), ...updates };
    await redis.set(`job:${jobId}`, JSON.stringify(record), { ex: 3600 });
  } catch (err) {
    console.error("Failed to update job in store:", err);
  }
}

export async function getJob(jobId: string): Promise<JobRecord | null> {
  if (!redis) return null;
  try {
    const record = await redis.get<string>(`job:${jobId}`);
    if (!record) return null;
    return JSON.parse(record);
  } catch (err) {
    console.error("Failed to retrieve job from store:", err);
    return null;
  }
}

export async function queueGenerationJob(payload: {
  jobId: string;
  mode: string;
  prompt?: string;
  text?: string;
  themeId: string;
}): Promise<void> {
  if (!qstash) {
    console.warn("QStash is not configured. Falling back to synchronous processing.");
    return;
  }
  await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/generate/worker`,
    body: payload,
    retries: 2,
    delay: 0,
  });
}
