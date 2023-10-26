import { Component, onMounted, onWillUnmount, useComponent, useEffect } from "@odoo/owl";
import { highlightRegistry } from "../../registries/highlight_registry";
import { Highlight, Ref, SpreadsheetChildEnv } from "../../types";
import { useHoveredElement } from "./listener_hook";

export function useHighlightsOnHover(ref: Ref<HTMLElement>, getHighlights: () => Highlight[]) {
  const hoverState = useHoveredElement(ref);
  const component = useComponent() as Component<any, SpreadsheetChildEnv>;

  const triggerRender = () => {
    component.env.model.dispatch("RENDER_CANVAS");
  };

  useHighlights(() => (hoverState.hovered ? getHighlights() : []));
  useEffect(triggerRender, () => [hoverState.hovered]);
}

export function useHighlights(getHighlights: () => Highlight[]) {
  const component = useComponent() as Component<any, SpreadsheetChildEnv>;
  const id = component.env.model.uuidGenerator.uuidv4();
  onMounted(() => {
    highlightRegistry.add(id, getHighlights);
    component.env.model.dispatch("RENDER_CANVAS");
  });
  onWillUnmount(() => {
    highlightRegistry.remove(id);
    component.env.model.dispatch("RENDER_CANVAS");
  });
}
