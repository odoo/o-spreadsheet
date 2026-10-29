import { proxy, usePlugin } from "@odoo/owl";
import { HIGHLIGHT_IN_SELECTION_COLOR } from "../../../../constants";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { GENERIC_STAT_ITEMS } from "../../../../helpers/data_statistics/statistics_suggestion";
import { positionToZone } from "../../../../helpers/zones";
import { ModelPlugin } from "../../../../owl_plugins/model_owl_plugin";
import { EvaluatedCell } from "../../../../types/cells";
import { Highlight } from "../../../../types/misc";
import { useHighlights } from "../../../helpers/highlight_hook";

export function useStatHighlights(
  getColToCompare: () => number | undefined,
  doesCellMatchStatistic: (cell: EvaluatedCell, hoveredStat: StatValue) => boolean,
  headerInZone: boolean = false
): (stat: StatValue, isHovered: boolean) => void {
  const modelPlugin = usePlugin(ModelPlugin);
  const state = proxy<{ hoveredStat?: StatValue }>({ hoveredStat: undefined });

  function shouldHighlight(stat: StatValue) {
    const generalStatItemsIds = GENERIC_STAT_ITEMS.map((item) => item.id);
    return (
      !generalStatItemsIds.includes(stat.id) ||
      (["min", "max"].includes(stat.id) && stat.formula !== "")
    );
  }

  useHighlights({
    get highlights(): Highlight[] {
      const hoveredStat = state.hoveredStat;
      if (!hoveredStat || !shouldHighlight(hoveredStat)) {
        return [];
      }
      const getters = modelPlugin.model().getters;
      const sheetId = getters.getActiveSheetId();
      const zones = getters.getSelectedZones();
      const colToCompare = getColToCompare();

      if (colToCompare === undefined) {
        return [];
      }

      const highlights: Highlight[] = [];
      // As row span has been verified, get top and bottom of selection using first column
      const topOfSeclection = zones[0].top;
      const bottomOfSelection = zones[0].bottom;

      for (let row = topOfSeclection; row <= bottomOfSelection; row++) {
        const cellToCompare = getters.getEvaluatedCell({
          sheetId,
          col: colToCompare,
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
