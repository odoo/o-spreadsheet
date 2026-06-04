import { providePlugins, xml } from "@odoo/owl";
import { ModelPlugin, useModel } from "../../../src/components/owl_plugins/model_plugin";
import { Model } from "../../../src/model";
import { App, Component } from "../../../src/owl3_compatibility_layer";
import { makeTestFixture, nextTick } from "../../test_helpers/helpers";

describe("ModelPlugin", () => {
  test("Should render component when model is updated", async () => {
    const model = new Model();

    class Spreadsheet extends Component {
      static template = xml`
        <div>
          <t t-out="this.getFirstCellValue()"/>
        </div>
      `;

      private model = useModel();

      getFirstCellValue() {
        const sheetId = this.model().getters.getActiveSheetId();
        return this.model().getters.getCellText({ sheetId, col: 0, row: 0 });
      }
    }
    class Parent extends Component {
      static template = xml`
        <div>
          <Spreadsheet/>
        </div>
      `;
      static components = { Spreadsheet };

      setup() {
        providePlugins([ModelPlugin], { model });
      }
    }

    const app = new App({
      test: true,
    });
    const root = app.createRoot(Parent);
    const fixture = makeTestFixture();
    await root.mount(fixture);
    expect(fixture.textContent).toBe("");

    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: "Test",
    });
    await nextTick();
    expect(fixture.textContent).toBe("Test");
  });
});
