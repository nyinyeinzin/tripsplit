import assert from "node:assert/strict";
import test from "node:test";
import { suggestionsForCountry } from "./popularDestinations.js";

test("Indonesia offers Bali and Jakarta without limiting manual entry", () => {
  assert.ok(suggestionsForCountry("ID").includes("Bali"));
  assert.ok(suggestionsForCountry("ID").includes("Jakarta"));
  assert.deepEqual(suggestionsForCountry("IS"), []);
});
