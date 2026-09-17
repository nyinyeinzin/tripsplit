import assert from "node:assert/strict";
import test from "node:test";
import { countries, findCountry } from "./countries.js";

test("country list includes the searchable Singapore example", () => {
  assert.equal(countries.length, 249);
  assert.deepEqual(findCountry("singapore"), { code: "SG", name: "Singapore" });
  assert.deepEqual(findCountry(" SG "), { code: "SG", name: "Singapore" });
  assert.equal(findCountry("not a country"), undefined);
});
