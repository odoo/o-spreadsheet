import { Component } from "@odoo/owl";
import { Model } from "../../src";
import { createFilter, setCellContent } from "../test_helpers/commands_helpers";
import { simulateClick } from "../test_helpers/dom_helper";
import { makeTestFixture, mountSpreadsheet, nextTick } from "../test_helpers/helpers";

describe("Filter menu component", () => {
  let fixture: HTMLElement;
  let parent: Component;
  let model: Model;

  async function openFilterMenu() {
    await simulateClick(".o-filter-icon");
  }

  beforeEach(async () => {
    fixture = makeTestFixture();
    parent = await mountSpreadsheet(fixture);
    // @ts-ignore
    model = parent.model;
    createFilter(model, "A1:A4");
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "3");
    setCellContent(model, "A4", "2");
    await nextTick();
    await openFilterMenu();
  });

  afterEach(() => {
    parent.destroy();
    fixture.remove();
  });
  test("Filter menu is correctly rendered", async () => {
    expect(fixture.querySelector(".o-filter-menu-item")).toMatchSnapshot();
  });

  test("Can clear all and select all", async () => {
    expect(fixture.querySelectorAll(".o-filter-menu-value-checked")).toHaveLength(3);
    await simulateClick(".o-filter-menu-action-text:nth-of-type(2)");
    expect(fixture.querySelectorAll(".o-filter-menu-value-checked")).toHaveLength(0);
    await simulateClick(".o-filter-menu-action-text:nth-of-type(1)");
    expect(fixture.querySelectorAll(".o-filter-menu-value-checked")).toHaveLength(3);
  });

  test("Can check/uncheck values", async () => {});
});
