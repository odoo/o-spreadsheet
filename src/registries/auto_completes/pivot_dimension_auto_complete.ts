import { tokenColors } from "../../components/composer/composer/composer";
import { getCanonicalSheetName } from "../../helpers";
import { PivotRuntimeDefinition } from "../../helpers/pivot/pivot_runtime_definition";
import { PivotMeasure } from "../../types";
import { AutoCompleteProviderDefinition } from "./auto_complete_registry";

export function createMeasureAutoComplete(
  pivot: PivotRuntimeDefinition,
  forComputedMeasure: PivotMeasure
): AutoCompleteProviderDefinition {
  return {
    sequence: 0,
    autoSelectFirstProposal: false,
    getProposals(tokenAtCursor) {
      const measureProposals = pivot.measures
        .filter((m) => m !== forComputedMeasure)
        .map((measure) => {
          const text = getCanonicalSheetName(measure.id);
          return {
            text: text,
            description: measure.displayName,
            htmlContent: [{ value: text, color: tokenColors.FUNCTION }],
            fuzzySearchKey: measure.displayName + text + measure.fieldName,
          };
        });
      const dimensionsProposals = pivot.rows.concat(pivot.columns).map((dimension) => {
        const text = getCanonicalSheetName(dimension.nameWithGranularity);
        return {
          text: text,
          description: dimension.displayName,
          htmlContent: [{ value: text, color: tokenColors.FUNCTION }],
          fuzzySearchKey: dimension.displayName + text + dimension.fieldName,
        };
      });
      return measureProposals.concat(dimensionsProposals);
    },
    selectProposal(tokenAtCursor, value) {
      const start = tokenAtCursor.start;
      const end = tokenAtCursor.end;
      this.composer.changeComposerCursorSelection(start, end);
      this.composer.replaceComposerCursorSelection(value);
    },
  };
}
