import { getCell, GridParent, makeTestFixture, nextTick } from "../helpers";
import "../canvas.mock";
import { Model } from "../../src";
import { setInputValueAndTrigger, triggerMouseEvent } from "../dom_helper";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));
jest.useFakeTimers();

let model: Model;


const selectors = {
  closeSidepanel:".o-sidePanel .o-sidePanelClose",
  inputSearch: ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) input",
  inputReplace: ".o-sidePanel .o-find-and-replace .o-section:nth-child(3) input",
  previousButton: ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(2) .o-sidePanelButton:nth-child(1)",
  nextButton: ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(2) .o-sidePanelButton:nth-child(2)",
  replaceButton: ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(4) .o-sidePanelButton:nth-child(1)",
  replaceAllButton: ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(4) .o-sidePanelButton:nth-child(2)",
  checkBoxMatchingCase: ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-far-checkbox:nth-of-type(1) input",
  checkBoxExactMatch: ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-far-checkbox:nth-of-type(2) input",
  checkBoxSearchFormulas: ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-far-checkbox:nth-of-type(3) input",
  checkBoxReplaceFormulas: ".o-sidePanel .o-find-and-replace .o-section:nth-child(3) .o-far-checkbox:nth-of-type(1) input",
}

describe("find and replace sidePanel component", () => {
  let fixture: HTMLElement;
  let parent: GridParent;
  beforeEach(async () => {
    model = new Model();
    fixture = makeTestFixture();
    parent = new GridParent(model);
    await parent.mount(fixture);
    parent.env.openSidePanel("FindAndReplace");
    await nextTick();
  });

  afterEach(() => {
    fixture.remove();
    parent.destroy();
  });

  test("Can close the find and replace side panel", async () => {
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
    triggerMouseEvent(document.querySelector(selectors.closeSidepanel), "click");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
  });

  describe("basic search", () => {
    beforeEach(() => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "hello" });
      model.dispatch("SET_VALUE", { xc: "A3", text: "=1" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "hello1" });
      model.dispatch("SET_VALUE", { xc: "A4", text: "111" });
      model.dispatch("SET_VALUE", { xc: "A5", text: "1" });
      model.dispatch("SET_VALUE", { xc: "A6", text: "2" });
    });

    test("search will highlight background all cells with a match", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      jest.runAllTimers();
      await nextTick();
      const highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(4);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 3, bottom: 3 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 4, bottom: 4 });
      expect(highlight[3].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("background");
      expect(highlight[3].type).toBe("all");
    });
    test("clicking on next will select the second match", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      jest.runAllTimers();
      triggerMouseEvent(document.querySelector(selectors.nextButton),"click");
      await nextTick();
      const highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(4);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 3, bottom: 3 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 4, bottom: 4 });
      expect(highlight[3].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("background");
      expect(highlight[3].type).toBe("all");
    });

    test("clicking on next than previous will select the first match", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      jest.runAllTimers();
      triggerMouseEvent(document.querySelector(selectors.nextButton),"click");
      triggerMouseEvent(document.querySelector(selectors.previousButton),"click");
      await nextTick();
      const highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(4);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 3, bottom: 3 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 4, bottom: 4 });
      expect(highlight[3].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("background");
      expect(highlight[3].type).toBe("all");
    });

    test("change the search", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "hello", "input");
      jest.runAllTimers();
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.nextButton),"click");
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(2);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("all");
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      jest.runAllTimers();
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(4);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 3, bottom: 3 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 4, bottom: 4 });
      expect(highlight[3].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("background");
      expect(highlight[3].type).toBe("all");
    });

    test("won't search on empty string", async() =>{
      setInputValueAndTrigger(selectors.inputSearch, "", "input");
      jest.runAllTimers();
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(0);
    })
  });
  describe("next/previous cycle", () => {
    beforeEach(async () => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "1" });
      model.dispatch("SET_VALUE", { xc: "A3", text: "1" });
    });
    test("search will cycle with next", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      jest.runAllTimers();
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("all");

      triggerMouseEvent(document.querySelector(selectors.nextButton),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("all");

      triggerMouseEvent(document.querySelector(selectors.nextButton),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("all");

      triggerMouseEvent(document.querySelector(selectors.nextButton),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("all");

      triggerMouseEvent(document.querySelector(selectors.nextButton),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("all");
    });
    test("search will cycle with previous", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      jest.runAllTimers();
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("all");

      triggerMouseEvent(document.querySelector(selectors.previousButton),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("all");

      triggerMouseEvent(document.querySelector(selectors.previousButton),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("all");

      triggerMouseEvent(document.querySelector(selectors.previousButton),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("all");

      triggerMouseEvent(document.querySelector(selectors.previousButton),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("all");
    });
    test("disable next/previous/replace/replaceAll if searching on empty string", async() =>{
      setInputValueAndTrigger(selectors.inputSearch, "", "input");
      jest.runAllTimers();
      await nextTick();
      expect((document.querySelector(selectors.previousButton) as HTMLButtonElement).disabled).toBe(true);
      expect((document.querySelector(selectors.nextButton) as HTMLButtonElement).disabled).toBe(true);
      expect((document.querySelector(selectors.replaceButton) as HTMLButtonElement).disabled).toBe(true);
      expect((document.querySelector(selectors.replaceAllButton) as HTMLButtonElement).disabled).toBe(true);
    })
  })
  describe("search options", ()=>{
    beforeEach(async () => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "hello=sum" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "Hello" });
      model.dispatch("SET_VALUE", { xc: "A3", text: "=SUM(1,3)" });
      model.dispatch("SET_VALUE", { xc: "A4", text: "hell" });
      model.dispatch("SET_VALUE", { xc: "A5", text: "Hell" });
    });

    test("Can search matching case", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "Hell", "input");
      jest.runAllTimers();
      triggerMouseEvent(document.querySelector(selectors.checkBoxMatchingCase),"click");
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(2);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 4, bottom: 4 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("all");
    });

    test("Can search matching entire cell", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "hell", "input");
      jest.runAllTimers();
      triggerMouseEvent(document.querySelector(selectors.checkBoxExactMatch),"click");
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(2);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 4, bottom: 4 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 3, bottom: 3 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("all");
    });

    test("search in formulas shows formulas", async () => {
      triggerMouseEvent(
        document.querySelector(selectors.checkBoxSearchFormulas),"click");
      await nextTick();
      expect(model.getters.shouldShowFormulas()).toBe(true);
    });

    test("Can search in formulas", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "sum", "input");
      jest.runAllTimers();
      triggerMouseEvent(document.querySelector(selectors.checkBoxSearchFormulas),"click");
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(model.getters.shouldShowFormulas()).toBe(true);
      expect(highlight.length).toBe(2);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("all");
    });

    test("Can search in formulas(2)", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "4", "input");
      jest.runAllTimers();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(1);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[0].type).toBe("all");
      triggerMouseEvent(document.querySelector(selectors.checkBoxSearchFormulas),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(model.getters.shouldShowFormulas()).toBe(true);
      expect(highlight.length).toBe(0);
    });

    test("Combine matching case / matching entire cell / search in formulas", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "hell", "input");
      jest.runAllTimers();
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(4);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 1, bottom: 1 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 3, bottom: 3 });
      expect(highlight[2].zone).toStrictEqual({ left: 0, right: 0, top: 4, bottom: 4 });
      expect(highlight[3].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("background");
      expect(highlight[2].type).toBe("background");
      expect(highlight[3].type).toBe("all");

      //match case
      triggerMouseEvent(document.querySelector(selectors.checkBoxMatchingCase),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(2);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 3, bottom: 3 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("all");

      //match case + exact match
      triggerMouseEvent(document.querySelector(selectors.checkBoxExactMatch),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(1);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 3, bottom: 3 });
      expect(highlight[0].type).toBe("all");

      //change input and remove match case + exact match and add look in formula
      setInputValueAndTrigger(selectors.inputSearch, "SUM", "input");
      jest.runAllTimers();
      triggerMouseEvent(document.querySelector(selectors.checkBoxMatchingCase),"click");
      triggerMouseEvent(document.querySelector(selectors.checkBoxExactMatch),"click");
      triggerMouseEvent(document.querySelector(selectors.checkBoxSearchFormulas),"click");
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(2);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[1].zone).toStrictEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(highlight[0].type).toBe("background");
      expect(highlight[1].type).toBe("all");

      //add match case
      triggerMouseEvent(document.querySelector(selectors.checkBoxMatchingCase),"click");
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      await nextTick();
      highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(1);
      expect(highlight[0].zone).toStrictEqual({ left: 0, right: 0, top: 2, bottom: 2 });
      expect(highlight[0].type).toBe("all");
    });

  })
  describe("replace options", () =>{
    beforeEach(async () => {
      model.dispatch("SET_VALUE", { xc: "A1", text: "hello" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "=SUM(2,2)" });
      model.dispatch("SET_VALUE", { xc: "A3", text: "hell" });
      model.dispatch("SET_VALUE", { xc: "A4", text: "hell" });
    });
    test("Can replace a simple text value", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch),"hello","input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace),"kikou","input");
      jest.runAllTimers();
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.replaceButton),"click");
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(0);
      expect(getCell(model, "A1")!.content).toBe("kikou");
    });

    test("Can replace a value in a formula", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch),"2","input");
      jest.runAllTimers();
      triggerMouseEvent(document.querySelector(selectors.checkBoxSearchFormulas),"click");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace),"4","input");
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.replaceButton),"click");
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(0);
      expect(getCell(model, "A2")!.content).toBe("=SUM(4,4)");
    });

    test("formulas will be overwritten if modify formula is checked", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch),"4","input");
      jest.runAllTimers();
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace),"2","input");
      triggerMouseEvent(document.querySelector(selectors.checkBoxReplaceFormulas),"click");
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.replaceButton),"click");
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(0);
      expect(getCell(model, "A2")!.content).toBe("2");
    });

    test("formulas wont be modified if not looking in formulas or not modifying formulas", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch),"4","input");
      jest.runAllTimers();
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace),"2","input");
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.replaceButton),"click");
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(1);
      expect(getCell(model, "A2")!.content).toBe("=SUM(2,2)");
    });

    test("can replace all", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch),"hell","input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace),"kikou","input");
      jest.runAllTimers();
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.replaceAllButton),"click");
      await nextTick();
      let highlight = model.getters.getHighlights();
      expect(highlight.length).toBe(0);
      expect(getCell(model, "A1")!.content).toBe("kikouo");
      expect(getCell(model, "A2")!.content).toBe("=SUM(2,2)");
      expect(getCell(model, "A3")!.content).toBe("kikou");
      expect(getCell(model, "A4")!.content).toBe("kikou");
    });
  })
});
