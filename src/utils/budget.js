import { groupSize } from "../data/tripData.js";

const excludedTypes = new Set(["airbnb", "villa", "airport", "port", "lodging", "shopping", "beach", "sightseeing"]);

export function getBudgetActivities(activities = []) {
  return activities.filter((item) => !excludedTypes.has(item.type));
}

export function getPerPersonCost(item) {
  if (!item || excludedTypes.has(item.type)) return 0;
  if (item.costPerPersonTHB) return item.costPerPersonTHB;
  return Math.round((item.costTHB || 0) / groupSize);
}

export function getTotalEstimate(activities = []) {
  return getBudgetActivities(activities).reduce(
    (total, item) => total + getPerPersonCost(item),
    0
  );
}

export function getDayEstimate(activities = [], day) {
  return getBudgetActivities(activities)
    .filter((item) => item.day === day)
    .reduce((total, item) => total + getPerPersonCost(item), 0);
}

export function getBookedTourActualByDay(activities = []) {
  return getBudgetActivities(activities)
    .filter((item) => item.type === "tour")
    .reduce((days, item) => {
      days[item.day] = (days[item.day] || 0) + getPerPersonCost(item);
      return days;
    }, {});
}

export function getCategoryBreakdown(activities = []) {
  const budgetItems = getBudgetActivities(activities);
  const rows = [
    { key: "tours", label: "Tours", value: sumByTypes(budgetItems, ["tour"]) },
    { key: "food", label: "Food & cafes", value: sumByTypes(budgetItems, ["cafe", "food", "restaurant"]) },
    { key: "temples", label: "Temples & entry", value: sumByTypes(budgetItems, ["temple", "entry"]) },
    { key: "transport", label: "Transport", value: sumByTypes(budgetItems, ["transport"]) }
  ];
  const assignedTotal = rows.reduce((total, row) => total + row.value, 0);
  rows.push({
    key: "other",
    label: "Other",
    value: Math.max(getTotalEstimate(activities) - assignedTotal, 0)
  });
  return rows;
}

function sumByTypes(activities, types) {
  return activities
    .filter((item) => types.includes(item.type))
    .reduce((total, item) => total + getPerPersonCost(item), 0);
}
