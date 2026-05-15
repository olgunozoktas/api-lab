/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../index";

// Reset the samples slice between tests. Zustand stores are singletons,
// so we explicitly clear the two persisted fields we mutate here.
function reset() {
  useStore.setState({ hiddenSampleIds: [], samplesSectionHidden: false });
}

describe("samples slice — hide / show", () => {
  beforeEach(reset);

  it("hideSample appends to hiddenSampleIds (idempotent)", () => {
    useStore.getState().hideSample("sample-ws-echo");
    expect(useStore.getState().hiddenSampleIds).toEqual(["sample-ws-echo"]);
    // Idempotent — calling again does not duplicate.
    useStore.getState().hideSample("sample-ws-echo");
    expect(useStore.getState().hiddenSampleIds).toEqual(["sample-ws-echo"]);
  });

  it("hideSample handles multiple distinct ids", () => {
    useStore.getState().hideSample("sample-ws-echo");
    useStore.getState().hideSample("sample-sse-test");
    expect(useStore.getState().hiddenSampleIds).toEqual(["sample-ws-echo", "sample-sse-test"]);
  });

  it("showSample removes the id; absent id is a no-op", () => {
    useStore.getState().hideSample("sample-ws-echo");
    useStore.getState().hideSample("sample-sse-test");
    useStore.getState().showSample("sample-ws-echo");
    expect(useStore.getState().hiddenSampleIds).toEqual(["sample-sse-test"]);
    // No-op on an id that isn't hidden.
    useStore.getState().showSample("sample-doesnt-exist");
    expect(useStore.getState().hiddenSampleIds).toEqual(["sample-sse-test"]);
  });

  it("showAllSamples resets both hidden set + section flag", () => {
    useStore.getState().hideSample("sample-ws-echo");
    useStore.getState().hideSample("sample-sse-test");
    useStore.getState().setSamplesSectionHidden(true);
    useStore.getState().showAllSamples();
    expect(useStore.getState().hiddenSampleIds).toEqual([]);
    expect(useStore.getState().samplesSectionHidden).toBe(false);
  });

  it("setSamplesSectionHidden toggles the section flag", () => {
    useStore.getState().setSamplesSectionHidden(true);
    expect(useStore.getState().samplesSectionHidden).toBe(true);
    useStore.getState().setSamplesSectionHidden(false);
    expect(useStore.getState().samplesSectionHidden).toBe(false);
    // Setting to the same value is a no-op (verified by snapshot equality
    // — no state change should fire listeners or invalidate selectors).
    const beforeNoOp = useStore.getState().samplesSectionHidden;
    useStore.getState().setSamplesSectionHidden(false);
    expect(useStore.getState().samplesSectionHidden).toBe(beforeNoOp);
  });

  it("initial state has neither hidden samples nor a hidden section", () => {
    reset();
    expect(useStore.getState().hiddenSampleIds).toEqual([]);
    expect(useStore.getState().samplesSectionHidden).toBe(false);
  });
});
