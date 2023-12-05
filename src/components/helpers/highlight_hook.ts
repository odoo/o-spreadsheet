import { onMounted, useEffect, useEnv } from "@odoo/owl";
import { useLocalStore } from "../../store_engine";
import { HighlightProvider, HighlightStore } from "../../stores/highlight_store";
import { Ref, SpreadsheetChildEnv } from "../../types";
import { useHoveredElement } from "./listener_hook";

export function useHighlightsOnHover(ref: Ref<HTMLElement>, highlightProvider: HighlightProvider) {
  const hoverState = useHoveredElement(ref);
  const env = useEnv() as SpreadsheetChildEnv;

  useHighlights({
    get highlights() {
      return hoverState.hovered ? highlightProvider.highlights : [];
    },
  });
  useEffect(
    () => {
      env.model.dispatch("RENDER_CANVAS");
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
