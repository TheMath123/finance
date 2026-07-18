import { describe, expect, test } from "bun:test";
import { parseAmountAndRest } from "./transaction-text-parser";

describe("transaction-text-parser: parseAmountAndRest", () => {
  test("valor inteiro simples", () => {
    expect(parseAmountAndRest("50 mercado nubank")).toEqual({ amountCents: 5000, rest: "mercado nubank" });
  });

  test("valor com vírgula decimal", () => {
    expect(parseAmountAndRest("50,90 mercado nubank")).toEqual({
      amountCents: 5090,
      rest: "mercado nubank",
    });
  });

  test("valor com milhar e decimal", () => {
    expect(parseAmountAndRest("1.234,56 aluguel")).toEqual({ amountCents: 123456, rest: "aluguel" });
  });

  test("prefixo R$ é aceito", () => {
    expect(parseAmountAndRest("R$ 50 mercado")).toEqual({ amountCents: 5000, rest: "mercado" });
  });

  test("texto sem valor no início retorna null", () => {
    expect(parseAmountAndRest("gastei 50 no mercado")).toBeNull();
  });

  test("valor zero ou negativo retorna null", () => {
    expect(parseAmountAndRest("0 mercado")).toBeNull();
  });

  test("só valor sem descrição retorna null", () => {
    expect(parseAmountAndRest("50")).toBeNull();
  });
});
