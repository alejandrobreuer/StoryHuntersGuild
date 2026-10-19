import type { ShgFinanceCategory } from "@/types/database";
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, formatSignedMoney, formatShortDate, parseAmount } from "./format";
import { draftToPayload, newDraft, validateDraft, withType } from "./draft";
import { describeRange, filtersFromParams, filtersToParams, periodRange, todayIso } from "./periods";

test("formatMoney: es-AR, decimals only when non-zero", () => {
  assert.equal(formatMoney(16000), "$ 16.000");
  assert.equal(formatMoney(4500.5), "$ 4.500,50");
  assert.equal(formatMoney(0), "$ 0");
  assert.equal(formatMoney(-84000), "− $ 84.000");
});

test("formatSignedMoney", () => {
  assert.equal(formatSignedMoney("income", 16000), "+ $ 16.000");
  assert.equal(formatSignedMoney("expense", 18500), "− $ 18.500");
});

test("formatShortDate", () => {
  assert.equal(formatShortDate("2026-11-02"), "02/11/26");
});

test("parseAmount accepts the ways people type amounts", () => {
  assert.equal(parseAmount("4500"), 4500);
  assert.equal(parseAmount("4.500"), 4500);
  assert.equal(parseAmount("4500,50"), 4500.5);
  assert.equal(parseAmount("4.500,50"), 4500.5);
  assert.equal(parseAmount("1.234.567"), 1234567);
  assert.equal(parseAmount("$ 4.500"), 4500);
  assert.equal(parseAmount("4500.50"), 4500.5);
  assert.equal(parseAmount(" 85000 "), 85000);
});

test("parseAmount rejects garbage", () => {
  // "12,345": a comma is always the decimal mark, and three decimals isn't money.
  for (const bad of ["", "abc", "4,5,0", "-5", "4.5.0", "12,345", "1e5"]) {
    assert.equal(parseAmount(bad), null, bad);
  }
});

test("periodRange", () => {
  const today = "2026-11-15";
  assert.deepEqual(periodRange("mes", today), { from: "2026-11-01", to: "2026-11-30" });
  assert.deepEqual(periodRange("mes-anterior", today), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(periodRange("trimestre", today), { from: "2026-09-01", to: "2026-11-30" });
  assert.deepEqual(periodRange("anio", today), { from: "2026-01-01", to: "2026-12-31" });
  assert.deepEqual(periodRange("todo", today), { from: null, to: null });
  assert.deepEqual(periodRange("mes-anterior", "2026-01-10"), { from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(periodRange("trimestre", "2026-02-28"), { from: "2025-12-01", to: "2026-02-28" });
  assert.deepEqual(periodRange("custom", today, { from: "2026-03-01", to: null }), { from: "2026-03-01", to: null });
});

test("todayIso uses Argentina time", () => {
  // 02:00 UTC on Nov 1 is still Oct 31 in Buenos Aires (UTC−3).
  assert.equal(todayIso(new Date("2026-11-01T02:00:00Z")), "2026-10-31");
});

test("describeRange", () => {
  assert.equal(describeRange("2026-08-01", "2026-11-30"), "Agosto – noviembre 2026");
  assert.equal(describeRange("2026-10-01", "2026-10-31"), "Octubre 2026");
  assert.equal(describeRange("2025-12-01", "2026-02-28"), "Diciembre 2025 – febrero 2026");
});

test("URL filters round-trip and ignore junk", () => {
  const id = "1f0c2e9a-3b4d-4e5f-8a9b-0c1d2e3f4a5b";
  const f = filtersFromParams(new URLSearchParams(`q=fundas&tipo=gastos&evento=${id}&periodo=custom&desde=2026-01-01&hasta=2026-02-01&categoria=${id}`));
  assert.deepEqual(f, { q: "fundas", tipo: "gastos", evento: id, periodo: "custom", desde: "2026-01-01", hasta: "2026-02-01", categoria: id });
  assert.equal(filtersFromParams(filtersToParams(f)).q, "fundas");
  assert.deepEqual(filtersFromParams(filtersToParams(f)), f);

  const junk = filtersFromParams(new URLSearchParams("tipo=x&evento=1;drop&periodo=nope&desde=ayer&categoria=x"));
  assert.deepEqual(junk, { q: "", tipo: "todos", evento: "", periodo: "todo", desde: "", hasta: "", categoria: "" });
  assert.equal(filtersToParams(junk).toString(), "");
  assert.equal(filtersFromParams(new URLSearchParams("evento=general")).evento, "general");
});

// ─── Drafts ──────────────────────────────────────────────────────────────────

function cat(id: string, name: string, type: "income" | "expense", extra: Partial<ShgFinanceCategory> = {}): ShgFinanceCategory {
  return { id, name, type, is_active: true, sort_order: 0, is_system: false, system_key: null, created_at: "", ...extra };
}
const CATS = [
  cat("r", "Reservas", "income", { is_system: true, system_key: "bookings" }),
  cat("o", "Otros ingresos", "income"),
  cat("j", "Juegos", "expense"),
  cat("i", "Insumos", "expense"),
  cat("x", "Vieja", "expense", { is_active: false }),
];

test("new rows start with the spec's defaults", () => {
  const g = newDraft("new:1", "expense", "2026-10-19", CATS);
  assert.equal(g.category_id, "i");
  assert.equal(g.event_id, "");
  assert.equal(g.status, "confirmed");
  assert.equal(g.occurred_on, "2026-10-19");
  assert.equal(newDraft("new:2", "income", "2026-10-19", CATS).category_id, "r");
});

test("changing type swaps a category of the wrong type", () => {
  const g = { ...newDraft("new:1", "expense", "2026-10-19", CATS), category_id: "j" };
  assert.equal(withType(g, "income", CATS).category_id, "r");
  assert.equal(withType(g, "expense", CATS).category_id, "j");
});

test("validation marks each bad cell", () => {
  const d = { ...newDraft("new:1", "expense", "", CATS), category_id: "r", amount: "0" };
  assert.deepEqual(Object.keys(validateDraft(d, CATS)).sort(), ["amount", "category_id", "description", "occurred_on"]);
  const ok = { ...newDraft("new:1", "expense", "2026-10-19", CATS), description: " Fundas ", amount: "4.500,50" };
  assert.deepEqual(validateDraft(ok, CATS), {});
  assert.deepEqual(draftToPayload(ok), {
    occurred_on: "2026-10-19", type: "expense", description: "Fundas", category_id: "i", event_id: null,
    payment_method: "transfer", amount: 4500.5, status: "confirmed", receipt_path: null, notes: null,
  });
});
