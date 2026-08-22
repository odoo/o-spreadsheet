import { MatchImageSnapshotOptions, configureToMatchImageSnapshot } from "jest-image-snapshot";
import { CancelledReason, DispatchResult, Model, Zone } from "../../src";
import { isSameColor, toHex } from "../../src/helpers/color";
import { toXC } from "../../src/helpers/coordinates";
import { deepEquals } from "../../src/helpers/misc";
import { positions } from "../../src/helpers/zones";

type DOMTarget = string | Element | Document | Window | null;
type ExpectResult = { pass: boolean; message: () => string };

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Check that the given models are synchronized, i.e. they have the same
       * exportData
       */
      toHaveSynchronizedExportedData(): R;
      /*
       * Check that the evaluation of the given models are synchronized
       */
      toHaveSynchronizedEvaluation(): R;
      /**
       * Check that the same callback on each users give the same expected value
       */
      toHaveSynchronizedValue<T>(callback: (model: Model) => T, expected: T): R;
      /**
       * Check that the export data of the model is the same as the expected.
       * Note that it ignore the revisionId, as it's intended that it should be
       * different
       */
      toExport<T>(expected: T): R;
      toBeCancelledBecause(...expected: CancelledReason[]): R;
      toBeSuccessfullyDispatched(): R;
      /** Check if a number is between 2 values (inclusive) */
      toBeBetween(lower: number, upper: number): R;
      toBeSameColorAs(expected: string, tolerance?: number): R;
      toHaveValue(value: string | boolean): R;
      toHaveText(text: string): R;
      toHaveCount(count: number): R;
      toHaveClass(className: string): R;
      toHaveAttribute(attribute: string, value: string): R;
      toHaveStyle(style: Record<string, string>): R;
      toMatchImageSnapshot(options?: MatchImageSnapshotOptions): R;
    }
    interface Expect {
      toBeBetween(lower: number, upper: number): ExpectResult;
      toBeSameColorAs(expected: string, tolerance?: number): ExpectResult;
    }
  }
}

function getPrettyEvaluatedCells(model: Model, sheetId: string, zone: Zone) {
  return positions(zone).map(({ col, row }) => {
    return {
      sheetId,
      xc: toXC(col, row),
      value: model.getters.getEvaluatedCell({ sheetId, col, row }).value,
    };
  });
}

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  dumpDiffToConsole: false, // Print the base64 dif in the console. Can be useful for remote tests.
});

expect.extend({
  toMatchImageSnapshot,
  toExport(model: Model, expected: any) {
    const exportData = model.exportData();
    const pass = this.equals(exportData, { ...expected, revisionId: expect.any(String) }, [
      this.utils.iterableEquality,
    ]);
    const message = () =>
      `Diff: ${this.utils.printDiffOrStringify(
        expected,
        exportData,
        pass ? "Not expected" : "Expected",
        "Received",
        false
      )}`;
    return { pass, message };
  },
  toHaveSynchronizedValue(users: Model[], callback: (model: Model) => any, expected: any) {
    if (this.isNot) {
      throw new Error("not.toHaveSynchronizedValue is not supported");
    }
    for (const user of users) {
      const result = callback(user);
      if (!this.equals(result, expected, [this.utils.iterableEquality])) {
        const userId = user.getters.getCurrentClient().name;
        return {
          pass: false,
          message: () =>
            `${userId} does not have the expected value: \nReceived: ${this.utils.printReceived(
              result
            )}\nExpected: ${this.utils.printExpected(expected)}`,
        };
      }
    }
    return { pass: !this.isNot, message: () => "" };
  },
  toHaveSynchronizedEvaluation(users: Model[]) {
    if (this.isNot) {
      throw new Error("not.toHaveSynchronizedEvaluation is not supported");
    }
    for (let i = 0; i < users.length - 1; i++) {
      const a = users[i];
      const b = users[i + 1];
      for (const sheetId of a.getters.getSheetIds()) {
        const sheetZone = a.getters.getSheetZone(sheetId);
        const valuesUserA = a.getters.getEvaluatedCells(sheetId);
        const valuesUserB = b.getters.getEvaluatedCells(sheetId);
        if (!deepEquals(valuesUserA, valuesUserB)) {
          const clientA = a.getters.getCurrentClient().id;
          const clientB = b.getters.getCurrentClient().id;
          const prettyValuesUserA = getPrettyEvaluatedCells(a, sheetId, sheetZone);
          const prettyValuesUserB = getPrettyEvaluatedCells(b, sheetId, sheetZone);
          return {
            pass: false,
            message: () =>
              `${clientA} and ${clientB} are not synchronized: \n${this.utils.printDiffOrStringify(
                prettyValuesUserA,
                prettyValuesUserB,
                clientA,
                clientB,
                false
              )}`,
          };
        }
      }
    }
    return { pass: !this.isNot, message: () => "" };
  },
  toHaveSynchronizedExportedData(users: Model[]) {
    if (this.isNot) {
      throw new Error("not.toHaveSynchronizedExportedData is not supported");
    }
    for (let i = 0; i < users.length - 1; i++) {
      const a = users[i];
      const b = users[i + 1];
      const exportA = a.exportData();
      const exportB = b.exportData();
      if (!deepEquals(exportA, exportB)) {
        const clientA = a.getters.getCurrentClient().id;
        const clientB = b.getters.getCurrentClient().id;
        return {
          pass: false,
          message: () =>
            `${clientA} and ${clientB} are not synchronized: \n${this.utils.printDiffOrStringify(
              exportA,
              exportB,
              clientA,
              clientB,
              false
            )}`,
        };
      }
    }
    return { pass: !this.isNot, message: () => "" };
  },
  toBeCancelledBecause(dispatchResult: DispatchResult, ...expectedReasons: CancelledReason[]) {
    const pass = this.equals(dispatchResult.reasons, expectedReasons, [
      this.utils.iterableEquality,
    ]);
    const message = () => {
      if (pass) {
        return `The command should not have been cancelled because of reason ${expectedReasons}`;
      } else {
        return `
The command should have been cancelled:
Expected: ${this.utils.printExpected(expectedReasons)}
Received: ${this.utils.printReceived(dispatchResult.reasons)}
`;
      }
    };
    return { pass, message };
  },
  toBeSuccessfullyDispatched(dispatchResult: DispatchResult) {
    const pass = dispatchResult.isSuccessful;
    const message = () => {
      if (pass) {
        return "The command should not have been successfully dispatched";
      } else {
        return `
The command should have been successfully dispatched:
CancelledReasons: ${this.utils.printReceived(dispatchResult.reasons)}
`;
      }
    };
    return { pass, message };
  },
  toBeBetween(received: number, lower: number, upper: number) {
    const pass = received >= lower && received <= upper;
    return {
      pass,
      message: () =>
        `Expected ${received} ${pass ? "not " : ""}to be between ${lower} and ${upper}`,
    };
  },
  toBeSameColorAs(received: string, expected: string, tolerance: number = 0) {
    let pass = false;
    if (received.startsWith("light-dark") || expected.startsWith("light-dark")) {
      pass = received === expected;
    } else {
      pass = isSameColor(received, expected, tolerance);
    }
    const message = () =>
      `Expected ${received}${
        pass ? " not" : ""
      } to be equivalent to ${expected} with a tolerance of ${tolerance}`;
    return { pass, message };
  },
  toHaveValue(target: DOMTarget, expectedValue: string | boolean) {
    const element = getTarget(target);
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLSelectElement)) {
      const message = element ? "Target is not an input element" : "Target not found";
      return { pass: false, message: () => message };
    }
    const value =
      element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio")
        ? element.checked
        : element.value;

    const pass = value === expectedValue;
    const message = () => {
      const diff = this.utils.printDiffOrStringify(
        expectedValue,
        value,
        pass ? "Unexpected value" : "Expected value",
        "Received value",
        false
      );
      return pass
        ? `expect(target).not.toHaveValue(expected);\n\n${diff}`
        : `expect(target).toHaveValue(expected);\n\n${diff}`;
    };
    return { pass, message };
  },
  toHaveText(target: DOMTarget, expectedText: string) {
    const element = getTarget(target);
    if (!(element instanceof HTMLElement)) {
      const message = element ? "Target is not an HTML element" : "Target not found";
      return { pass: false, message: () => message };
    }
    const text = element.textContent;
    const pass = text === expectedText;
    const message = () => {
      const diff = this.utils.printDiffOrStringify(
        expectedText,
        text,
        pass ? "Unexpected text" : "Expected text",
        "Received text",
        false
      );
      return pass
        ? `expect(target).not.toHaveText(expected);\n\n${diff}`
        : `expect(target).toHaveText(expected);\n\n${diff}`;
    };
    return { pass, message };
  },
  toHaveCount(selector: string, expectedCount: number) {
    const elements = document.querySelectorAll(selector);
    const pass = elements.length === expectedCount;
    const message = () => {
      const diff = this.utils.printDiffOrStringify(
        expectedCount,
        elements.length,
        pass ? "Unexpected count" : "Expected count",
        "Received",
        false
      );
      return pass
        ? `expect("${selector}").not.toHaveCount(expected);\n\n${diff}`
        : `expect("${selector}").toHaveCount(expected);\n\n${diff}`;
    };
    return { pass, message };
  },
  toHaveClass(target: DOMTarget, expectedClass: string) {
    const element = getTarget(target);
    if (!(element instanceof HTMLElement || element instanceof SVGSVGElement)) {
      const message = element ? "Target is not an HTML element" : "Target not found";
      return { pass: false, message: () => message };
    }
    const pass = element.classList.contains(expectedClass);
    const message = () => {
      const diff = this.utils.printDiffOrStringify(
        expectedClass,
        element.className,
        pass ? "Unexpected class" : "Expected class",
        "Received classes",
        false
      );
      return pass
        ? `expect(target).not.toHaveClass(expected);\n\n${diff}`
        : `expect(target).toHaveClass(expected);\n\n${diff}`;
    };
    return { pass, message };
  },
  toHaveAttribute(target: DOMTarget, attribute: string, expectedValue: string) {
    const element = getTarget(target);
    if (!(element instanceof HTMLElement)) {
      const message = element ? "Target is not an HTML element" : "Target not found";
      return { pass: false, message: () => message };
    }
    const pass = element.getAttribute(attribute) === expectedValue;
    const message = () => {
      const diff = this.utils.printDiffOrStringify(
        expectedValue,
        element.getAttribute(attribute),
        pass ? "Unexpected attribute value" : "Expected attribute value",
        "Received value",
        false
      );
      return pass
        ? `expect(target).not.toHaveAttribute(${attribute}, expected);\n\n${diff}`
        : `expect(target).toHaveAttribute(${attribute}, expected);\n\n${diff}`;
    };
    return { pass, message };
  },
  toHaveStyle(target: DOMTarget, expectedStyle: Record<string, string>) {
    const element = getTarget(target);
    if (!(element instanceof HTMLElement)) {
      const message = element ? "Target is not an HTML element" : "Target not found";
      return { pass: false, message: () => message };
    }
    const receivedStyle: Record<string, string> = {};
    for (const key of Object.keys(expectedStyle)) {
      receivedStyle[key] = element.style.getPropertyValue(key);
      if (receivedStyle[key].startsWith("rgb")) {
        receivedStyle[key] = toHex(receivedStyle[key]);
      }
    }
    const pass = this.equals(receivedStyle, expectedStyle, [this.utils.iterableEquality]);
    const message = () => {
      const diff = this.utils.printDiffOrStringify(
        expectedStyle,
        receivedStyle,
        pass ? "Unexpected style" : "Expected style",
        "Received style",
        false
      );
      return pass
        ? `expect(target).not.toHaveStyle(expected);\n\n${diff}`
        : `expect(target).toHaveStyle(expected);\n\n${diff}`;
    };
    return { pass, message };
  },
});

function getTarget(target: DOMTarget): Element | Document | Window {
  if (target === null) {
    throw new Error("Target is null");
  }
  if (typeof target === "string") {
    const els = document.querySelectorAll(target);
    if (els.length === 0) {
      throw new Error(`No element found (selector: ${target})`);
    }
    return els[0];
  } else {
    return target;
  }
}
