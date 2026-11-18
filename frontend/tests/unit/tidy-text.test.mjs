import { test } from "node:test";
import assert from "node:assert/strict";
import { tidyText, tidyTitle } from "../../lib/tidy-text.ts";

test("a semicolon between two thoughts becomes two sentences", () => {
  assert.equal(tidyText("Klaim menyebar dalam 36 jam terakhir; mayoritas bernada negatif."), "Klaim menyebar dalam 36 jam terakhir. Mayoritas bernada negatif.");
  assert.equal(tidyText("A; B"), "A; B"); // a capital after it is left alone
  assert.equal(tidyText(null), "");
});

test("a 'Label: name' title reads as a phrase", () => {
  assert.equal(tidyTitle("Lonjakan isu kebocoran data: Bank Arunika"), "Lonjakan isu kebocoran data Bank Arunika");
  assert.equal(tidyTitle("Respons positif program UMKM"), "Respons positif program UMKM");
});
