import { props, signal } from "@odoo/owl";
import { localizeCFRule } from "../../../../helpers/locale";
import { UuidGenerator } from "../../../../helpers/uuid";
import { zoneToXc } from "../../../../helpers/zones";
import { Component } from "../../../../owl3_compatibility_layer";
import { ConditionalFormat } from "../../../../types/conditional_formatting";
import { UID } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { useDragAndDropListItems } from "../../../helpers/drag_and_drop_dom_items_hook";
import { types } from "../../../props_validation";
import { ConditionalFormatPreview } from "../cf_preview/cf_preview";

export class ConditionalFormatPreviewList extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormatPreviewList";
  static components = { ConditionalFormatPreview };

  protected props = props({
    onCloseSidePanel: types.function(),
  });

  private dragAndDrop = useDragAndDropListItems();
  private cfListRef = signal<HTMLElement | null>(null);

  get conditionalFormats(): ConditionalFormat[] {
    const cfs = this.env.model.getters.getConditionalFormats(
      this.env.model.getters.getActiveSheetId()
    );
    return cfs.map((cf) => ({
      ...cf,
      rule: localizeCFRule(cf.rule, this.env.model.getters.getLocale()),
    }));
  }

  getPreviewDivStyle(cf: ConditionalFormat): string {
    return this.dragAndDrop.itemsStyle[cf.id] || "";
  }

  onPreviewMouseDown(cf: ConditionalFormat, event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }
    const cfListEl = this.cfListRef();
    if (!cfListEl) {
      return;
    }
    const previewRects = Array.from(cfListEl.children).map((previewEl) =>
      getBoundingRectAsPOJO(previewEl)
    );
    const items = this.conditionalFormats.map((cf, index) => ({
      id: cf.id,
      size: previewRects[index].height,
      position: previewRects[index].y,
    }));
    this.dragAndDrop.start("vertical", {
      draggedItemId: cf.id,
      initialMousePosition: event.clientY,
      items: items,
      scrollableContainerEl: cfListEl,
      onDragEnd: (cfId: UID, finalIndex: number) => this.onDragEnd(cfId, finalIndex),
    });
  }

  onAddConditionalFormat() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zones = this.env.model.getters.getSelectedZones();
    const cf: Omit<ConditionalFormat, "ranges"> = {
      id: UuidGenerator.smallUuid(),
      rule: {
        type: "CellIsRule",
        operator: "isNotEmpty",
        style: { fillColor: "#b6d7a8" },
        values: [],
      },
    };
    this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf,
      ranges: zones.map((zone) => this.env.model.getters.getRangeDataFromZone(sheetId, zone)),
      sheetId,
    });
    return this.env.replaceSidePanel("ConditionalFormattingEditor", "ConditionalFormatting", {
      cf: {
        ...cf,
        ranges: zones.map((zone) =>
          zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone))
        ),
      },
      sheetId,
      isNewCf: true,
    });
  }

  private onDragEnd(cfId: UID, finalIndex: number) {
    const originalIndex = this.conditionalFormats.findIndex((sheet) => sheet.id === cfId);
    const delta = originalIndex - finalIndex;
    if (delta !== 0) {
      this.env.model.dispatch("CHANGE_CONDITIONAL_FORMAT_PRIORITY", {
        cfId,
        delta,
        sheetId: this.env.model.getters.getActiveSheetId(),
      });
    }
  }
}
