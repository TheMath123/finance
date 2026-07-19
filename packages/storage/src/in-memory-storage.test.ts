import { describe, expect, test } from "bun:test";
import { createInMemoryStorage } from "./in-memory-storage";

describe("in-memory storage", () => {
  test("upload e depois getSignedReadUrl funciona pra chave existente", async () => {
    const storage = createInMemoryStorage();
    await storage.upload("k1", new Uint8Array([1, 2, 3]), "image/png");
    const url = await storage.getSignedReadUrl("k1", 60);
    expect(url).toContain("k1");
  });

  test("getSignedReadUrl falha pra chave inexistente", async () => {
    const storage = createInMemoryStorage();
    await expect(storage.getSignedReadUrl("nope", 60)).rejects.toThrow();
  });

  test("delete remove a chave", async () => {
    const storage = createInMemoryStorage();
    await storage.upload("k1", new Uint8Array([1]), "image/png");
    await storage.delete("k1");
    await expect(storage.getSignedReadUrl("k1", 60)).rejects.toThrow();
  });
});
