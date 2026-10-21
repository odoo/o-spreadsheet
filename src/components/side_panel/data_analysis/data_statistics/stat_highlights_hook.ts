import { proxy, usePlugin } from "@odoo/owl";
import { HIGHLIGHT_IN_SELECTION_COLOR } from "../../../../constants";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { GENERIC_STAT_ITEMS } from "../../../../helpers/data_statistics/statistics_suggestion";
import { positions, positionToZone } from "../../../../helpers/zones";
import { ModelPlugin } from "../../../../owl_plugins/model_owl_plugin";
import { EvaluatedCell } from "../../../../types/cells";
import { Highlight } from "../../../../types/misc";
import { useHighlights } from "../../../helpers/highlight_hook";

export function useStatHighlights(
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
      const highlights: Highlight[] = [];
      for (const zone of getters.getSelectedZones()) {
        const cellPositions = !headerInZone
          ? positions(zone)
          : positions({ ...zone, top: zone.top + 1 });
        for (const position of cellPositions) {
          const cell = getters.getEvaluatedCell({ sheetId, ...position });
          if (doesCellMatchStatistic(cell, hoveredStat)) {
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
