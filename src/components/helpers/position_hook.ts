import { hooks } from "@odoo/owl";
import { TOPBAR_HEIGHT } from "../../constants";
import { Coordinates } from "../../types";
const { useComponent, useState, onMounted } = hooks;

/**
 * Return the component top left position (in pixels) relative
 * to the upper left corner of the grid.
 */
export function usePositionInGrid(): Coordinates {
  const position = useState({ x: 0, y: 0 });
  const component = useComponent();
  onMounted(() => {
    const { top, left } = component.el!.getBoundingClientRect();
    position.x = left;
    position.y = top - TOPBAR_HEIGHT;
  });
  return position;
}
