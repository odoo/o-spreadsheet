import { CategorySection } from "../components/side_panel/data_analysis/data_statistics/category_section";
import { NumberSection } from "../components/side_panel/data_analysis/data_statistics/number_section";
import { Registry } from "./registry";

interface StatisticsComponent {
  Body: any;
}

export const statisticsRegistry = new Registry<StatisticsComponent>();

statisticsRegistry.add("categorical", {
  Body: CategorySection,
});

statisticsRegistry.add("number", {
  Body: NumberSection,
});
