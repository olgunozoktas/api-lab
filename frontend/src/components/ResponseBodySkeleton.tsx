/** Olgun Özoktaş geliştirdi · API Lab */
import { Skeleton } from "./ui/skeleton";

// Placeholder for the response body slot while a request is in-flight
// (shown only past the delay-show threshold — see useDelayedFlag).
// Decorative — `aria-hidden`; the request's busy state is announced
// elsewhere.
export function ResponseBodySkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3" aria-hidden>
      <Skeleton className="h-3 w-2/5" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
