import { StatValue } from "../helpers/data_statistics/statistics_items";
import { Registry } from "./registry";

interface StatisticsComponent {
  sortItems: (
    items: StatValue[],
    sortType: "asc" | "desc" | "none"
  ) => { sortedItems: StatValue[]; newSortType: "asc" | "desc" | "none" };
}

export const statisticsRegistry = new Registry<StatisticsComponent>();

statisticsRegistry.add("categorical", {
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
