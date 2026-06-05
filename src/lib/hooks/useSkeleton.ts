import { useCallback } from "react";
import { usePresentationStore } from "@/store/presentationStore";

/**
 * useSkeleton — wraps any async operation with skeleton loader visibility.
 *
 * Usage:
 * ```ts
 * const { withSkeleton } = useSkeleton();
 *
 * await withSkeleton(async () => {
 *   const data = await fetchSomething();
 *   // …
 * });
 * ```
 */
export function useSkeleton() {
  const setIsSkeletonVisible = usePresentationStore(
    (s) => s.setIsSkeletonVisible
  );
  const isSkeletonVisible = usePresentationStore((s) => s.isSkeletonVisible);

  /**
   * Runs `fn` while showing the skeleton loader.
   * Skeleton is hidden again when the promise resolves or rejects.
   */
  const withSkeleton = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setIsSkeletonVisible(true);
      try {
        return await fn();
      } finally {
        setIsSkeletonVisible(false);
      }
    },
    [setIsSkeletonVisible]
  );

  return { withSkeleton, isSkeletonVisible };
}
