import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const CURRENCY_FMT = '#,##0.00';

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  row.height = 24;
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach((col) => {
    let max = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length + 2;
      if (len > max) max = Math.min(len, 40);
    });
    col.width = max;
  });
}

// ---- Financial Report ----
export async function generateFinancialReport(data: {
  payments: Array<{
    vehicle_plate: string;
    renter_name: string;
    amount: number;
    due_date: string;
    paid_date: string | null;
    status: string;
    payment_type: string;
  }>;
  dateRange: { from: string; to: string };
}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Financeiro");

  ws.addRow(["Veículo", "Locatário", "Tipo", "Valor (R$)", "Vencimento", "Pagamento", "Status"]);
  styleHeader(ws);

  const statusMap: Record<string, string> = { paid: "Pago", pending: "Pendente", overdue: "Atrasado" };
  const typeMap: Record<string, string> = { rental: "Locação", maintenance: "Manutenção" };

  let totalPaid = 0, totalPending = 0;
  data.payments.forEach((p) => {
    ws.addRow([
      p.vehicle_plate,
      p.renter_name,
      typeMap[p.payment_type] ?? p.payment_type,
      p.amount,
      p.due_date,
      p.paid_date ?? "—",
      statusMap[p.status] ?? p.status,
    ]);
    if (p.status === "paid") totalPaid += p.amount;
    else totalPending += p.amount;
  });

  // Summary
  const summaryRow = data.payments.length + 3;
  ws.getCell(`A${summaryRow}`).value = "Total Recebido:";
  ws.getCell(`A${summaryRow}`).font = { bold: true };
  ws.getCell(`B${summaryRow}`).value = totalPaid;
  ws.getCell(`B${summaryRow}`).numFmt = CURRENCY_FMT;
  ws.getCell(`A${summaryRow + 1}`).value = "Total Pendente:";
  ws.getCell(`A${summaryRow + 1}`).font = { bold: true };
  ws.getCell(`B${summaryRow + 1}`).value = totalPending;
  ws.getCell(`B${summaryRow + 1}`).numFmt = CURRENCY_FMT;

  ws.getColumn(4).numFmt = CURRENCY_FMT;
  autoWidth(ws);

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `relatorio_financeiro_${data.dateRange.from}_${data.dateRange.to}.xlsx`);
}

// ---- Maintenance Report ----
export async function generateMaintenanceReport(data: {
  revisions: Array<{
    vehicle_plate: string;
    vehicle_model: string;
    type: string;
    scheduled_date: string;
    status: string;
    mechanic_notes: string | null;
    parts: Array<{ name: string; quantity: number; unit: string; unit_cost: number }>;
  }>;
  laborCharges: Array<{
    vehicle_plate: string;
    revision_type: string;
    mechanic_name: string;
    amount: number;
    description: string;
    status: string;
    scheduled_date: string;
  }>;
  dateRange: { from: string; to: string };
}) {
  const wb = new ExcelJS.Workbook();

  // Revisions sheet
  const ws1 = wb.addWorksheet("Revisões");
  ws1.addRow(["Veículo", "Modelo", "Tipo", "Data", "Status", "Observações"]);
  styleHeader(ws1);
  const statusMap: Record<string, string> = { scheduled: "Agendada", in_progress: "Em andamento", completed: "Concluída", pending_approval: "Pendente" };
  data.revisions.forEach((r) => {
    ws1.addRow([r.vehicle_plate, r.vehicle_model, r.type, r.scheduled_date, statusMap[r.status] ?? r.status, r.mechanic_notes ?? "—"]);
  });
  autoWidth(ws1);

  // Parts sheet
  const ws2 = wb.addWorksheet("Peças Utilizadas");
  ws2.addRow(["Veículo", "Revisão", "Peça", "Quantidade", "Unidade", "Custo Unit. (R$)", "Custo Total (R$)"]);
  styleHeader(ws2);
  data.revisions.forEach((r) => {
    r.parts.forEach((p) => {
      ws2.addRow([r.vehicle_plate, r.type, p.name, p.quantity, p.unit, p.unit_cost, p.quantity * p.unit_cost]);
    });
  });
  ws2.getColumn(6).numFmt = CURRENCY_FMT;
  ws2.getColumn(7).numFmt = CURRENCY_FMT;
  autoWidth(ws2);

  // Labor charges sheet
  const ws3 = wb.addWorksheet("Mão de Obra");
  ws3.addRow(["Veículo", "Tipo Revisão", "Data", "Mecânico", "Descrição", "Valor (R$)", "Status"]);
  styleHeader(ws3);
  const laborStatusMap: Record<string, string> = { pending: "Pendente", paid: "Pago" };
  let totalLaborPending = 0;
  let totalLaborPaid = 0;
  data.laborCharges.forEach((l) => {
    ws3.addRow([l.vehicle_plate, l.revision_type, l.scheduled_date, l.mechanic_name, l.description, l.amount, laborStatusMap[l.status] ?? l.status]);
    if (l.status === "pending") totalLaborPending += l.amount;
    else totalLaborPaid += l.amount;
  });
  ws3.getColumn(6).numFmt = CURRENCY_FMT;
  const laborSummaryRow = data.laborCharges.length + 3;
  ws3.getCell(`A${laborSummaryRow}`).value = "Total Pendente:";
  ws3.getCell(`A${laborSummaryRow}`).font = { bold: true };
  ws3.getCell(`B${laborSummaryRow}`).value = totalLaborPending;
  ws3.getCell(`B${laborSummaryRow}`).numFmt = CURRENCY_FMT;
  ws3.getCell(`A${laborSummaryRow + 1}`).value = "Total Pago:";
  ws3.getCell(`A${laborSummaryRow + 1}`).font = { bold: true };
  ws3.getCell(`B${laborSummaryRow + 1}`).value = totalLaborPaid;
  ws3.getCell(`B${laborSummaryRow + 1}`).numFmt = CURRENCY_FMT;
  autoWidth(ws3);

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `relatorio_manutencoes_${data.dateRange.from}_${data.dateRange.to}.xlsx`);
}

// ---- Fleet Report ----
export async function generateFleetReport(data: {
  vehicles: Array<{
    plate: string;
    model: string;
    year: number;
    status: string;
    weekly_rate: number;
    current_mileage: number | null;
    renter_name: string | null;
    chassis: string | null;
    renavam: string | null;
    entry_date: string | null;
    pending_debts: number;
    total_debt_amount: number;
  }>;
}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Frota");

  ws.addRow(["Placa", "Modelo", "Ano", "Chassi", "RENAVAM", "Entrada", "Status", "Valor Semanal (R$)", "Km Atual", "Locatário", "Débitos Pend.", "Total Débitos (R$)"]);
  styleHeader(ws);
  const statusMap: Record<string, string> = { available: "Disponível", rented: "Alugado", maintenance: "Manutenção" };
  data.vehicles.forEach((v) => {
    ws.addRow([
      v.plate, v.model, v.year,
      v.chassis ?? "—", v.renavam ?? "—", v.entry_date ?? "—",
      statusMap[v.status] ?? v.status, v.weekly_rate, v.current_mileage ?? "—",
      v.renter_name ?? "—", v.pending_debts, v.total_debt_amount,
    ]);
  });
  ws.getColumn(8).numFmt = CURRENCY_FMT;
  ws.getColumn(12).numFmt = CURRENCY_FMT;
  autoWidth(ws);

  const buf = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().split("T")[0];
  saveAs(new Blob([buf]), `relatorio_frota_${today}.xlsx`);
}

// ---- Inventory Report ----
export async function generateInventoryReport(data: {
  supplies: Array<{
    name: string;
    quantity: number;
    min_quantity: number;
    unit: string;
    unit_cost: number;
  }>;
  usage: Array<{
    supply_name: string;
    total_used: number;
    unit: string;
  }>;
}) {
  const wb = new ExcelJS.Workbook();

  const ws1 = wb.addWorksheet("Estoque Atual");
  ws1.addRow(["Item", "Quantidade", "Mín.", "Unidade", "Custo Unit. (R$)", "Valor Total (R$)", "Status"]);
  styleHeader(ws1);
  data.supplies.forEach((s) => {
    const status = s.quantity <= s.min_quantity ? "⚠ Abaixo do mínimo" : "OK";
    ws1.addRow([s.name, s.quantity, s.min_quantity, s.unit, s.unit_cost, s.quantity * s.unit_cost, status]);
  });
  ws1.getColumn(5).numFmt = CURRENCY_FMT;
  ws1.getColumn(6).numFmt = CURRENCY_FMT;
  autoWidth(ws1);

  const ws2 = wb.addWorksheet("Consumo");
  ws2.addRow(["Item", "Total Utilizado", "Unidade"]);
  styleHeader(ws2);
  data.usage.forEach((u) => {
    ws2.addRow([u.supply_name, u.total_used, u.unit]);
  });
  autoWidth(ws2);

  const buf = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().split("T")[0];
  saveAs(new Blob([buf]), `relatorio_estoque_${today}.xlsx`);
}
