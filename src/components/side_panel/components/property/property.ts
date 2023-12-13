import { Component, xml } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";

interface Props {
  property: {
    component: typeof Component;
    props: any;
  };
}

export class Property extends Component<Props, SpreadsheetChildEnv> {
  static template = xml`<t t-component="props.property.component" t-props="props.property.props"/>`;
}
