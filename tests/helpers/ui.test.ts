import { interactiveRenameSheet } from "../../src/helpers/ui/sheet";
import { Model } from "../../src/model";
import { createSheetWithName } from "../test_helpers/commands_helpers";
import { makeInteractiveTestEnv } from "../test_helpers/helpers";

describe("UI Helpers", () => {
  test.each([
    ["", "The sheet name cannot be empty."],
    [
      "hééélo///",
      "Some used characters are not allowed in a sheet name (Forbidden characters are ' * ? / \\ [ ]).",
    ],
  ])(
    "Rename a sheet with interaction with wrong name %s",
    async (sheetName, expectedErrorMessage) => {
      const nameCallback = jest.fn().mockReturnValueOnce(sheetName).mockReturnValueOnce("new name");
      const editTextSpy = jest.fn();
      const editText = (
        title: string,
        placeholder: string,
        callback: (text: string | null) => any
      ) => {
        editTextSpy(title.toString());
        callback(nameCallback());
      };
      const model = new Model({});
      const env = makeInteractiveTestEnv(model, { editText });
      interactiveRenameSheet(env, model.getters.getActiveSheetId());
      expect(editTextSpy).toHaveBeenCalledTimes(2);
      expect(editTextSpy).toHaveBeenNthCalledWith(1, "Rename Sheet");
      expect(editTextSpy).toHaveBeenNthCalledWith(2, "Rename Sheet - " + expectedErrorMessage);
    }
  );

  test("Rename a sheet with interaction with same name as other sheet", async () => {
    const sheetName = "existing sheet";
    const nameCallback = jest.fn().mockReturnValueOnce(sheetName).mockReturnValueOnce("new name");
    const editTextSpy = jest.fn();
    const editText = (
      title: string,
      placeholder: string,
      callback: (text: string | null) => any
    ) => {
      editTextSpy(title.toString());
      callback(nameCallback());
    };
    const model = new Model({});
    const env = makeInteractiveTestEnv(model, { editText });
    createSheetWithName(model, { sheetId: "42", activate: false }, sheetName);
    interactiveRenameSheet(env, model.getters.getActiveSheetId());
    expect(editTextSpy).toHaveBeenCalledTimes(2);
    expect(editTextSpy).toHaveBeenNthCalledWith(1, "Rename Sheet");
    expect(editTextSpy).toHaveBeenNthCalledWith(
      2,
      `Rename Sheet - A sheet with the name ${sheetName} already exists. Please select another name.`
    );
  });
});
