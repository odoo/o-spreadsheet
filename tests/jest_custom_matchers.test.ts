import { CommandResult, DispatchResult, Model } from "../src";
import { UuidGenerator } from "../src/helpers/uuid";
import { setupCollaborativeEnv } from "./collaborative/collaborative_helpers";
import { getCellContent, setCellContent } from "./test_helpers";
import { createModelFromGrid } from "./test_helpers/helpers";

function setDom(html: string) {
  document.body.innerHTML = html;
}

beforeEach(() => {
  let uuidCounter = 0;
  jest
    .spyOn(UuidGenerator, "smallUuid")
    .mockImplementation(() => `mock-smallUuid-${uuidCounter++}`);
  jest.spyOn(UuidGenerator, "uuidv4").mockImplementation(() => `mock-uuidv4-${uuidCounter++}`);
});

describe("toBeBetween", () => {
  test("Bounds are inclusive", () => {
    expect(3).toBeBetween(3, 5);
    expect(5).toBeBetween(3, 5);
    expect(() => expect(2).toBeBetween(3, 5)).toThrow("Expected 2 to be between 3 and 5");
  });

  test("can use not.toBeBetween", () => {
    expect(2).not.toBeBetween(3, 5);
    expect(6).not.toBeBetween(3, 5);
    expect(() => expect(4).not.toBeBetween(3, 5)).toThrow("Expected 4 not to be between 3 and 5");
  });
});

describe("toBeSameColorAs", () => {
  test("compares equivalent colors", () => {
    expect("rgb(255, 0, 0)").toBeSameColorAs("#ff0000");
    expect("#FfFfFf").toBeSameColorAs("#ffffFF");
    expect(() => expect("#ff0000").toBeSameColorAs("#00ff00")).toThrow(
      "Expected #ff0000 to be equivalent to #00ff00 with a tolerance of 0"
    );
  });

  test("can compare colors with tolerance", () => {
    expect("#ff0001").toBeSameColorAs("#ff0000", 0.1);
    expect(() => expect("#ff0000").toBeSameColorAs("#ff00f0", 0.1)).toThrow(
      "Expected #ff0000 to be equivalent to #ff00f0 with a tolerance of 0.1"
    );
  });

  test("can use not.toBeSameColor", () => {
    expect("#ff0000").not.toBeSameColorAs("#00ff00");
    expect(() => expect("#ff0000").not.toBeSameColorAs("#ff0001", 0.1)).toThrow(
      "Expected #ff0000 not to be equivalent to #ff0001 with a tolerance of 0.1"
    );
  });
});

describe("toHaveValue", () => {
  test("supports text inputs and checkbox", () => {
    setDom(`
			<div>
				<input class="text-input" value="hello">
				<input class="checkbox-input" type="checkbox" checked>
			</div>
		`);

    expect(".text-input").toHaveValue("hello");
    expect(".checkbox-input").toHaveValue(true);

    // Note: it would be really annoying to test the full message because of jest pretty printing with colors/newlines
    expect(() => expect(".text-input").toHaveValue("world")).toThrowErrorMatchingSnapshot();
  });

  test("Can use not.toHaveValue", () => {
    setDom(`<input class="text-input" value="hello">`);

    expect(".text-input").not.toHaveValue("world");

    expect(() => expect(".text-input").not.toHaveValue("hello")).toThrowErrorMatchingSnapshot();
  });
});

describe("toHaveText", () => {
  test("matches exact text content", () => {
    setDom('<div class="label">Exact text</div>');

    expect(".label").toHaveText("Exact text");
    expect(() => expect(".label").toHaveText("Other text")).toThrowErrorMatchingSnapshot();
  });

  test("Can use not.toHaveText", () => {
    setDom('<div class="label">Exact text</div>');

    expect(".label").not.toHaveText("Other text");
    expect(() => expect(".label").not.toHaveText("Exact text")).toThrowErrorMatchingSnapshot();
  });
});

describe("toHaveCount", () => {
  test("counts matching elements", () => {
    setDom('<div class="item"></div><div class="item"></div>');

    expect(".item").toHaveCount(2);
    expect(() => expect(".item").toHaveCount(1)).toThrowErrorMatchingSnapshot();
  });

  test("can use not.toHaveCount", () => {
    setDom('<div class="item"></div><div class="item"></div>');

    expect(".item").not.toHaveCount(1);
    expect(() => expect(".item").not.toHaveCount(2)).toThrowErrorMatchingSnapshot();
  });
});

describe("toHaveClass", () => {
  test("can match an element classes", () => {
    setDom('<div class="box alpha beta"></div>');

    expect(".box").toHaveClass("alpha");
    expect(".box").toHaveClass("beta");
    expect(() => expect(".box").toHaveClass("gamma")).toThrowErrorMatchingSnapshot();
  });

  test("can use not.toHaveClass", () => {
    setDom('<div class="box alpha beta"></div>');

    expect(".box").not.toHaveClass("gamma");
    expect(() => expect(".box").not.toHaveClass("alpha")).toThrowErrorMatchingSnapshot();
  });
});

describe("toHaveAttribute", () => {
  test("matches attribute values", () => {
    setDom('<button class="action" aria-label="Confirm"></button>');

    expect(".action").toHaveAttribute("aria-label", "Confirm");
    expect(() =>
      expect(".action").toHaveAttribute("aria-label", "Cancel")
    ).toThrowErrorMatchingSnapshot();
  });

  test("can use not.toHaveAttribute", () => {
    setDom('<button class="action" aria-label="Confirm"></button>');

    expect(".action").not.toHaveAttribute("aria-label", "Cancel");
    expect(() =>
      expect(".action").not.toHaveAttribute("aria-label", "Confirm")
    ).toThrowErrorMatchingSnapshot();
  });
});

describe("toHaveStyle", () => {
  test("compares inline styles and normalizes rgb colors", () => {
    setDom('<div class="styled" style="color: rgb(255, 0, 0); display: block;"></div>');

    expect(".styled").toHaveStyle({ color: "#FF0000", display: "block" });
    expect(() =>
      expect(".styled").toHaveStyle({ color: "#00FF00" })
    ).toThrowErrorMatchingSnapshot();
  });

  test("can use not.toHaveStyle", () => {
    setDom('<div class="styled" style="color: rgb(255, 0, 0); display: block;"></div>');

    expect(".styled").not.toHaveStyle({ color: "#00FF00" });
    expect(() =>
      expect(".styled").not.toHaveStyle({ display: "block" })
    ).toThrowErrorMatchingSnapshot();
  });
});

describe("toBeCancelledBecause", () => {
  test("matches cancelled dispatch reasons", () => {
    const cancelled = new DispatchResult(CommandResult.CancelledForUnknownReason);

    expect(cancelled).toBeCancelledBecause(CommandResult.CancelledForUnknownReason);
    expect(() =>
      expect(cancelled).toBeCancelledBecause(CommandResult.WillRemoveExistingMerge)
    ).toThrowErrorMatchingSnapshot();
  });

  test("can use not.toBeCancelledBecause", () => {
    const cancelled = new DispatchResult(CommandResult.CancelledForUnknownReason);

    expect(cancelled).not.toBeCancelledBecause(CommandResult.WillRemoveExistingMerge);
    expect(() =>
      expect(cancelled).not.toBeCancelledBecause(CommandResult.CancelledForUnknownReason)
    ).toThrow(
      "The command should not have been cancelled because of reason CancelledForUnknownReason"
    );
  });
});

describe("toBeSuccessfullyDispatched", () => {
  test("matches successful dispatch results", () => {
    expect(DispatchResult.Success).toBeSuccessfullyDispatched();
    expect(() =>
      expect(
        new DispatchResult(CommandResult.CancelledForUnknownReason)
      ).toBeSuccessfullyDispatched()
    ).toThrowErrorMatchingSnapshot();
  });

  test("can use not.toBeSuccessfullyDispatched", () => {
    expect(
      new DispatchResult(CommandResult.CancelledForUnknownReason)
    ).not.toBeSuccessfullyDispatched();
    expect(() =>
      expect(DispatchResult.Success).not.toBeSuccessfullyDispatched()
    ).toThrowErrorMatchingSnapshot();
  });
});

describe("toExport", () => {
  test("ignores the revision id and compares exported data", () => {
    const model = createModelFromGrid({ A1: "42" });
    const expected = model.exportData() as any;

    expected.revisionId = "random-id";

    expect(model).toExport(expected);
    expect(() => expect(model).toExport(new Model().exportData())).toThrowErrorMatchingSnapshot();
  });

  test("can use not.toExport", () => {
    const model = createModelFromGrid({ A1: "42" });
    const expected = model.exportData() as any;
    expected.revisionId = "random-id";

    expect(model).not.toExport({ ...expected, sheets: [] });
    expect(() => expect(model).not.toExport(expected)).toThrowErrorMatchingSnapshot();
  });
});

describe("toHaveSynchronizedValue", () => {
  test("compares the callback result across models", () => {
    const { network, alice, bob } = setupCollaborativeEnv();
    network.concurrent(() => setCellContent(alice, "A1", "=1+1"));

    expect([alice, bob]).toHaveSynchronizedValue((model) => getCellContent(model, "A1"), "2");
    expect(() =>
      expect([alice, new Model()]).toHaveSynchronizedValue(
        (model) => getCellContent(model, "A1"),
        "1"
      )
    ).toThrowErrorMatchingSnapshot();
  });

  test("cannot use not.toHaveSynchronizedValue, as it does not make sense", () => {
    const { alice, bob } = setupCollaborativeEnv();
    expect(() =>
      expect([alice, bob]).not.toHaveSynchronizedValue((model) => getCellContent(model, "A1"), "1")
    ).toThrow("not.toHaveSynchronizedValue is not supported");
  });
});

describe("toHaveSynchronizedEvaluation", () => {
  test("compares evaluated cells across models", () => {
    const { network, alice, bob } = setupCollaborativeEnv();
    network.concurrent(() => setCellContent(alice, "A1", "=1+1"));

    expect([alice, bob]).toHaveSynchronizedEvaluation();
    expect(() =>
      expect([alice, new Model()]).toHaveSynchronizedEvaluation()
    ).toThrowErrorMatchingSnapshot();
  });

  test("cannot use not.toHaveSynchronizedEvaluation, as it does not make sense", () => {
    const { alice, bob } = setupCollaborativeEnv();
    expect(() => expect([alice, bob]).not.toHaveSynchronizedEvaluation()).toThrow(
      "not.toHaveSynchronizedEvaluation is not supported"
    );
  });
});

describe("toHaveSynchronizedExportedData", () => {
  test("compares exported workbook data", () => {
    const { network, alice, bob } = setupCollaborativeEnv();
    network.concurrent(() => setCellContent(alice, "A1", "42"));
    expect([alice, bob]).toHaveSynchronizedExportedData();
    expect(() =>
      expect([alice, new Model()]).toHaveSynchronizedExportedData()
    ).toThrowErrorMatchingSnapshot();
  });

  test("cannot use not.toHaveSynchronizedExportedData, as it does not make sense", () => {
    const { alice, bob } = setupCollaborativeEnv();
    expect(() => expect([alice, bob]).not.toHaveSynchronizedExportedData()).toThrow(
      "not.toHaveSynchronizedExportedData is not supported"
    );
  });
});
