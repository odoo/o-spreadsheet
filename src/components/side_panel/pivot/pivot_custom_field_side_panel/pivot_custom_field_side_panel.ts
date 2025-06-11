import { Component } from "@odoo/owl";
import { Store, useLocalStore } from "../../../../store_engine";
import { SpreadsheetChildEnv, UID } from "../../../../types";
import { css } from "../../../helpers";
import { Section } from "../../components/section/section";
import { TagInput } from "../../tag_input/tag_input";
import { PivotCustomFieldStore } from "./pivot_custom_field_store";

css/* scss */ `
  .o-sidePanel {
    .o-tag-select-todo-better-name {
      .o-input {
        flex: 1 0 50px;
      }
    }
  }
  /* ADRM TODO: add hover/selected style to dropdown */
  .o-values-proposals {
    min-width: 160px;
    background: white;
  }
`;

interface Props {
  pivotId: UID;
  onCloseSidePanel: () => void;
}

export class PivotCustomFieldPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotCustomFieldPanel";
  static props = {
    pivotId: String,
    onCloseSidePanel: Function,
  };
  static components = { Section, TagInput };

  store!: Store<PivotCustomFieldStore>;

  setup(): void {
    this.store = useLocalStore(PivotCustomFieldStore, this.props.pivotId, "Stage"); // ADRM TODO
  }

  get selectedValues() {
    return ["Albania", "randomTag", "anotherTag"].map((value) => ({ value, label: value }));
  }

  get allValues() {
    return this.store.allValues;
  }

  onValuesChanged(values: string[]) {
    console.log("Values changed:", values);
  }
}
