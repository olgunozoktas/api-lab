/** Olgun Özoktaş geliştirdi · API Lab */
// Redoc docs preview pane. `redoc` + its peers (mobx, styled-
// components, core-js) are ~1 MB, so this module is only ever reached
// through a dynamic import — `OpenApiEditor` lazy-loads it behind the
// "Docs" toggle. Pure presenter: the parsed spec + theme arrive as
// props.
import { RedocStandalone } from "redoc";

export type RedocPaneProps = {
  // An already-parsed OpenAPI document (the editor parses the YAML/JSON
  // text before handing it here).
  spec: object;
  dark: boolean;
};

// Redoc's theme is a deep object; only the handful of tokens that read
// wrong against API Lab's chrome are overridden. Redoc renders its own
// document body, so the surrounding container fixes the background.
function redocTheme(dark: boolean) {
  return {
    colors: { primary: { main: "#3b82f6" } },
    sidebar: {
      backgroundColor: dark ? "#1e1e2e" : "#fafafa",
      textColor: dark ? "#cdd6f4" : "#1e1e2e",
    },
    rightPanel: { backgroundColor: dark ? "#11111b" : "#1e1e2e" },
    typography: { fontSize: "13px" },
  };
}

export function RedocPane({ spec, dark }: RedocPaneProps) {
  return (
    <div className={"h-full overflow-auto " + (dark ? "bg-[#1e1e2e]" : "bg-white")}>
      <RedocStandalone
        spec={spec}
        options={{
          hideDownloadButton: true,
          hideLoading: true,
          theme: redocTheme(dark),
          nativeScrollbars: true,
        }}
      />
    </div>
  );
}

export default RedocPane;
