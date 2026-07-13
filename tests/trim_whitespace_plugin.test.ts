import { NotificationStore } from "../src/stores/notification_store";
import { TrimWhitespaceStore } from "../src/stores/trim_whitespace_store";
import { getCellContent } from "./test_helpers";
import { selectCell, setCellContent, setSelection } from "./test_helpers/commands_helpers";
import { createModelFromGrid, getRangeValuesAsMatrix } from "./test_helpers/helpers";
import { makeStore, makeStoreWithModel } from "./test_helpers/stores";

describe("trim whitespace", () => {
  test("trim cell content", () => {
    const { model, store } = makeStore(TrimWhitespaceStore);
    setCellContent(model, "A2", "   Alo         ");
    selectCell(model, "A2");
    store.trimWhitespace();
    expect(getCellContent(model, "A2")).toBe("Alo");
  });

  test("remove duplicate spaces", () => {
    const { model, store } = makeStore(TrimWhitespaceStore);
    setCellContent(model, "A2", "  Alo        salut     sunt  eu    un haiduc  ");
    selectCell(model, "A2");
    store.trimWhitespace();
    expect(getCellContent(model, "A2")).toBe("Alo salut sunt eu un haiduc");
  });

  test("can trim on multiple selection", async () => {
    const model = createModelFromGrid({
      A1: "   Space   Opera",
      A2: " Space  Marine",
      A3: "  Space Cowboys   ",
      A4: "   Space Cake  ???    ",
    });
    const { store } = makeStoreWithModel(model, TrimWhitespaceStore);
    const notifyUserTextSpy = jest.fn();
    jest.spyOn(model.config, "notifyUI").mockImplementation(notifyUserTextSpy);
    setSelection(model, ["A1:A2", "A2:A3", "A4"]);
    store.trimWhitespace();
    expect(getCellContent(model, "A1")).toBe("Space Opera");
    expect(getCellContent(model, "A2")).toBe("Space Marine");
    expect(getCellContent(model, "A3")).toBe("Space Cowboys");
    expect(getCellContent(model, "A4")).toBe("Space Cake ???");
  });

  test("remove tabulation", () => {
    const { model, store } = makeStore(TrimWhitespaceStore);
    setCellContent(model, "A2", "\tAlo   \t     salut\tsunt eu \tun haiduc  \t");
    selectCell(model, "A2");
    store.trimWhitespace();
    expect(getCellContent(model, "A2")).toBe("Alo salut sunt eu un haiduc");
  });

  test("keep lines break", () => {
    // @compatibility: the TRIM Excel function does not keep line breaks
    const { model, store } = makeStore(TrimWhitespaceStore);
    setCellContent(model, "A2", "  Alo        salut   \n   sunt  eu  \n  un haiduc  ");
    selectCell(model, "A2");
    store.trimWhitespace();
    expect(getCellContent(model, "A2")).toBe("Alo salut\nsunt eu\nun haiduc");
  });

  test("keep empty lines break", () => {
    // @compatibility: the TRIM Google Sheets feature does not keep empty line breaks bue the formula does
    const { model, store } = makeStore(TrimWhitespaceStore);
    setCellContent(model, "A2", "  Alo        salut   \n\n   sunt  eu  \n     \n  un haiduc  ");
    selectCell(model, "A2");
    store.trimWhitespace();
    expect(getCellContent(model, "A2")).toBe("Alo salut\n\nsunt eu\n\nun haiduc");
  });

  test("apply it on all selected cells", () => {
    const model = createModelFromGrid({ A2: " a ", A3: " b ", A4: " c " });
    const { store } = makeStoreWithModel(model, TrimWhitespaceStore);
    setSelection(model, ["A2:A3", "A3:A4"]);
    store.trimWhitespace();
    expect(getRangeValuesAsMatrix(model, "A2:A4")).toEqual([["a"], ["b"], ["c"]]);
  });
});

describe("notify user", () => {
  test("notify when cells are trimmed", async () => {
    const model = createModelFromGrid({
      A1: " A B     B    A  ",
      A2: "  SPACES   INVADERS   !  ",
      A3: "NO SPACES INVADERS",
    });
    const { store, container } = makeStoreWithModel(model, TrimWhitespaceStore);
    const notificationStore = container.get(NotificationStore);
    const notifyUserTextSpy = jest.spyOn(notificationStore, "notifyUser");
    setSelection(model, ["A1:A3"]);
    store.trimWhitespace();
    expect(notifyUserTextSpy).toHaveBeenCalledWith({
      text: "Trimmed whitespace from 2 cells.",
      type: "info",
      sticky: false,
    });
  });

  test("notify when no cells trimmed", async () => {
    const model = createModelFromGrid({
      A1: "Space Jam",
      A2: "Space invaders",
      A3: "Space mountain",
    });
    const { store, container } = makeStoreWithModel(model, TrimWhitespaceStore);
    const notificationStore = container.get(NotificationStore);
    const notifyUserTextSpy = jest.spyOn(notificationStore, "notifyUser");
    setSelection(model, ["A1:A3"]);
    store.trimWhitespace();
    expect(notifyUserTextSpy).toHaveBeenCalledWith({
      text: "No selected cells had whitespace trimmed.",
      type: "info",
      sticky: false,
    });
  });
});
