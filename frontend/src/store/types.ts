/** Olgun Özoktaş geliştirdi · API Lab */
// Store type-composition root — AND-s every per-slice action type into
// `Actions`, then combines that with `CoreState` into the full `Store`
// type the zustand `create()` call is parameterised by.
import type { CoreState } from "./internal";
import type { CollectionsActions } from "./collections";
import type { TabsActions } from "./tabs";
import type { EnvActions } from "./env";
import type { HistoryActions } from "./history";
import type { ExamplesActions } from "./examples";
import type { UiActions } from "./ui";
import type { ResponseActions } from "./response";
import type { CurrentActions } from "./current";
import type { SamplesActions } from "./samples";
import type { SyncActions } from "./sync";
import type { IntegrationsActions } from "./integrations";
import type { McpServersActions } from "./mcpServers";
import type { CookiesActions } from "./cookies";

export type Actions = CollectionsActions &
  TabsActions &
  EnvActions &
  HistoryActions &
  ExamplesActions &
  UiActions &
  ResponseActions &
  CurrentActions &
  SamplesActions &
  SyncActions &
  IntegrationsActions &
  McpServersActions &
  CookiesActions;

export type Store = CoreState & Actions;

export type StoreMutators = [["zustand/persist", unknown]];
