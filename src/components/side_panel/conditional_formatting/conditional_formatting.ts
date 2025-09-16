import { Component } from "@odoo/owl";
import { zoneToXc } from "../../../helpers";
import { localizeCFRule } from "../../../helpers/locale";
import { ConditionalFormat, SpreadsheetChildEnv } from "../../../types";
import { ConditionalFormattingPreviewList } from "./cf_preview_list/cf_preview_list";

interface Props {
  onCloseSidePanel: () => void;
}

export class ConditionalFormattingPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormattingPanel";
  static props = {
    onCloseSidePanel: Function,
  };
  static components = { ConditionalFormattingPreviewList };

  get conditionalFormats(): ConditionalFormat[] {
    const cfs = this.env.model.getters.getConditionalFormats(
      this.env.model.getters.getActiveSheetId()
    );
    return cfs.map((cf) => ({
      ...cf,
      rule: localizeCFRule(cf.rule, this.env.model.getters.getLocale()),
    }));
  }

  addConditionalFormat() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const cfId = this.env.model.uuidGenerator.smallUuid();
    const zones = this.env.model.getters.getSelectedZones();
    const cf: Omit<ConditionalFormat, "ranges"> = {
      id: cfId,
      rule: {
        type: "CellIsRule",
        operator: "isNotEmpty",
        style: { fillColor: "#b6d7a8" },
        values: [],
      },
    };
    const ranges = zones.map((zone) =>
      zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone))
    );
    this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
      sheetId,
      ranges: zones.map((zone) => this.env.model.getters.getRangeDataFromZone(sheetId, zone)),
      cf,
    });
    this.env.replaceSidePanel("ConditionalFormattingEditor", "ConditionalFormatting", {
      cf: { ...cf, ranges },
      isNew: true,
    });
  }
}
