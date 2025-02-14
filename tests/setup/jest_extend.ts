import { Model } from "../../src";
import { isSameColor } from "../../src/helpers/color";
import { toXC } from "../../src/helpers/coordinates";
import { deepEquals } from "../../src/helpers/misc";
import { positions } from "../../src/helpers/zones";
import { CancelledReason, DispatchResult, Zone } from "../../src/types";

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
    for (let user of users) {
      const result = callback(user);
      if (!this.equals(result, expected, [this.utils.iterableEquality])) {
        const userId = user.getters.getClient().name;
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
          const clientA = a.getters.getClient().id;
          const clientB = b.getters.getClient().id;
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
        const clientA = a.getters.getClient().id;
        const clientB = b.getters.getClient().id;
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
  toBeSameColorAs(received: string, expected: string, tolerance: number = 0) {
    const pass = isSameColor(received, expected, tolerance);
    const message = () =>
      pass
        ? ""
        : `Expected ${received} to be equivalent to ${expected} with a tolerance of ${tolerance}`;
    return {
      pass,
      message,
    };
  },
});
