/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect, useState } from "react";
import { APP_VERSION, isNewer } from "./changelog";
import { getLastSeen, markSeen } from "./changelog_seen";

// React hook — wires auto-open on launch. Returns the modal `open`
// state plus a setter the modal's `onOpenChange` should pipe back.
//
// Behavior:
//   - On mount, read lastSeen from IDB. If APP_VERSION > lastSeen,
//     open the modal AND immediately persist APP_VERSION as seen
//     (so closing it without reading still consumes the auto-trigger
//     — better than re-opening every launch when the user dismisses).
//   - Manual opens (via the help-menu button) bypass markSeen entirely
//     because the caller controls that path; the hook only writes when
//     it auto-opens.
export function useChangelogAutoOpen(): {
  open: boolean;
  setOpen: (next: boolean) => void;
} {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seen = await getLastSeen();
      if (cancelled) return;
      if (isNewer(APP_VERSION, seen)) {
        setOpen(true);
        // Mark seen immediately — auto-trigger fires once per upgrade.
        // Opening manually later is a no-op for `seen`.
        await markSeen(APP_VERSION);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { open, setOpen };
}
