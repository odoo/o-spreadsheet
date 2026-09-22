import { DEFAULT_SCORECARD_HEIGHT, DEFAULT_SCORECARD_WIDTH } from "../constants";
import { copyFormulaToClipboard } from "../helpers/clipboard/clipboard_helpers";
import { getStatScorecardDefinition, StatItem } from "../helpers/data_statistics/statistics_items";
import { centerFigurePosition } from "../helpers/figures/figure/figure";
import { UuidGenerator } from "../helpers/uuid";
import { _t } from "../translation";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";
import { Action, createActions } from "./action";

export function getStatItemActions(stat: StatItem, env: SpreadsheetChildEnv): Action[] {
  const menuItemSpecs = [
    {
      id: "copy_to_clipboard",
      name: _t("Copy formula to clipboard"),
      execute: async (env) => copyFormulaToClipboard(stat.formula, env),
      icon: "o-spreadsheet-Icon.CLIPBOARD",
    },
    {
      id: "insert_scorecard",
      name: _t("Insert scorecard"),
      execute: async (env) => {
        const size = { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT };
        const { col, row, offset } = centerFigurePosition(env, size);
        env.model.dispatch("CREATE_CHART", {
          chartId: UuidGenerator.smallUuid(),
          figureId: UuidGenerator.smallUuid(),
          sheetId: env.model.getters.getActiveSheetId(),
          size,
          definition: getStatScorecardDefinition(stat),
          col,
          row,
          offset,
        });
      },
      icon: "o-spreadsheet-Icon.INSERT_CHART",
    },
  ];
  return createActions(menuItemSpecs);
}
