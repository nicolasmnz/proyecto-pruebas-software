import { describe, expect, test } from "@jest/globals";

import { isUuid } from "../../src/utils/uuid.js";

describe("isUuid", () => {
  test.each([
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "11111111-1111-1111-1111-111111111111",
    "A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11",
  ])("acepta %p", (value) => {
    expect(isUuid(value)).toBe(true);
  });

  test.each(["1", "", "aaaaaaaa-aaaa-aaaa-aaaa", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaaz"])(
    "rechaza %p",
    (value) => {
      expect(isUuid(value)).toBe(false);
    },
  );
});
