import { Component } from "@odoo/owl";
import { ActionSpec } from "../../actions/action";
import { CellComposerStore } from "../../current_components/composer/composer/cell_composer_store";
import { SelectionStore } from "../../stores/draw_selection_store";
import { SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers";

css/* scss */ `
  .o-selection-button {
    border-radius: 2px;
    .o-icon {
      width: 30px;
      height: 30px;
      color: #6aa84f;
    }
  }
`;

interface Props {
  action: ActionSpec;
  hasTriangleDownIcon?: boolean;
  selectedColor?: string;
  class?: string;
  onClick?: (ev: MouseEvent) => void;
  composerStore: CellComposerStore;
}

export class SelectionButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SelectionButton";
  static props = { composerStore: Object };

  onClick(ev: MouseEvent) {
    // TODORAR ordering seems important here  should not be the case
    this.props.composerStore.stopEdition();
    this.env.model.selection.selectCell(0, 0);
    this.env.getStore(SelectionStore).disable();
  }
}
