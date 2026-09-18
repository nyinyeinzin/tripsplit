import assert from "node:assert/strict";
import test from "node:test";
import { matchingCityNames } from "./citySearch.js";

test("city search matches only the selected prefix and removes duplicates", () => {
  const cities = [{ name: "Jakarta" }, { name: "Bandung" }, { name: "Bogor" }, { name: "Bandung" }, { name: "Denpasar" }];
  assert.deepEqual(matchingCityNames(cities, "b"), ["Bandung", "Bogor"]);
  assert.deepEqual(matchingCityNames(cities, " BO "), ["Bogor"]);
  assert.deepEqual(matchingCityNames(cities, ""), []);
});

test("city search accepts unaccented typing", () => {
  assert.deepEqual(matchingCityNames([{ name: "Béziers" }], "be"), ["Béziers"]);
});
