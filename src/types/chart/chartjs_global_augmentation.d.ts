// This file is a script-mode ambient declaration (no imports/exports).
// It augments the global scope for TypeScript type checking without being
// included in the rollup-plugin-dts bundle (unreachable from module graph).
declare var Chart: import("./chartjs").GlobalChart | undefined;
