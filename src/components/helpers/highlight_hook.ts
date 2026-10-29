import { onMounted, onWillUnmount, Signal, usePlugin } from "@odoo/owl";
import { deepEquals } from "../../helpers/misc";
import { useLayoutEffect } from "../../owl3_compatibility_layer";
import { HighlightPlugin, HighlightProvider } from "../../owl_plugins/highlight_plugin";
import { useStoreProvider } from "../../store_engine/store_hooks";
import { useHoveredElement } from "./listener_hook";

export function useHighlightsOnHover(
  ref: Signal<HTMLElement | null>,
  highlightProvider: HighlightProvider
) {
  const onStatHovered = useHoveredElement(ref);
  useHighlights({
    get highlights() {
      return onStatHovered.hovered ? highlightProvider.highlights : [];
    },
  });
}

export function useHighlights(highlightProvider: HighlightProvider) {
  const stores = useStoreProvider();
  const highlightPlugin = usePlugin(HighlightPlugin);
  onMounted(() => {
    highlightPlugin.register(highlightProvider);
  });
  onWillUnmount(() => {
    highlightPlugin.unRegister(highlightProvider);
  });
  let currentHighlights = highlightProvider.highlights;
  useLayoutEffect(
    (highlights) => {
      if (!deepEquals(highlights, currentHighlights)) {
        currentHighlights = highlights;
        stores.trigger("store-updated");
      }
    },
    () => [highlightProvider.highlights]
  );
}
