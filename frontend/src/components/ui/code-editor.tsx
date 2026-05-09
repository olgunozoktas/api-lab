import { useEffect, useMemo, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, placeholder as placeholderExt, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching, indentOnInput, foldGutter, foldKeymap,
  syntaxHighlighting, defaultHighlightStyle, indentUnit,
} from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { graphql } from "cm6-graphql";
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { cn } from "../../lib/cn";

export type CodeLanguage = "json" | "graphql";

export type CodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  language?: CodeLanguage;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: number;
  className?: string;
};

const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--color-bg-elev)",
      color: "var(--color-fg)",
      fontSize: "12px",
      fontFamily: "var(--font-mono)",
      borderRadius: "6px",
      border: "1px solid var(--color-border)",
    },
    "&.cm-focused": { outline: "none", borderColor: "var(--color-accent)" },
    ".cm-content": { padding: "8px 10px", caretColor: "var(--color-fg)" },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--color-fg-muted)",
      borderRight: "1px solid var(--color-border)",
    },
    ".cm-activeLine": { backgroundColor: "transparent" },
    ".cm-activeLineGutter": { backgroundColor: "transparent" },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
    },
    ".cm-cursor": { borderLeftColor: "var(--color-accent)" },
    ".cm-placeholder": { color: "var(--color-fg-muted)" },
    "&.cm-editor": { height: "100%" },
    ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6" },
  },
  { dark: false },
);

function getLangExtension(lang: CodeLanguage) {
  return lang === "graphql" ? graphql() : json();
}

export function CodeEditor({
  value,
  onChange,
  language = "json",
  readOnly = false,
  placeholder,
  minHeight = 200,
  className,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langCompartment = useMemo(() => new Compartment(), []);
  const readOnlyCompartment = useMemo(() => new Compartment(), []);

  // Init editor once.
  useEffect(() => {
    if (!hostRef.current) return;

    const startState = EditorState.create({
      doc: value,
      extensions: [
        history(),
        bracketMatching(),
        closeBrackets(),                    // PHPStorm-style: typing { auto-inserts }
        indentOnInput(),                    // Re-indent on Enter / closing brace
        indentUnit.of("  "),                // 2-space indent
        autocompletion(),                   // Ctrl-Space + as-you-type completions
        highlightSelectionMatches(),        // Highlight all instances of selected text
        foldGutter(),
        lineNumbers(),
        EditorView.lineWrapping,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...searchKeymap,
          indentWithTab,                    // Tab indents, Shift-Tab outdents
        ]),
        editorTheme,
        langCompartment.of(getLangExtension(language)),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        ...(placeholder ? [placeholderExt(placeholder)] : []),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && onChange) onChange(u.state.doc.toString());
        }),
      ],
    });

    const view = new EditorView({ state: startState, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value change → patch the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  // Language switch.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: langCompartment.reconfigure(getLangExtension(language)) });
  }, [language, langCompartment]);

  // Read-only toggle.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly, readOnlyCompartment]);

  return (
    <div
      ref={hostRef}
      className={cn("w-full overflow-hidden", className)}
      style={{ minHeight }}
    />
  );
}
