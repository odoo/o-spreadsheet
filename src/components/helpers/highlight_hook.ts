import { Component, onMounted, useComponent, useEffect } from "@odoo/owl";
import { useLocalStore } from "../../store_engine";
import { HighlightGetter, HighlightStore } from "../../stores/highlight_store";
import { Ref, SpreadsheetChildEnv } from "../../types";
import { useHoveredElement } from "./listener_hook";

export function useHighlightsOnHover(ref: Ref<HTMLElement>, highlightGetter: HighlightGetter) {
  const hoverState = useHoveredElement(ref);
  const component = useComponent() as Component<any, SpreadsheetChildEnv>;

  const triggerRender = () => {
    component.env.model.dispatch("RENDER_CANVAS");
  };

  useHighlights({
    getHighlights: () => (hoverState.hovered ? highlightGetter.getHighlights() : []),
  });
  useEffect(triggerRender, () => [hoverState.hovered]);
}

export function useHighlights(highlightGetter: HighlightGetter) {
  const store = useLocalStore(HighlightStore);
  onMounted(() => {
    store.register(highlightGetter);
  });
}
