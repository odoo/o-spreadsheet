// Script-mode ambient declaration (no imports/exports).
// Provides global type augmentation for TypeScript type checking without being
// included in the rollup-plugin-dts bundle (unreachable from module graph).
declare var Chart: import("./types/chart/chartjs").GlobalChart | undefined;
interface Window {
  ChartGeo: typeof import("chartjs-chart-geo");
}
