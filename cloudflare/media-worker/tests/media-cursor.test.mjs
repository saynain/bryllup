import assert from "node:assert/strict";
import test from "node:test";
import { parseMediaCursor } from "../src/media-cursor.ts";

test("parses display order as a number for D1 cursor comparisons", () => {
  const cursor = parseMediaCursor(
    "350|2026-08-20T10:49:23.775Z|img-1787222963775-98d903cb64c01298"
  );

  assert.deepEqual(cursor, {
    sortAt: 350,
    createdAt: "2026-08-20T10:49:23.775Z",
    id: "img-1787222963775-98d903cb64c01298",
  });
  assert.equal(typeof cursor?.sortAt, "number");
});

test("rejects malformed or unsafe display orders", () => {
  assert.equal(parseMediaCursor(null), null);
  assert.equal(parseMediaCursor("not-a-number|2026-08-20T10:49:23.775Z|img-1"), null);
  assert.equal(parseMediaCursor("9007199254740992|2026-08-20T10:49:23.775Z|img-1"), null);
});
