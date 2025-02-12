import { useEffect } from "@odoo/owl";
import { useSpreadsheetRect } from "./position_hook";

export function useScreenWidth() {
  const spreadsheetRect = useSpreadsheetRect();
  let isSmall = false;

  function updateScreenWidth() {
    isSmall = spreadsheetRect.width < 768 ? true : false;
  }
  updateScreenWidth();
  useEffect(
    () => {
      updateScreenWidth();
    },
    () => [spreadsheetRect.width]
  );
  return {
    get isSmall() {
      return isSmall;
    },
  };
}
