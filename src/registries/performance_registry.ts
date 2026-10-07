import { FormulasPerformance } from "../components/side_panel/perf_profile/formulas_performance";
import { _t } from "../translation";
import { SpreadsheetActionEnv } from "../types/spreadsheet_env";
import { Registry } from "./registry";

export interface PerformanceItem {
  title: string | ((env: SpreadsheetActionEnv, props: object) => string);
  Body: any;
  compute: (env: SpreadsheetActionEnv) => void;
}

export const performanceRegistry = new Registry<PerformanceItem>();

performanceRegistry.add("formulas", {
  title: _t("Formulas"),
  Body: FormulasPerformance,
  compute: (env: SpreadsheetActionEnv) => {
    env.model().dispatch("EVALUATE_CELLS", { profiling: true });
  },
});
