import { isSameColor, toHex } from "@odoo/o-spreadsheet-engine/helpers/color";
import { toXC } from "@odoo/o-spreadsheet-engine/helpers/coordinates";
import { deepEquals } from "@odoo/o-spreadsheet-engine/helpers/misc";
import { positions } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { Model } from "../../src";
import { CancelledReason, DispatchResult, Zone } from "../../src/types";

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
    }
    interface Expect {
      toBeBetween(lower: number, upper: number): ExpectResult;
      toBeSameColorAs(expected: string, tolerance?: number): ExpectResult;
      toBeCloseTo(expected: number, closeDigit?: number): ExpectResult;
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

expect.extend({
  toExport(model: Model, expected: any) {
    const exportData = model.exportData();
    if (
      !this.equals(exportData, { ...expected, revisionId: expect.any(String) }, [
        this.utils.iterableEquality,
      ])
    ) {
      return {
        pass: this.isNot,
        message: () =>
          `Diff: ${this.utils.printDiffOrStringify(
            expected,
            exportData,
            "Expected",
            "Received",
            false
          )}`,
      };
    }
    return { pass: !this.isNot, message: () => "" };
  },
  toHaveSynchronizedValue(users: Model[], callback: (model: Model) => any, expected: any) {
    for (const user of users) {
      const result = callback(user);
      if (!this.equals(result, expected, [this.utils.iterableEquality])) {
        const userId = user.getters.getCurrentClient().name;
        return {
          pass: this.isNot,
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
            pass: this.isNot,
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
    for (let i = 0; i < users.length - 1; i++) {
      const a = users[i];
      const b = users[i + 1];
      const exportA = a.exportData();
      const exportB = b.exportData();
      if (!deepEquals(exportA, exportB)) {
        const clientA = a.getters.getCurrentClient().id;
        const clientB = b.getters.getCurrentClient().id;
        return {
          pass: this.isNot,
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
    if (received < lower || received > upper) {
      return {
        pass: false,
        message: () => `Expected ${received} to be between ${lower} and ${upper}`,
      };
    }
    return { pass: true, message: () => "" };
  },
  toBeCloseTo(received: number, expected: number, numDigits?: number) {
    numDigits = numDigits ?? -2;
    const pass = Math.abs(expected - received) < 10 ** numDigits / 2;
    if (pass) {
      return { pass: true, message: () => "" };
    }
    return {
      pass: false,
      message: () =>
        `Expected ${received} to be close to ${expected} with a tolerance of ${
          10 ** numDigits / 2
        }`,
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
      pass
        ? ""
        : `Expected ${received} to be equivalent to ${expected} with a tolerance of ${tolerance}`;
    return {
      pass,
      message,
    };
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
    if (value !== expectedValue) {
      return {
        pass: false,
        message: () =>
          `expect(target).toHaveValue(expected);\n\n${this.utils.printDiffOrStringify(
            expectedValue,
            value,
            "Expected value",
            "Received value",
            false
          )}`,
      };
    }
    return { pass: true, message: () => "" };
  },
  toHaveText(target: DOMTarget, expectedText: string) {
    const element = getTarget(target);
    if (!(element instanceof HTMLElement)) {
      const message = element ? "Target is not an HTML element" : "Target not found";
      return { pass: false, message: () => message };
    }
    const text = element.textContent;
    if (text !== expectedText) {
      return {
        pass: false,
        message: () =>
          `expect(target).toHaveText(expected);\n\n${this.utils.printDiffOrStringify(
            expectedText,
            text,
            "Expected text",
            "Received text",
            false
          )}`,
      };
    }
    return { pass: true, message: () => "" };
  },
  toHaveCount(selector: string, expectedCount: number) {
    const elements = document.querySelectorAll(selector);
    if (elements.length !== expectedCount) {
      return {
        pass: false,
        message: () =>
          `expect("${selector}").toHaveCount(expected);\n\n${this.utils.printDiffOrStringify(
            expectedCount,
            elements.length,
            "Expected",
            "Received",
            false
          )}`,
      };
    }
    return { pass: true, message: () => "" };
  },
  toHaveClass(target: DOMTarget, expectedClass: string) {
    const element = getTarget(target);
    if (!(element instanceof HTMLElement || element instanceof SVGSVGElement)) {
      const message = element ? "Target is not an HTML element" : "Target not found";
      return { pass: false, message: () => message };
    }
    const pass = element.classList.contains(expectedClass);
    const message = () => {
      if (this.isNot && pass) {
        return `expect(target).not.toHaveClass(expected);\n\n${this.utils.printDiffOrStringify(
          expectedClass,
          element.className,
          "Unexpected class",
          "Received class",
          false
        )}`;
      } else if (!pass) {
        return `expect(target).toHaveClass(expected);\n\n${this.utils.printDiffOrStringify(
          expectedClass,
          element.className,
          "Expected class",
          "Received class",
          false
        )}`;
      }
      return "";
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
    const message = () =>
      pass
        ? ""
        : `expect(target).toHaveAttribute(attribute, expected);\n\n${this.utils.printDiffOrStringify(
            expectedValue,
            element.getAttribute(attribute),
            "Expected value",
            "Received value",
            false
          )}`;
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
    const message = () =>
      pass
        ? ""
        : `expect(target).toHaveStyle(expected);\n\n${this.utils.printDiffOrStringify(
            expectedStyle,
            receivedStyle,
            "Expected style",
            "Received style",
            false
          )}`;
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
