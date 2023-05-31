import { ElementSchema } from "../xml";
import { NAMESPACE } from "./namespaces";

export const FIGURE_SCHEMA: ElementSchema = {
  name: "wsDr",
  namespace: NAMESPACE.spreadsheetDrawing,
  children: [
    {
      name: "twoCellAnchor", // Only twoCellAnchor are supported for xlsx drawings.
      quantifier: "many",
      children: [
        markerAnchor("from"),
        markerAnchor("to"),
        {
          name: "graphicFrame",
          children: [
            {
              name: "nvGraphicFramePr",
              children: [
                {
                  name: "cNvPr",
                  attributes: [{ name: "id" }, { name: "name" }, { name: "title" }],
                },
                { name: "cNvGraphicFramePr" },
              ],
            },
            {
              name: "xfrm",
              children: [
                { name: "off", namespace: NAMESPACE.drawing },
                { name: "ext", namespace: NAMESPACE.drawing },
              ],
            },
            {
              name: "graphic",
              namespace: NAMESPACE.drawing,
              children: [
                {
                  name: "graphicData",
                  attributes: [{ name: "uri" }],
                  children: [
                    {
                      name: "chart",
                      namespace: NAMESPACE.chart,
                      attributes: [{ name: "id", namespace: NAMESPACE.relationships }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function markerAnchor(name: string) {
  return {
    name,
    namespace: {
      uri: "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
      prefix: "xdr",
    },
    children: [{ name: "col" }, { name: "colOff" }, { name: "row" }, { name: "rowOff" }],
  };
}
