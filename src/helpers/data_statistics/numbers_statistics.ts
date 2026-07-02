import { _t } from "../../translation";
import { valueInterpretation } from "./statistics_items";

export function interpretAverage(
  mean: number,
  median: number,
  skewness: number,
  stdDev: number,
  highOutliers = 0,
  lowOutliers = 0
): valueInterpretation {
  const hasHighOutliers = highOutliers > 0 || (skewness > 1 && mean > median);
  const hasLowOutliers = lowOutliers > 0 || (skewness < -1 && mean < median);
  const isHighlyDispersed = mean !== 0 && stdDev / Math.abs(mean) > 0.5;

  const fmt = (num: number | undefined) => Number(num?.toFixed(2));

  if (highOutliers > 0 && lowOutliers > 0) {
    return {
      main: _t("Values are highly dispersed. The average may not reflect a typical result."),
      details: _t(
        "This average is unstable because your data contains exceptionally high AND exceptionally low values."
      ),
      technicalData: [
        { title: _t("Data Distribution"), value: _t("Extreme Outliers (Both sides)") },
        { title: _t("Standard Deviation"), value: fmt(stdDev) },
        { title: _t("Skewness"), value: `${fmt(skewness)} (${_t("Bi-directional")})` },
      ],
      recommandation: _t(
        "Use the Median (%s) to completely ignore these two-sided extreme values.",
        fmt(median)
      ),
    };
  }

  if (hasHighOutliers) {
    return {
      main: _t("Values are highly dispersed. The average may not reflect a typical result."),
      details: _t("This average is pulled upward by a few exceptionally high values."),
      technicalData: [
        { title: _t("Data Distribution"), value: _t("Positively Skewed") },
        { title: _t("Standard Deviation"), value: fmt(stdDev) },
        { title: _t("Skewness"), value: `${fmt(skewness)} (${_t("Right-skewed")})` },
      ],
      recommandation: _t(
        "Use the Median (%s) to avoid the positive bias caused by these extremes.",
        fmt(median)
      ),
    };
  }

  if (hasLowOutliers) {
    return {
      main: _t("Values are highly dispersed. The average may not reflect a typical result."),
      details: _t("This average is pulled downward by a few exceptionally low values."),
      technicalData: [
        { title: _t("Data Distribution"), value: _t("Negatively Skewed") },
        { title: _t("Standard Deviation"), value: fmt(stdDev) },
        { title: _t("Skewness"), value: `${fmt(skewness)} (${_t("Left-skewed")})` },
      ],
      recommandation: _t(
        "Use the Median (%s) to avoid the negative bias caused by these extremes.",
        fmt(median)
      ),
    };
  }

  if (isHighlyDispersed) {
    return {
      main: _t("Values are highly dispersed. The average may not reflect a typical result."),
      details: _t(
        "The standard deviation is high, indicating that the values are spread out over a wide range."
      ),
      technicalData: [
        { title: _t("Data Distribution"), value: _t("High Volatility") },
        { title: _t("Standard Deviation"), value: fmt(stdDev) },
        { title: _t("Skewness"), value: fmt(skewness) },
      ],
      recommandation: _t(
        "Your data is very fragmented. Consider filtering by categories or segments."
      ),
    };
  }

  return {
    main: _t("The average is highly reliable and represents the majority of your data."),
    details: _t("Your mean and median are close, which confirms a stable trend."),
    technicalData: [
      { title: _t("Data Distribution"), value: _t("Balanced") },
      { title: _t("Standard Deviation"), value: fmt(stdDev) },
      { title: _t("Skewness"), value: fmt(skewness) },
    ],
    recommandation: _t("Your data is stable and well-distributed."),
  };
}

export function interpretPearson(v: number): valueInterpretation {
  const abs = Math.abs(v);
  const dir = v >= 0 ? _t("positive") : _t("negative");
  if (abs >= 0.9) {
    return { main: _t("Very strong %s correlation", dir) };
  }
  if (abs >= 0.7) {
    return { main: _t("Strong %s correlation", dir) };
  }
  if (abs >= 0.5) {
    return { main: _t("Moderate %s correlation", dir) };
  }
  if (abs >= 0.3) {
    return { main: _t("Weak %s correlation", dir) };
  }
  return { main: _t("Very weak or no linear correlation") };
}

export function interpretPValue(v: number): valueInterpretation {
  if (v < 0.001) {
    return { main: _t("Very strong evidence (p < 0.001)") };
  }
  if (v < 0.01) {
    return { main: _t("Strong evidence (p < 0.01)") };
  }
  if (v < 0.05) {
    return { main: _t("Statistically significant (p < 0.05)") };
  }
  if (v < 0.1) {
    return { main: _t("Marginal evidence (p < 0.1)") };
  }
  return { main: _t("Not statistically significant (p ≥ 0.1)") };
}
