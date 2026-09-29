import { proxy, usePlugin } from "@odoo/owl";
import { HIGHLIGHT_IN_SELECTION_COLOR } from "../../../../constants";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { positionToZone } from "../../../../helpers/zones";
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
      const zones = getters.getSelectedZones();

      if (zones.length === 0) {
        return [];
      }

      const highlights: Highlight[] = [];
      const primaryZone = zones[0];
      const refCol = primaryZone.left;

      for (let row = primaryZone.top; row <= primaryZone.bottom; row++) {
        const refCell = getters.getEvaluatedCell({ sheetId, col: refCol, row });

        if (matches(refCell, hoveredStat)) {
          /* Do we have to highlight cells where category is aligned to a void cell ?
          
          const isMultiColumn = zones.length > 1 || primaryZone.left !== primaryZone.right;

          if (isMultiColumn) {
            const hasValueInRow = zones.some((zone) => {
              for (let col = zone.left; col <= zone.right; col++) {
                if (zone === primaryZone && col === refCol) continue;
                
                const targetCell = getters.getEvaluatedCell({ sheetId, col, row });
                if (
                  targetCell.value !== null &&
                  targetCell.value !== undefined &&
                  targetCell.value !== ""
                ) {
                  return true;
                }
              }
              return false;
            });

            if (!hasValueInRow) {
              continue;
            }
          }
          */

          // Take all cells of row for a match
          for (const zone of zones) {
            for (let col = zone.left; col <= zone.right; col++) {
              highlights.push({
                range: getters.getRangeFromZone(sheetId, positionToZone({ col, row })),
                color: HIGHLIGHT_IN_SELECTION_COLOR,
                thinLine: true,
              });
            }
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
