import { proxy, usePlugin } from "@odoo/owl";
import { HIGHLIGHT_IN_SELECTION_COLOR } from "../../../../constants";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { positionToZone } from "../../../../helpers/zones";
import { ModelPlugin } from "../../../../owl_plugins/model_owl_plugin";
import { EvaluatedCell } from "../../../../types/cells";
import { Highlight, Zone } from "../../../../types/misc";
import { useHighlights } from "../../../helpers/highlight_hook";

export function useStatHighlights(
  mainColumnZone: Zone,
  doesCellMatchStatistic: (cell: EvaluatedCell, hoveredStat: StatValue) => boolean,
  headerInZone: boolean = false
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

      const highlights: Highlight[] = [];

      for (let row = mainColumnZone.top; row <= mainColumnZone.bottom; row++) {
        const cellToCompare = getters.getEvaluatedCell({
          sheetId,
          col: mainColumnZone.left,
          row,
        });
        if (doesCellMatchStatistic(cellToCompare, hoveredStat)) {
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
