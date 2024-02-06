import { Model } from "../../src";
import { mountSpreadsheet } from "../test_helpers/helpers";

describe("Filter Icon Overlay component", () => {
  test("Overlapping filters are overwritten bythe latest inserted", async () => {
    const model = new Model({
      version: 12,
      sheets: [
        {
          name: "Sheet1",
          id: "sh1",
          filterTables: [{ range: "A2:B3" }, { range: "A2:C4" }],
        },
      ],
    });
    const { fixture } = await mountSpreadsheet({ model });
    expect(fixture.querySelectorAll(".o-filter-icon").length).toBe(3);
  });
});
