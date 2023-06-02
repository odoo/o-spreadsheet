import { NAMESPACE } from "./namespaces";

export const FIGURE_SCHEMA = {
  name: "wsDr",
  namespace: NAMESPACE.spreadsheetDrawing,
  children: [
    {
      name: "twoCellAnchor", // Only twoCellAnchor are supported for xlsx drawings.
      quantifier: "many",
      children: [
        markerAnchorSchema("from"),
        markerAnchorSchema("to"),
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
} as const;

function markerAnchorSchema<N extends string>(name: N) {
  return {
    name,
    namespace: NAMESPACE.spreadsheetDrawing,
    children: [
      { name: "col", type: "number" },
      { name: "colOff", type: "number" },
      { name: "row", type: "number" },
      { name: "rowOff", type: "number" },
    ],
  } as const;
}
