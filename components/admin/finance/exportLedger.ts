import { PAY_METHOD_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/finance/format";
import type { LedgerRow } from "@/lib/finance/ledger";

/** Downloads the given rows as an .xlsx file. Amounts are real numbers,
 * negative for expenses, so the sheet can be summed; dates are real dates.
 * xlsx is loaded on demand, same as the games export. */
export async function exportLedger(rows: LedgerRow[], fileName: string) {
  const XLSX = await import("xlsx");
  const data = rows.map((r) => ({
    Fecha: new Date(`${r.occurred_on}T12:00:00`),
    Tipo: TYPE_LABELS[r.type],
    Concepto: r.description,
    Categoría: r.category_name,
    Evento: r.event_title ?? "General",
    Medio: PAY_METHOD_LABELS[r.payment_method],
    Responsable: r.responsible_name ?? "",
    Monto: r.type === "income" ? r.amount : -r.amount,
    Estado: STATUS_LABELS[r.status],
    Origen: r.source === "booking" ? "Reservas" : "Manual",
    Nota: r.notes ?? "",
  }));
  const sheet = XLSX.utils.json_to_sheet(data, { dateNF: "dd/mm/yyyy", cellDates: true });
  sheet["!cols"] = [{ wch: 11 }, { wch: 9 }, { wch: 44 }, { wch: 18 }, { wch: 22 }, { wch: 15 }, { wch: 20 }, { wch: 13 }, { wch: 12 }, { wch: 10 }, { wch: 30 }];
  // Money format on the Monto column (H), every data row.
  for (let i = 0; i < data.length; i++) {
    const ref = XLSX.utils.encode_cell({ r: i + 1, c: 7 });
    if (sheet[ref]) sheet[ref].z = '"$" #,##0.##;-"$" #,##0.##';
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Movimientos");
  XLSX.writeFile(workbook, fileName);
}
