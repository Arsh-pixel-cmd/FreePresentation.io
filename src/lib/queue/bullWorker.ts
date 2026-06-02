import { Queue, Worker, Job } from "bullmq";

const connectionOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  username: process.env.REDIS_USERNAME || undefined,
};

// Initialize the main background export/generation queue
export const taskQueue = new Queue("presentation-tasks", {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

/**
 * Helper function to schedule a background task
 */
export async function addQueueTask(name: string, data: any) {
  try {
    const job = await taskQueue.add(name, data);
    console.log(`[BullMQ] Enqueued job: ${job.id} for task: ${name}`);
    return job;
  } catch (error) {
    console.error(`[BullMQ] Failed to enqueue job for task: ${name}`, error);
    throw error;
  }
}

let worker: Worker | null = null;

/**
 * Start the BullMQ worker to process background exports and generation tasks.
 * Typically called during server instrumentation or custom background processor bootstrap.
 */
export function startBullWorker() {
  if (worker) return worker;

  console.log("[BullMQ] Starting background worker connection...");

  worker = new Worker(
    "presentation-tasks",
    async (job: Job) => {
      console.log(`[BullMQ] Processing job ${job.id} of name ${job.name}`);
      
      switch (job.name) {
        case "generate-outline":
          // Stub for outline processing
          console.log("[BullMQ] Processing outline task:", job.data);
          break;
        case "export-presentation":
          // Stub for heavy PPTX/PDF generation/upload task
          console.log("[BullMQ] Processing export task:", job.data);
          break;
        default:
          console.warn(`[BullMQ] Received unknown job type: ${job.name}`);
      }
    },
    {
      connection: connectionOptions,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[BullMQ] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[BullMQ] Job ${job?.id} failed with error:`, err);
  });

  return worker;
}
