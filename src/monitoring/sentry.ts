import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === "console") return null;
        return breadcrumb;
      },
    });
  }
}

export function captureGenerationError(
  error: unknown,
  context: { mode: string; themeId: string; promptLength?: number }
) {
  Sentry.withScope((scope) => {
    scope.setTag("feature", "generation");
    scope.setContext("generation", context);
    Sentry.captureException(error);
  });
}

export function captureExportError(
  error: unknown,
  context: { format: "pptx" | "pdf"; slideCount: number }
) {
  Sentry.withScope((scope) => {
    scope.setTag("feature", "export");
    scope.setContext("export", context);
    Sentry.captureException(error);
  });
}
