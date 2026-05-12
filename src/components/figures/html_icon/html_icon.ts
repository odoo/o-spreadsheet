import { proxy } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { GridIcon } from "../../../registries/icons_on_cell_registry";
import { ImageSVG } from "../../../types/image";
import { CSSProperties } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../../helpers/css";

interface Props {
  icon: GridIcon;
}

export class HTMLIcon extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HTMLIcon";
  static props = {
    icon: Object,
  };
  static components = {};

  state = proxy({
    isHovered: false,
  });

  setup(): void {
    this.props.icon.svg?.paths;
  }

  get iconStyle(): string {
    const properties: CSSProperties = {
      width: `${this.props.icon.size}px`,
      height: `${this.props.icon.size}px`,
    };
    if (this.props.icon.onClick) {
      properties.cursor = "pointer";
    }
    return cssPropertiesToCss(properties);
  }

  onMouseEnter(): void {
    this.state.isHovered = true;
  }

  onMouseLeave(): void {
    this.state.isHovered = false;
  }

  onClick(): void {
    // ADRM TODO: filter icon onClick don't work, not do data validation list icon
    this.props.icon.onClick?.(this.props.icon.position, this.env);
  }

  get svg(): ImageSVG | undefined {
    if (this.state.isHovered) {
      return this.props.icon.hoverSvg ?? this.props.icon.svg;
    }
    return this.props.icon.svg;
  }
}
