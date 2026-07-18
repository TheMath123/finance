import { describe, expect, test } from "bun:test";
import { createInMemoryCache } from "./in-memory-cache";

describe("in-memory cache", () => {
  test("retorna undefined pra chave inexistente", async () => {
    const cache = createInMemoryCache();
    expect(await cache.get("nope")).toBeUndefined();
  });

  test("guarda e devolve o valor dentro do TTL", async () => {
    const cache = createInMemoryCache();
    await cache.set("k", { total: 42 }, 60);
    expect(await cache.get<{ total: number }>("k")).toEqual({ total: 42 });
  });

  test("expira após o TTL", async () => {
    const cache = createInMemoryCache();
    await cache.set("k", 1, -1);
    expect(await cache.get<number>("k")).toBeUndefined();
  });
});
