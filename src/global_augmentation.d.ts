// Script-mode ambient declaration (no imports/exports).
// Provides global type augmentation for TypeScript type checking without being
// included in the rollup-plugin-dts bundle (unreachable from module graph).
declare var Chart: import("./types/chart/chartjs").GlobalChart | undefined;
declare var ChartGeo: typeof import("chartjs-chart-geo") | undefined;

// The eye dropper API is still experimental, and thus not yet included in ts's typing
interface EyeDropper {
  open(): Promise<{ sRGBHex: string }>;
}

interface EyeDropperConstructor {
  new (): EyeDropper;
}

declare var EyeDropper: EyeDropperConstructor | undefined;
