import { Component } from "@odoo/owl";
import { DEFAULT_CAROUSEL_TITLE_STYLE } from "../../../../constants";
import { SpreadsheetChildEnv, TitleDesign } from "../../../../types";
import { TextInput } from "../../../text_input/text_input";
import { TextStyler } from "../../chart/building_blocks/text_styler/text_styler";
import { SidePanelCollapsible } from "../collapsible/side_panel_collapsible";

export interface Props {
  carouselTitle: TitleDesign | undefined;
  onUpdateCarouselTitle: (carouselTitle: TitleDesign) => void;
}

export class CarouselItemTitleCollapsible extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CarouselItemTitleCollapsible";
  static props = {
    carouselTitle: { type: Object, optional: true },
    onUpdateCarouselTitle: Function,
  };
  static components = { SidePanelCollapsible, TextInput, TextStyler };

  get title(): string {
    return this.props.carouselTitle?.text || "";
  }

  get style(): TitleDesign {
    return this.props.carouselTitle || this.defaultStyle;
  }

  get defaultStyle(): TitleDesign {
    return DEFAULT_CAROUSEL_TITLE_STYLE;
  }

  updateTitle(title: string) {
    this.props.onUpdateCarouselTitle({
      ...this.props.carouselTitle,
      text: title,
    });
  }

  updateStyle(style: TitleDesign) {
    this.props.onUpdateCarouselTitle({
      ...this.props.carouselTitle,
      ...style,
    });
  }
}
