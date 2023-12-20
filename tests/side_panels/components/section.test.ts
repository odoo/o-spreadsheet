import { Component, xml } from "@odoo/owl";
import { Section } from "../../../src/components/side_panel/components/section/section";
import { SpreadsheetChildEnv } from "../../../src/types";
import { mountComponent } from "../../test_helpers/helpers";

let fixture: HTMLElement;

type Props = Section["props"];

describe("Section", () => {
  test("Can render a section without a title", async () => {
    class SectionContainer extends Component<Props, SpreadsheetChildEnv> {
      static template = xml/* xml */ `
    <div class="container">
      <Section t-props="props">
        <div class="content">My content</div>
      </Section>
    </div>
  `;
      static components = { Section };
    }
    const props = { class: "my-class" };
    ({ fixture } = await mountComponent(SectionContainer, { props }));
    expect(fixture).toMatchSnapshot();
  });

  test("Can render a section with a title", async () => {
    class SectionContainer extends Component<Props, SpreadsheetChildEnv> {
      static template = xml/* xml */ `
    <div class="container">
      <Section t-props="props">
        <t t-set-slot="title">My title</t>
        <div class="content">My content</div>
      </Section>
    </div>
  `;
      static components = { Section };
    }
    const props = { class: "my-class" };
    ({ fixture } = await mountComponent(SectionContainer, { props }));
    expect(fixture).toMatchSnapshot();
  });
});
