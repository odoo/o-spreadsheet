import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Store } from "@odoo/o-spreadsheet-engine/types/store_engine";
import { Component, useState } from "@odoo/owl";
import { fuzzyLookup } from "../../../../helpers";
import { useLocalStore } from "../../../../store_engine";
import { PivotField, UID } from "../../../../types";
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

  setup() {
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

  onDragStart(ev: DragEvent, field: PivotField) {
    if (!ev.dataTransfer || !ev.target) {
      return;
    }
    const target = ev.target as HTMLElement;
    console.log("onDrag start !");
    // Add different types of drag data
    ev.dataTransfer.setData("text/plain", target.innerText);
    ev.dataTransfer.setData("text/html", "<div>Hello</div>");
    ev.dataTransfer.setData(PIVOT_DRAG_AND_DROP_MIMETYPE, JSON.stringify(field));

    // ADRM TODO: well this doesn't work ...
    // const canvas = document.createElement("canvas");
    // canvas.style.position = "absolute";
    // canvas.style.top = "-1000px";
    // document.body.appendChild(canvas);

    // canvas.width = canvas.height = 50;
    // const ctx = canvas.getContext("2d")!;
    // ctx.fillStyle = "red";
    // ctx.fillRect(0, 0, 50, 50);
    // ev.dataTransfer.setDragImage(canvas, 25, 25);

    // const previewEl = document.querySelector(".o-pivot-facet");
    // if (previewEl) {
    //   ev.dataTransfer.setDragImage(previewEl, 25, 25);
    // }
  }
}
