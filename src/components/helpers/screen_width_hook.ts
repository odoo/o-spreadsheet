import { useEffect, useState } from "@odoo/owl";
import { MOBILE_WIDTH_BREAKPOINT } from "../../constants";
import { useSpreadsheetRect } from "./position_hook";

export function useScreenWidth() {
  const spreadsheetRect = useSpreadsheetRect();
  const state = useState({ isSmall: false });

  function updateScreenWidth() {
    state.isSmall = spreadsheetRect.width < MOBILE_WIDTH_BREAKPOINT;
  }
  updateScreenWidth();
  useEffect(
    () => {
      updateScreenWidth();
    },
    () => [spreadsheetRect.width]
  );
  return state;
}
