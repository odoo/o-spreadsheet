import { useProps, xml } from "@odoo/owl";
import { types } from "../../../src/components/props_validation";
import { Section } from "../../../src/components/side_panel/components/section/section";
import { Component } from "../../../src/owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../src/types/spreadsheet_env";
import { mountComponent } from "../../test_helpers/helpers";

let fixture: HTMLElement;

interface Props {
  class?: string;
}

describe("Section", () => {
  test("Can render a section without a title", async () => {
    class SectionContainer extends Component<SpreadsheetChildEnv> {
      static template = xml/* xml */ `
    <div class="container">
      <Section t-props="this.props">
        <div class="content">My content</div>
      </Section>
    </div>
  `;
      static components = { Section };
      protected props: Props = useProps({
        class: types.string(),
      });
    }
    ({ fixture } = await mountComponent(SectionContainer, { props: { class: "my-class" } }));
    expect(fixture).toMatchSnapshot();
  });

  test("Can render a section with a title slot", async () => {
    class SectionContainer extends Component<SpreadsheetChildEnv> {
      static template = xml/* xml */ `
    <div class="container">
      <Section t-props="this.props">
        <t t-set-slot="title">My title</t>
        <div class="content">My content</div>
      </Section>
    </div>
  `;
      static components = { Section };
      protected props: Props = useProps({
        class: types.string(),
      });
    }
    ({ fixture } = await mountComponent(SectionContainer, { props: { class: "my-class" } }));
    expect(fixture).toMatchSnapshot();
  });

  test("Can render a section with a title props", async () => {
    class SectionContainer extends Component<SpreadsheetChildEnv> {
      static template = xml/* xml */ `
    <div class="container">
      <Section t-props="this.props" title.translate="My title">
        <div class="content">My content</div>
      </Section>
    </div>
  `;
      static components = { Section };
      protected props: Props = useProps({
        class: types.string(),
      });
    }
    ({ fixture } = await mountComponent(SectionContainer, { props: { class: "my-class" } }));
    expect(fixture).toMatchSnapshot();
  });

  test("Can render a section with both title props and slot", async () => {
    class SectionContainer extends Component<SpreadsheetChildEnv> {
      static template = xml/* xml */ `
    <div class="container">
      <Section t-props="this.props" title.translate="My title from props">
      <t t-set-slot="title">My title from slot</t>
        <div class="content">My content</div>
      </Section>
    </div>
  `;
      static components = { Section };
      protected props: Props = useProps({
        class: types.string(),
      });
    }
    ({ fixture } = await mountComponent(SectionContainer, { props: { class: "my-class" } }));
    expect(fixture).toMatchSnapshot();
  });
});
