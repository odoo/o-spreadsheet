import { rangeTokenize } from "../../../formulas";
import { AutoCompleteProviderDefinition } from "../../../registries";
import { Get } from "../../../store_engine";
import { UID } from "../../../types";
import { AbstractComposerStore } from "../composer/abstract_composer_store";

export interface StandaloneComposerArgs {
  onConfirm: (content: string) => void;
  content: string;
  /**
   * the sheet id to which unqualified references (A1 vs Sheet1!A1)
   * will be resolved.
   */
  defaultRangeSheetId: UID;
  contextualAutocomplete?: AutoCompleteProviderDefinition;
}

export class StandaloneComposerStore extends AbstractComposerStore {
  constructor(get: Get, private args: () => StandaloneComposerArgs) {
    super(get);
    this._currentContent = this.getComposerContent();
  }

  protected getContextualAutocomplete(): undefined | AutoCompleteProviderDefinition {
    return this.args().contextualAutocomplete;
  }

  protected getComposerContent(): string {
    if (this.editionMode === "inactive") {
      // References in the content might not be linked to the current active sheet
      // We here force the sheet name prefix for all references that are not in
      // the current active sheet
      const defaultRangeSheetId = this.args().defaultRangeSheetId;
      return rangeTokenize(this.args().content)
        .map((token) => {
          if (token.type === "REFERENCE") {
            const range = this.getters.getRangeFromSheetXC(defaultRangeSheetId, token.value);
            return this.getters.getRangeString(range, this.getters.getActiveSheetId());
          }
          return token.value;
        })
        .join("");
    }
    return this._currentContent;
  }

  getDefaultRangeSheetId() {
    return this.args().defaultRangeSheetId;
  }

  stopEdition() {
    this._stopEdition();
  }

  protected confirmEdition(content: string) {
    this.args().onConfirm(content);
  }
}
