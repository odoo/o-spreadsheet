import { deepEquals } from "@odoo/o-spreadsheet-engine";
import { Ref } from "@odoo/o-spreadsheet-engine/types";
import { onMounted, useEffect } from "@odoo/owl";
import { useLocalStore, useStoreProvider } from "../../store_engine";
import { HighlightProvider, HighlightStore } from "../../stores/highlight_store";
import { useHoveredElement } from "./listener_hook";

export function useHighlightsOnHover(ref: Ref<HTMLElement>, highlightProvider: HighlightProvider) {
  const hoverState = useHoveredElement(ref);
  useHighlights({
    get highlights() {
      return hoverState.hovered ? highlightProvider.highlights : [];
    },
  });
}

export function useHighlights(highlightProvider: HighlightProvider) {
  const stores = useStoreProvider();
  const store = useLocalStore(HighlightStore);
  onMounted(() => {
    store.register(highlightProvider);
  });
  let currentHighlights = highlightProvider.highlights;
  useEffect(
    (highlights) => {
      if (!deepEquals(highlights, currentHighlights)) {
        currentHighlights = highlights;
        stores.trigger("store-updated");
      }
    },
    () => [highlightProvider.highlights]
  );
}
