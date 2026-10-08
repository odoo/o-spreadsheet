import { proxy, usePlugin } from "@odoo/owl";
import { HIGHLIGHT_IN_SELECTION_COLOR } from "../../../../constants";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { positions, positionToZone } from "../../../../helpers/zones";
import { ModelPlugin } from "../../../../owl_plugins/model_owl_plugin";
import { EvaluatedCell } from "../../../../types/cells";
import { Highlight } from "../../../../types/misc";
import { useHighlights } from "../../../helpers/highlight_hook";

export function useStatHighlights(
  matches: (cell: EvaluatedCell, hoveredStat: StatValue) => boolean
): (stat: StatValue, isHovered: boolean) => void {
  const modelPlugin = usePlugin(ModelPlugin);
  const state = proxy<{ hoveredStat?: StatValue }>({ hoveredStat: undefined });

  useHighlights({
    get highlights(): Highlight[] {
      const hoveredStat = state.hoveredStat;
      if (!hoveredStat) {
        return [];
      }
      const getters = modelPlugin.model().getters;
      const sheetId = getters.getActiveSheetId();
      const highlights: Highlight[] = [];
      for (const zone of getters.getSelectedZones()) {
        for (const position of positions(zone)) {
          const cell = getters.getEvaluatedCell({ sheetId, ...position });
          if (matches(cell, hoveredStat)) {
            highlights.push({
              range: getters.getRangeFromZone(sheetId, positionToZone(position)),
              color: HIGHLIGHT_IN_SELECTION_COLOR,
              thinLine: true,
            });
          }
        }
      }
      return highlights;
    },
  });

  return (stat, isHovered) => {
    state.hoveredStat = isHovered ? stat : undefined;
  };
}
