import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";

// Dialogs API — Promise-shaped wrappers around the shadcn Dialog
// primitive that replace the broken native window.confirm() / alert()
// calls (zero-native's WKWebView host doesn't implement the JS panel
// delegate methods, so the natives silently no-op).
//
// Usage:
//   const confirm = useConfirm();
//   if (await confirm({ title: "Delete?", description: "...", danger: true })) {
//     // ...
//   }
//
//   const alert = useAlert();
//   await alert({ title: "Build failed", description: "..." });
//
// The provider must be mounted at the App.tsx root for these hooks to
// resolve. Each call enqueues a request; the provider renders one
// Dialog at a time and resolves the Promise from the user's choice.

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Render the confirm button in the danger style (red bg). For
  // destructive operations: deletes, resets, history clears.
  danger?: boolean;
};

export type AlertOptions = {
  title: string;
  description?: string;
  okLabel?: string;
};

type DialogRequest =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "alert"; opts: AlertOptions; resolve: () => void };

type DialogsApi = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
};

const DialogsContext = createContext<DialogsApi | null>(null);

// useConfirm — returns a Promise<boolean>. Resolves true on confirm,
// false on cancel / ESC / outside-click.
export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error("useConfirm requires <DialogsProvider> at the React tree root");
  return ctx.confirm;
}

// useAlert — returns a Promise<void>. Resolves when the user clicks OK
// or dismisses the dialog. Use for one-line notifications where toast
// would be too transient (e.g. a fatal error the user must acknowledge).
export function useAlert(): (opts: AlertOptions) => Promise<void> {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error("useAlert requires <DialogsProvider> at the React tree root");
  return ctx.alert;
}

export function DialogsProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DialogRequest | null>(null);
  // Pending queue — calls during an open dialog wait until it closes.
  const queueRef = useRef<DialogRequest[]>([]);

  const advance = useCallback(() => {
    const next = queueRef.current.shift();
    setCurrent(next ?? null);
  }, []);

  const enqueue = useCallback(
    (req: DialogRequest) => {
      if (current === null) {
        setCurrent(req);
      } else {
        queueRef.current.push(req);
      }
    },
    [current]
  );

  const api = useMemo<DialogsApi>(
    () => ({
      confirm: (opts) =>
        new Promise<boolean>((resolve) => {
          enqueue({ kind: "confirm", opts, resolve });
        }),
      alert: (opts) =>
        new Promise<void>((resolve) => {
          enqueue({ kind: "alert", opts, resolve });
        }),
    }),
    [enqueue]
  );

  const onConfirmAccept = useCallback(() => {
    if (current?.kind === "confirm") current.resolve(true);
    else if (current?.kind === "alert") current.resolve();
    advance();
  }, [current, advance]);

  const onConfirmCancel = useCallback(() => {
    if (current?.kind === "confirm") current.resolve(false);
    else if (current?.kind === "alert") current.resolve();
    advance();
  }, [current, advance]);

  const open = current !== null;

  return (
    <DialogsContext.Provider value={api}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) onConfirmCancel();
        }}
      >
        {current && (
          <DialogContent
            showCloseButton={false}
            // role=alertdialog for confirm so screen readers announce
            // the destructive action clearly. role=dialog for alert.
            role={current.kind === "confirm" ? "alertdialog" : "dialog"}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onConfirmAccept();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>{current.opts.title}</DialogTitle>
              {current.opts.description && (
                <DialogDescription>{current.opts.description}</DialogDescription>
              )}
            </DialogHeader>
            <DialogFooter>
              {current.kind === "confirm" && (
                <Button variant="outline" onClick={onConfirmCancel}>
                  {current.opts.cancelLabel || "Cancel"}
                </Button>
              )}
              <Button
                variant={current.kind === "confirm" && current.opts.danger ? "danger" : "primary"}
                onClick={onConfirmAccept}
                autoFocus
              >
                {current.kind === "confirm"
                  ? current.opts.confirmLabel || "Confirm"
                  : current.opts.okLabel || "OK"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </DialogsContext.Provider>
  );
}
