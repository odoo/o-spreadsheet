import { CategorySection } from "../components/side_panel/data_analysis/data_statistics/category_section";
import { DateSection } from "../components/side_panel/data_analysis/data_statistics/date_section";
import { NumberSection } from "../components/side_panel/data_analysis/data_statistics/number_section";
import { StatValue } from "../helpers/data_statistics/statistics_items";
import { Registry } from "./registry";

interface StatisticsComponent {
  Body: any;
  sortItems?: (
    items: StatValue[],
    sortType: "asc" | "desc" | "none"
  ) => { sortedItems: StatValue[]; newSortType: "asc" | "desc" | "none" };
}

export const statisticsRegistry = new Registry<StatisticsComponent>();

statisticsRegistry.add("categorical", {
  Body: CategorySection,
  sortItems: (
    items: StatValue[],
    sortType: "asc" | "desc" | "none"
  ): { sortedItems: StatValue[]; newSortType: "asc" | "desc" | "none" } => {
    switch (sortType) {
      case "desc":
        return {
          sortedItems: items.sort(
            (a, b) => Number(a.value) - Number(b.value) || a.name.localeCompare(b.name)
          ),
          newSortType: "asc",
        };
      case "asc":
        return {
          sortedItems: items.sort((a, b) => a.name.localeCompare(b.name)),
          newSortType: "none",
        };
      case "none":
        return {
          sortedItems: items.sort(
            (a, b) => Number(b.value) - Number(a.value) || a.name.localeCompare(b.name)
          ),
          newSortType: "desc",
        };
    }
  },
});

statisticsRegistry.add("number", {
  Body: NumberSection,
  sortItems: (
    items: StatValue[],
    sortType: "asc" | "desc" | "none"
  ): { sortedItems: StatValue[]; newSortType: "asc" | "desc" | "none" } => {
    switch (sortType) {
      case "desc":
        return {
          sortedItems: items.sort((a, b) => Number(a.value) - Number(b.value)),
          newSortType: "asc",
        };
      case "asc":
        return {
          sortedItems: items,
          newSortType: "none",
        };
      case "none":
        return {
          sortedItems: items.sort((a, b) => Number(b.value) - Number(a.value)),
          newSortType: "desc",
        };
    }
  },
});

statisticsRegistry.add("date", {
  Body: DateSection,
});
