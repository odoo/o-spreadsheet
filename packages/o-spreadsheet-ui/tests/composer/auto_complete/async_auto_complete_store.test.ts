import { CellComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { autoCompleteProviders } from "../../../src/registries/auto_completes";
import { registerCleanup } from "../../setup/jest.setup";
import { nextTick } from "../../test_helpers/helpers";
import { makeStore } from "../../test_helpers/stores";

describe("Async auto complete", () => {
  test("only the latest async auto-complete is taken into account", async () => {
    jest.useFakeTimers();
    let delay = 100;
    autoCompleteProviders.add("async_test", {
      sequence: 0,
      async getProposals() {
        const text = `async_test ${delay}`;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return [{ text }];
      },
      selectProposal() {},
    });
    registerCleanup(() => autoCompleteProviders.remove("async_test"));
    const { store: composer } = makeStore(CellComposerStore);
    composer.startEdition();
    // first auto-complete will resolve in 100ms (after the next one)
    composer.setCurrentContent("=a");

    // second auto-complete will resolve in 50ms (before the first one)
    delay = 50;
    composer.setCurrentContent("=as");
    jest.advanceTimersByTime(150); // both async should have resolved by now
    await nextTick();
    const proposals = composer.autoCompleteProposals;
    expect(proposals).toHaveLength(1);
    // only the latest auto-complete should be taken into account,
    // even if a slower async one resolves after
    expect(proposals?.[0].text).toEqual("async_test 50");
  });
});
