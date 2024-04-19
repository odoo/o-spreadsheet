import { onMounted, useEffect } from "@odoo/owl";
import { useLocalStore, useStoreProvider } from "../../store_engine";
import { HighlightProvider, HighlightStore } from "../../stores/highlight_store";
import { Ref } from "../../types";
import { useHoveredElement } from "./listener_hook";

export function useHighlightsOnHover(ref: Ref<HTMLElement>, highlightProvider: HighlightProvider) {
  const hoverState = useHoveredElement(ref);
  const stores = useStoreProvider();

  useHighlights({
    get highlights() {
      return hoverState.hovered ? highlightProvider.highlights : [];
    },
  });
  useEffect(
    () => {
      stores.trigger("store-updated");
    },
    () => [hoverState.hovered]
  );
}

export function useHighlights(highlightProvider: HighlightProvider) {
  const store = useLocalStore(HighlightStore);
  onMounted(() => {
    store.register(highlightProvider);
  });
}
