import { useEffect } from "@odoo/owl";
import { useSpreadsheetRect } from "./position_hook";

export function useScreenSize() {
  const spreadsheetRect = useSpreadsheetRect();
  let isSmall = false;

  function computeScreenSize() {
    isSmall = spreadsheetRect.width < 768 ? true : false;
  }
  computeScreenSize();
  useEffect(
    () => {
      computeScreenSize();
    },
    () => [spreadsheetRect.width]
  );

  return {
    get isSmall() {
      return isSmall;
    },
  };
}
