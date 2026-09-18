import test from "node:test";
import assert from "node:assert/strict";
import { parseMapLink } from "./mapLinks.js";

test("extracts coordinates from Google and Apple Maps links", () => {
  assert.deepEqual(parseMapLink("https://www.google.com/maps/place/Hotel/@-8.4095,115.1889,16z"), { url: "https://www.google.com/maps/place/Hotel/@-8.4095,115.1889,16z", lat: -8.4095, lng: 115.1889 });
  assert.deepEqual(parseMapLink("https://maps.apple.com/?ll=1.3521%2C103.8198"), { url: "https://maps.apple.com/?ll=1.3521%2C103.8198", lat: 1.3521, lng: 103.8198 });
});

test("accepts short links without inventing coordinates", () => {
  assert.deepEqual(parseMapLink("https://maps.app.goo.gl/abc123"), { url: "https://maps.app.goo.gl/abc123" });
});

test("rejects non-map links and invalid coordinates", () => {
  assert.throws(() => parseMapLink("https://google.com.evil.example/maps?q=1,2"));
  assert.throws(() => parseMapLink("http://maps.apple.com/?ll=1,2"));
  assert.deepEqual(parseMapLink("https://maps.apple.com/?ll=120,200"), { url: "https://maps.apple.com/?ll=120,200" });
});
