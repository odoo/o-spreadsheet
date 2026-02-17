import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Store } from "@odoo/o-spreadsheet-engine/types/store_engine";
import { Component, useState } from "@odoo/owl";
import { fuzzyLookup } from "../../../../helpers";
import { useLocalStore, useStore } from "../../../../store_engine";
import { PivotDragAndDropStore } from "../../../../stores/pivot_drag_and_drop_store";
import { PivotField, UID } from "../../../../types";
import { startDnd } from "../../../helpers/drag_and_drop";
import { TextInput } from "../../../text_input/text_input";
import { Section } from "../../components/section/section";
import { PivotSidePanelStore } from "../pivot_side_panel/pivot_side_panel_store";

export const PIVOT_DRAG_AND_DROP_MIMETYPE = "application/my-stuff";

interface Props {
  pivotId: UID;
}

interface State {
  searchedString: string;
}

export class PivotFieldList extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFieldList";
  static components = { Section, TextInput };
  static props = {
    pivotId: String,
  };

  state = useState<State>({ searchedString: "" });
  pivotStore!: Store<PivotSidePanelStore>;
  pivotDragAndDropStore!: Store<PivotDragAndDropStore>;

  setup() {
    this.pivotDragAndDropStore = useStore(PivotDragAndDropStore);
    this.pivotStore = useLocalStore(PivotSidePanelStore, this.props.pivotId);
  }

  get fields(): PivotField[] {
    return this.pivotStore.unusedGroupableFields;
  }

  get searchedFields() {
    if (this.state.searchedString) {
      return fuzzyLookup(this.state.searchedString, this.fields, (field) => field.string);
    }
    return this.fields.sort((field1, field2) => field1.string.localeCompare(field2.string));
  }

  onSearchInput(value: string) {
    this.state.searchedString = value;
  }

  onPointerDown(ev: DragEvent, field: PivotField) {
    this.pivotDragAndDropStore.startDragAndDrop(
      "pivot-field-list",
      { type: "field", id: field.name, label: field.string, field },
      { x: ev.clientX, y: ev.clientY }
    );
    startDnd(
      (ev) => {
        this.pivotDragAndDropStore.moveItem("pivot-field-list", { x: ev.clientX, y: ev.clientY });
      },
      () => {
        this.pivotDragAndDropStore.endDragAndDrop("pivot-field-list");
      }
    );
  }

  isFieldHidden(field: PivotField) {
    return (
      this.pivotDragAndDropStore.containerId === "pivot-field-list" &&
      this.pivotDragAndDropStore.draggedItem?.id === field.name
    );
  }
}
