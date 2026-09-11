import {
  TRIP_NAME,
  airbnbs as baseAirbnbs,
  groupSize,
  perPersonBudgetTHB,
  routeByDay,
  tripCorrections,
  tripDateLabel,
  tripDays
} from "../data/tripData.js";
import { getCategoryBreakdown, getDayEstimate, getTotalEstimate } from "./budget.js";

export function buildTripContext({ activities, airbnbs = baseAirbnbs, currency = "THB" }) {
  return {
    trip: {
      name: TRIP_NAME,
      dates: tripDateLabel,
      groupSize,
      currency,
      perPersonBudgetTHB,
      corrections: tripCorrections
    },
    stays: airbnbs.map(compactPlace),
    days: tripDays.map((day) => ({
      ...day,
      estimateTHB: getDayEstimate(activities, day.day),
      routeIds: routeByDay[day.day] || [],
      activities: activities
        .filter((item) => item.day === day.day)
        .map(compactPlace)
    })),
    budget: {
      perPersonEstimateTHB: getTotalEstimate(activities),
      categories: getCategoryBreakdown(activities)
    }
  };
}

function compactPlace(place) {
  return {
    id: place.id,
    day: place.day,
    date: place.date,
    title: place.title,
    area: place.area,
    time: place.time,
    travelFrom: place.travelFrom,
    travelTime: place.travelTime,
    type: place.type,
    costTHB: place.costTHB,
    costPerPersonTHB: place.costPerPersonTHB,
    lat: place.lat,
    lng: place.lng,
    notes: place.notes,
    aiAdded: Boolean(place.aiAdded),
    customAdded: Boolean(place.customAdded),
    deletable: Boolean(place.deletable)
  };
}
