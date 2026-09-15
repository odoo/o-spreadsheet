import { FormulasPerformance } from "../components/side_panel/perf_profile/formulas_performance";
import { _t } from "../translation";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";
import { Registry } from "./registry";

export interface PerformanceItem {
  title: string | ((env: SpreadsheetChildEnv, props: object) => string);
  Body: any;
  compute: (env: SpreadsheetChildEnv) => void;
}

export const performanceRegistry = new Registry<PerformanceItem>();

performanceRegistry.add("formulas", {
  title: _t("Formulas"),
  Body: FormulasPerformance,
  compute: (env: SpreadsheetChildEnv) => {
    env.model.dispatch("EVALUATE_CELLS", { profiling: true });
  },
});
