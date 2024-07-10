import { Get } from "../../../store_engine";
import { AbstractComposerStore } from "../composer/abstract_composer_store";

export interface StandaloneComposerArgs {
  onConfirm: (content: string) => void;
  content: string;
}

export class StandaloneComposerStore extends AbstractComposerStore {
  constructor(get: Get, private args: () => StandaloneComposerArgs) {
    super(get);
    this._currentContent = args().content;
  }

  protected getComposerContent(): string {
    return this._currentContent;
  }

  stopEdition() {
    this._stopEdition();
  }

  protected confirmEdition(content: string) {
    this.args().onConfirm(content);
  }
}
