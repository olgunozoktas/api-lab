/** Olgun Özoktaş geliştirdi · API Lab */
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

export type Actions = CollectionsActions &
  TabsActions &
  EnvActions &
  HistoryActions &
  ExamplesActions &
  UiActions &
  ResponseActions &
  CurrentActions &
  SamplesActions;

export type Store = CoreState & Actions;

export type StoreMutators = [["zustand/persist", unknown]];
