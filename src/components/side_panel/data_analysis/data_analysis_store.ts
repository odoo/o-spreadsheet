import {
  analyzeColumns,
  ColumnAnalysis,
} from "../../../helpers/figures/charts/chart_suggestion_engine";
import { formatValue } from "../../../helpers/format/format";
import { zoneToXc } from "../../../helpers/zones";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { _t } from "../../../translation";
import { Command, invalidateEvaluationCommands } from "../../../types/commands";
import { isMatrix } from "../../../types/misc";
import { Get } from "../../../types/store_engine";

type StatItem = {
  name: string;
  value: string;
  formula: string;
  description?: string;
  interpretation?: string;
};
type StatGroup = { label?: string; items: StatItem[] };
export type StatSection = { title: string; range: string; groups: StatGroup[] };

export class DataAnalysisStore extends SpreadsheetStore {
  mutators = [] as const;
  /** One section per individual column (drives the column selector). */
  perColSections: StatSection[] = [];
  hasData: boolean = false;
  private isDirty = false;
  ranges?: string[];

  constructor(get: Get) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: () => {
        const zones = this.getters.getSelectedZones();
        this.ranges = zones.map(zoneToXc);
        this.refreshStatistics();
      },
    });
    this.onDispose(() => {
      this.model.selection.unobserve(this);
    });
    this.ranges = this.getters.getSelectedZones().map(zoneToXc);
    this.refreshStatistics();
  }

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd))
    ) {
      this.isDirty = true;
    }
    switch (cmd.type) {
      case "HIDE_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS":
      case "GROUP_HEADERS":
      case "UNGROUP_HEADERS":
      case "ACTIVATE_SHEET":
      case "ACTIVATE_NEXT_SHEET":
      case "ACTIVATE_PREVIOUS_SHEET":
      case "EVALUATE_CELLS":
      case "UNDO":
      case "REDO":
        this.isDirty = true;
    }
  }

  finalize() {
    if (this.isDirty) {
      this.isDirty = false;
      this.refreshStatistics();
    }
  }

  private item(
    sheetId: string,
    name: string,
    formula: string,
    description?: string,
    interpret?: (value: number, aux?: number) => string | undefined,
    auxFormula?: string
  ): StatItem {
    const locale = this.getters.getLocale();
    const result = this.getters.evaluateFormulaResult(sheetId, formula);
    if (!isMatrix(result) && !result.message) {
      const { value, format } = result;
      if (value !== null && value !== undefined) {
        const displayValue =
          typeof value === "number" && !format ? parseFloat(value.toFixed(4)) : value;
        let interpretation: string | undefined;
        if (typeof value === "number" && interpret) {
          let aux: number | undefined;
          if (auxFormula) {
            const auxResult = this.getters.evaluateFormulaResult(sheetId, auxFormula);
            if (!isMatrix(auxResult) && !auxResult.message && typeof auxResult.value === "number") {
              aux = auxResult.value;
            }
          }
          interpretation = interpret(value, aux) ?? undefined;
        }
        return {
          name,
          value: formatValue(displayValue, { locale, format }),
          formula,
          description,
          interpretation,
        };
      }
    }
    return { name, value: "—", formula, description };
  }

  private dateItems(sheetId: string, range: string): StatItem[] {
    return [
      this.item(sheetId, _t("Count"), `=COUNTA(${range})`, _t("Number of non-empty cells.")),
      this.item(
        sheetId,
        _t("Unique"),
        `=COUNTUNIQUE(${range})`,
        _t("Number of distinct dates. If much lower than Count, many dates repeat.")
      ),
      this.item(sheetId, _t("Earliest"), `=MIN(${range})`, _t("The oldest date in the dataset.")),
      this.item(
        sheetId,
        _t("Latest"),
        `=MAX(${range})`,
        _t("The most recent date in the dataset.")
      ),
      this.item(
        sheetId,
        _t("Span (days)"),
        `=DAYS(MAX(${range}),MIN(${range}))`,
        _t("Number of days between the earliest and latest date.")
      ),
      this.item(
        sheetId,
        _t("Empty"),
        `=COUNTBLANK(${range})`,
        _t("Number of cells with no value. High empty count may affect analysis.")
      ),
    ];
  }

  private categoryItems(sheetId: string, range: string): StatItem[] {
    return [
      this.item(sheetId, _t("Count"), `=COUNTA(${range})`, _t("Number of non-empty cells.")),
      this.item(
        sheetId,
        _t("Unique"),
        `=COUNTUNIQUE(${range})`,
        _t(
          "Number of distinct categories. High value means many different values; low value means few categories repeated often."
        )
      ),
      this.item(
        sheetId,
        _t("Empty"),
        `=COUNTBLANK(${range})`,
        _t("Number of cells with no value. High empty count may affect analysis.")
      ),
    ];
  }

  private booleanItems(sheetId: string, range: string): StatItem[] {
    return [
      this.item(sheetId, _t("Count"), `=COUNTA(${range})`, _t("Number of non-empty cells.")),
      this.item(sheetId, _t("True"), `=COUNTIF(${range},TRUE)`, _t("Number of TRUE values.")),
      this.item(sheetId, _t("False"), `=COUNTIF(${range},FALSE)`, _t("Number of FALSE values.")),
      this.item(
        sheetId,
        _t("Empty"),
        `=COUNTBLANK(${range})`,
        _t("Number of cells with no value. High empty count may affect analysis.")
      ),
    ];
  }

  private columnTitle(col: ColumnAnalysis, indexInAll: number): string {
    if (col.header) {
      return col.header;
    }
    const n = indexInAll + 1;
    switch (col.type) {
      case "number":
      case "percentage":
        return _t("Col %s (numeric)", n);
      case "date":
        return _t("Col %s (date)", n);
      case "boolean":
        return _t("Col %s (boolean)", n);
      case "categorical":
      case "label":
        return _t("Col %s (categorical)", n);
      default:
        return _t("Col %s", n);
    }
  }

  private buildStatSections(cols: ColumnAnalysis[], sheetId: string): StatSection[] {
    const isSingleColumn = cols.length === 1;
    const sections: StatSection[] = [];

    const interpretPearson = (v: number): string => {
      const abs = Math.abs(v);
      const dir = v >= 0 ? _t("positive") : _t("negative");
      if (abs >= 0.9) {
        return _t("Very strong %s correlation", dir);
      }
      if (abs >= 0.7) {
        return _t("Strong %s correlation", dir);
      }
      if (abs >= 0.5) {
        return _t("Moderate %s correlation", dir);
      }
      if (abs >= 0.3) {
        return _t("Weak %s correlation", dir);
      }
      return _t("Very weak or no linear correlation");
    };

    const interpretPValue = (v: number): string => {
      if (v < 0.001) {
        return _t("Very strong evidence (p < 0.001)");
      }
      if (v < 0.01) {
        return _t("Strong evidence (p < 0.01)");
      }
      if (v < 0.05) {
        return _t("Statistically significant (p < 0.05)");
      }
      if (v < 0.1) {
        return _t("Marginal evidence (p < 0.1)");
      }
      return _t("Not statistically significant (p ≥ 0.1)");
    };

    const colIndex = new Map<ColumnAnalysis, number>();
    const numCols: ColumnAnalysis[] = [];
    const dateCols: ColumnAnalysis[] = [];
    const catCols: ColumnAnalysis[] = [];
    const boolCols: ColumnAnalysis[] = [];

    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      colIndex.set(col, i);
      switch (col.type) {
        case "number":
        case "percentage":
          numCols.push(col);
          break;
        case "date":
          dateCols.push(col);
          break;
        case "categorical":
        case "label":
          catCols.push(col);
          break;
        case "boolean":
          boolCols.push(col);
          break;
      }
    }

    const otherNumCount = numCols.length - 1;
    for (const col of numCols) {
      const range = zoneToXc(col.zone);

      const summaryItems: StatItem[] = [
        this.item(sheetId, _t("Count"), `=COUNTA(${range})`, _t("Number of non-empty cells.")),
        this.item(sheetId, _t("Sum"), `=SUM(${range})`, _t("Total of all values.")),
        this.item(
          sheetId,
          _t("Average"),
          `=AVERAGE(${range})`,
          _t(
            "Sum divided by count. Sensitive to extreme values — if far from the median, outliers are pulling it."
          )
        ),
      ];
      if (isSingleColumn) {
        summaryItems.push(
          this.item(
            sheetId,
            _t("Median"),
            `=MEDIAN(${range})`,
            _t(
              "Middle value when sorted. Robust to outliers. If much lower than average, a few high values are skewing the mean upward."
            )
          )
        );
      }

      const groups: StatGroup[] = [
        { items: summaryItems },
        {
          label: _t("Dispersion"),
          items: [
            this.item(
              sheetId,
              _t("Std Dev"),
              `=STDEV(${range})`,
              _t(
                "Average distance from the mean. ~68% of values lie within 1 std dev of the mean, ~95% within 2."
              ),
              (_, cv) => {
                if (cv === undefined) {
                  return undefined;
                }
                const pct = Math.round(Math.abs(cv) * 100);
                if (Math.abs(cv) < 0.15) {
                  return _t("Low variability relative to the mean (CV = %s%)", pct);
                }
                if (Math.abs(cv) < 0.3) {
                  return _t("Moderate variability relative to the mean (CV = %s%)", pct);
                }
                return _t("High variability relative to the mean (CV = %s%)", pct);
              },
              `=IFERROR(STDEV(${range})/ABS(AVERAGE(${range})),"")`
            ),
            this.item(sheetId, _t("Min"), `=MIN(${range})`, _t("Smallest value in the dataset.")),
            this.item(sheetId, _t("Max"), `=MAX(${range})`, _t("Largest value in the dataset.")),
          ],
        },
      ];

      if (isSingleColumn) {
        groups.push({
          label: _t("Distribution"),
          items: [
            this.item(
              sheetId,
              _t("Skewness"),
              `=SKEW(${range})`,
              _t(
                "Asymmetry of the distribution. Near 0 = symmetric. Positive = long right tail (a few high outliers). Negative = long left tail (a few low outliers)."
              ),
              (v) => {
                const abs = Math.abs(v);
                if (abs < 0.5) {
                  return _t("Approximately symmetric distribution");
                }
                if (v > 0) {
                  return abs < 1
                    ? _t("Moderately right-skewed")
                    : _t("Highly right-skewed — a few extreme high values");
                }
                return abs < 1
                  ? _t("Moderately left-skewed")
                  : _t("Highly left-skewed — a few extreme low values");
              }
            ),
            this.item(
              sheetId,
              _t("Kurtosis"),
              `=KURT(${range})`,
              _t(
                "Shape of the peak compared to a normal distribution. Near 0 = normal. Positive = sharper peak with more extreme outliers. Negative = flatter, more spread out."
              ),
              (v) => {
                if (Math.abs(v) < 0.5) {
                  return _t("Similar shape to a normal distribution");
                }
                return v > 0
                  ? _t("Sharper peak than normal — more extreme outliers likely")
                  : _t("Flatter peak than normal — fewer extreme outliers");
              }
            ),
          ],
        });
      }

      for (const other of numCols) {
        if (other === col) {
          continue;
        }
        const otherRange = zoneToXc(other.zone);
        const otherName = this.columnTitle(other, colIndex.get(other)!);
        if (otherNumCount === 1) {
          groups.push({
            label: otherName,
            items: [
              this.item(
                sheetId,
                _t("Pearson"),
                `=PEARSON(${range},${otherRange})`,
                _t(
                  "Linear correlation from -1 to 1. |r| > 0.7 = strong, 0.3–0.7 = moderate, < 0.3 = weak. Sign indicates direction."
                ),
                interpretPearson
              ),
              this.item(
                sheetId,
                _t("R²"),
                `=RSQ(${range},${otherRange})`,
                _t(
                  "Proportion of variance explained by the linear relationship. 0.8 means 80% of the variation in Y is explained by X."
                ),
                (v) =>
                  _t(
                    "%s% of the variation is explained by the linear relationship",
                    Math.round(v * 100)
                  )
              ),
              this.item(
                sheetId,
                _t("Slope"),
                `=SLOPE(${range},${otherRange})`,
                _t("How much this column increases for each unit increase in the other column."),
                (v) =>
                  v > 0
                    ? _t("Increases with the other column")
                    : v < 0
                    ? _t("Decreases as the other column increases")
                    : _t("No linear trend between columns")
              ),
              this.item(
                sheetId,
                _t("Intercept"),
                `=INTERCEPT(${range},${otherRange})`,
                _t("Predicted value of this column when the other column equals 0.")
              ),
              this.item(
                sheetId,
                _t("T-test p-value"),
                `=T.TEST(${range},${otherRange},2,3)`,
                _t(
                  "Probability of observing this difference in means by chance alone. < 0.05 = the two columns likely have different means."
                ),
                interpretPValue
              ),
              this.item(
                sheetId,
                _t("F-test p-value"),
                `=F.TEST(${range},${otherRange})`,
                _t(
                  "Probability of observing this difference in spread by chance alone. < 0.05 = the two columns likely have different variability."
                ),
                interpretPValue
              ),
            ],
          });
        } else {
          groups.push({
            label: otherName,
            items: [
              this.item(
                sheetId,
                _t("Pearson"),
                `=PEARSON(${range},${otherRange})`,
                _t(
                  "Linear correlation from -1 to 1. |r| > 0.7 = strong, 0.3–0.7 = moderate, < 0.3 = weak. Sign indicates direction."
                ),
                interpretPearson
              ),
            ],
          });
        }
      }

      for (const dateCol of dateCols) {
        const dateRange = zoneToXc(dateCol.zone);
        const dateName = this.columnTitle(dateCol, colIndex.get(dateCol)!);
        groups.push({
          label: dateName,
          items: [
            this.item(
              sheetId,
              _t("Pearson"),
              `=PEARSON(${range},${dateRange})`,
              _t(
                "Linear correlation with time from -1 to 1. Positive = values tend to increase over time. Negative = values tend to decrease."
              ),
              interpretPearson
            ),
            this.item(
              sheetId,
              _t("Slope/day"),
              `=SLOPE(${range},${dateRange})`,
              _t("Average daily change in this column over time."),
              (v) =>
                v > 0
                  ? _t("Values tend to increase over time")
                  : v < 0
                  ? _t("Values tend to decrease over time")
                  : _t("No temporal trend detected")
            ),
          ],
        });
      }

      sections.push({ title: this.columnTitle(col, colIndex.get(col)!), range, groups });
    }

    for (const col of dateCols) {
      const range = zoneToXc(col.zone);
      sections.push({
        title: this.columnTitle(col, colIndex.get(col)!),
        range,
        groups: [{ items: this.dateItems(sheetId, range) }],
      });
    }

    for (const col of catCols) {
      const range = zoneToXc(col.zone);
      const groups: StatGroup[] = [{ items: this.categoryItems(sheetId, range) }];
      for (const other of catCols) {
        if (other === col) {
          continue;
        }
        const otherRange = zoneToXc(other.zone);
        const otherName = this.columnTitle(other, colIndex.get(other)!);
        groups.push({
          label: otherName,
          items: [
            this.item(
              sheetId,
              _t("Cramér's V"),
              `=SQRT(CHISQ.TEST(${range},${otherRange}) / (COUNTA(${range}) * (MIN(COUNTUNIQUE(${range}), COUNTUNIQUE(${otherRange})) - 1)))`,
              _t(
                "Strength of association between two categorical columns, from 0 to 1. 0 = no association. 1 = perfect association. Think of it like a correlation for categories."
              ),
              (v) => {
                if (v < 0.1) {
                  return _t("Negligible association");
                }
                if (v < 0.3) {
                  return _t("Weak association");
                }
                if (v < 0.5) {
                  return _t("Moderate association");
                }
                return _t("Strong association");
              }
            ),
            this.item(
              sheetId,
              _t("χ² p-value"),
              `=CHISQ.DIST.RT(CHISQ.TEST(${range},${otherRange}),(COUNTUNIQUE(${range})-1)*(COUNTUNIQUE(${otherRange})-1))`,
              _t(
                "Probability that the two columns are independent by chance. < 0.05 = the association between the two columns is statistically significant."
              ),
              interpretPValue
            ),
          ],
        });
      }
      sections.push({ title: this.columnTitle(col, colIndex.get(col)!), range, groups });
    }

    for (const col of boolCols) {
      const range = zoneToXc(col.zone);
      const groups: StatGroup[] = [{ items: this.booleanItems(sheetId, range) }];
      for (const other of boolCols) {
        if (other === col) {
          continue;
        }
        const otherRange = zoneToXc(other.zone);
        const otherName = this.columnTitle(other, colIndex.get(other)!);
        groups.push({
          label: otherName,
          items: [
            this.item(
              sheetId,
              _t("MCC"),
              `=MATTHEWS(${range},${otherRange})`,
              _t(
                "Matthews Correlation Coefficient: correlation between two yes/no columns, from -1 to 1. 0 = no relationship. 1 = perfect agreement. More reliable than accuracy when true/false values are unbalanced."
              ),
              (v) => {
                const abs = Math.abs(v);
                if (abs < 0.2) {
                  return _t("Very weak or no correlation");
                }
                const dir = v > 0 ? _t("positive") : _t("negative");
                if (abs < 0.4) {
                  return _t("Weak %s correlation", dir);
                }
                if (abs < 0.6) {
                  return _t("Moderate %s correlation", dir);
                }
                if (abs < 0.8) {
                  return _t("Strong %s correlation", dir);
                }
                return _t("Very strong %s correlation", dir);
              }
            ),
          ],
        });
      }
      sections.push({ title: this.columnTitle(col, colIndex.get(col)!), range, groups });
    }

    return sections;
  }

  private refreshStatistics() {
    const getters = this.getters;
    const sheetId = getters.getActiveSheetId();
    const ranges = this.ranges;

    if (!ranges?.length) {
      this.perColSections = [];
      this.hasData = false;
      return;
    }

    const rangesArg = ranges.join(",");
    const countaResult = getters.evaluateFormula(sheetId, `=COUNTA(${rangesArg})`);
    this.hasData = typeof countaResult === "number" && countaResult > 0;

    if (!this.hasData) {
      this.perColSections = [];
      return;
    }

    const zones = getters.getSelectedZones();
    const cols = analyzeColumns(zones, getters);
    const nonEmpty = cols.filter((c) => c.type !== "empty");
    this.perColSections = this.buildStatSections(nonEmpty, sheetId);
  }
}
