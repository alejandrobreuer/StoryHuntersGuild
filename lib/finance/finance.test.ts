import type { ShgFinanceCategory } from "@/types/database";
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCompact, formatMoney, formatSignedMoney, formatShortDate, parseAmount } from "./format";
import { draftToPayload, newDraft, validateDraft, withType } from "./draft";
import { eventSubtitle, eventTotals, margin, monthLabel, perAttendee, rangeLabel, topCategory } from "./summary";
import { describeRange, filtersFromParams, filtersToParams, periodRange, todayIso } from "./periods";
import { categoriesOfType, moveCategory, withOrder } from "./categories";
import { chargeDate, monthlyTotal, nextChargeDate } from "./recurring";

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
  assert.equal(g.responsible_id, "");
  assert.equal(newDraft("new:3", "expense", "2026-10-19", CATS, "admin-1").responsible_id, "admin-1");
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
    responsible_id: null,
  });
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

test("KPI sub-lines", () => {
  const k = { income: 280000, expense: 231300, result: 48700, seats: 35, seat_events: 2, receivable: 24000, payable: 0, pending_bookings: 2 };
  assert.equal(margin(k), 17);
  assert.equal(margin({ ...k, income: 0, result: -5 }), null);
  assert.deepEqual(topCategory([{ category_id: "j", name: "Juegos", amount: 136300 }, { category_id: "i", name: "Impresión", amount: 95000 }]),
    { name: "Juegos", share: 59 });
  assert.equal(topCategory([]), null);
});

test("per-event table", () => {
  const ev = { event_id: "e", title: "Encuentro #1", starts_at: "2026-10-11T22:00:00Z", started_at: "x", ended_at: "y", seats: 24, income: 192000, expense: 48300, result: 143700 };
  const general = { event_id: null, title: null, starts_at: null, started_at: null, ended_at: null, seats: 0, income: 0, expense: 149500, result: -149500 };
  assert.equal(perAttendee(ev), 5988);
  assert.equal(perAttendee(general), null);
  assert.equal(eventSubtitle(ev), "Octubre · cerrado");
  assert.equal(eventSubtitle({ ...ev, started_at: null, ended_at: null }), "Octubre · reservas abiertas");
  assert.equal(eventSubtitle(general), "Ludoteca, web y otros sin evento");
  assert.deepEqual(eventTotals([ev, general]), { seats: 24, income: 192000, expense: 197800, result: -5800 });
});

test("labels", () => {
  assert.equal(monthLabel("2026-11-01", "2026-11-19"), "Nov (en curso)");
  assert.equal(monthLabel("2026-10-01", "2026-11-19"), "Oct");
  const months = [{ month: "2026-08-01", income: 0, expense: 1 }, { month: "2026-11-01", income: 1, expense: 0 }];
  assert.equal(rangeLabel({ from: null, to: null }, months), "Agosto – noviembre 2026");
  assert.equal(rangeLabel({ from: "2026-10-01", to: "2026-10-31" }, months), "Octubre 2026");
  assert.equal(rangeLabel({ from: null, to: null }, []), "");
});

test("formatCompact matches the chart labels in the mockup", () => {
  assert.equal(formatCompact(0), "0");
  assert.equal(formatCompact(42000), "42k");
  assert.equal(formatCompact(192000), "192k");
  assert.equal(formatCompact(1200000), "1,2M");
});

// ─── Categorías ──────────────────────────────────────────────────────────────

test("categories: one type, in order", () => {
  const list = categoriesOfType(CATS, "expense").map((c) => c.id);
  assert.deepEqual(list.sort(), ["i", "j", "x"]);
  const ordered = categoriesOfType([
    { ...CATS[3], sort_order: 2 }, { ...CATS[2], sort_order: 1 },
  ], "expense").map((c) => c.id);
  assert.deepEqual(ordered, ["j", "i"]);
});

test("categories: move up/down and renumber", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(moveCategory(list, "b", -1), ["b", "a", "c"]);
  assert.deepEqual(moveCategory(list, "b", 1), ["a", "c", "b"]);
  assert.equal(moveCategory(list, "a", -1), null);
  assert.equal(moveCategory(list, "c", 1), null);
  const renumbered = withOrder(CATS, ["i", "j"]);
  assert.equal(renumbered.find((c) => c.id === "i")?.sort_order, 1);
  assert.equal(renumbered.find((c) => c.id === "j")?.sort_order, 2);
  assert.equal(renumbered.find((c) => c.id === "r")?.sort_order, CATS.find((c) => c.id === "r")?.sort_order);
});

test("recurring: charge date falls back to the month's last day", () => {
  assert.equal(chargeDate(2026, 10, 5), "2026-10-05");
  assert.equal(chargeDate(2026, 9, 31), "2026-09-30");
  assert.equal(chargeDate(2026, 2, 30), "2026-02-28");
  assert.equal(chargeDate(2028, 2, 31), "2028-02-29");
});

test("recurring: next charge", () => {
  const sub = { day_of_month: 10, starts_on: "2026-01-01", ends_on: null, is_active: true };
  assert.equal(nextChargeDate(sub, "2026-10-09"), "2026-10-10");
  assert.equal(nextChargeDate(sub, "2026-10-10"), "2026-11-10");   // today's is already generated
  assert.equal(nextChargeDate(sub, "2026-12-20"), "2027-01-10");
  assert.equal(nextChargeDate({ ...sub, starts_on: "2026-11-15" }, "2026-10-23"), "2026-12-10");
  assert.equal(nextChargeDate({ ...sub, ends_on: "2026-11-09" }, "2026-10-23"), null);
  assert.equal(nextChargeDate({ ...sub, is_active: false }, "2026-10-23"), null);
});

test("recurring: monthly total counts active ones only", () => {
  assert.equal(monthlyTotal([{ amount: 25000, is_active: true }, { amount: 1000.5, is_active: true }, { amount: 9, is_active: false }]), 26000.5);
});
