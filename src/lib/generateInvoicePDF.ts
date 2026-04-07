import { jsPDF } from "jspdf";

interface InvoiceItemData {
  supply_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  is_billable: boolean;
}

interface LaborChargeData {
  description: string;
  amount: number;
}

interface InvoicePDFData {
  invoiceId: string;
  vehicleModel: string;
  vehiclePlate: string;
  renterName: string;
  revisionType: string;
  totalAmount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  items: InvoiceItemData[];
  laborCharges: LaborChargeData[];
}

const CNPJ_PIX = "12.345.678/0001-90";

export function generateInvoicePDF(data: InvoicePDFData) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 44, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FATURA DE SERVIÇO", margin, y);
  y += 9;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nº ${data.invoiceId.slice(0, 8).toUpperCase()}`, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.text(`Emitida em: ${formatDate(data.createdAt)}`, margin, y);

  // Status badge
  const statusLabel = data.status === "paid" ? "PAGO" : data.status === "overdue" ? "ATRASADO" : "PENDENTE";
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const statusW = doc.getTextWidth(statusLabel) + 10;
  if (data.status === "paid") doc.setFillColor(34, 197, 94);
  else if (data.status === "overdue") doc.setFillColor(239, 68, 68);
  else doc.setFillColor(234, 179, 8);
  doc.roundedRect(pageWidth - margin - statusW, 14, statusW, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, pageWidth - margin - statusW + 5, 21);

  // Info section
  y = 58;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Dados da Fatura", margin, y);
  y += 2;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 45, y);
  y += 9;

  const addField = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(value, margin + 48, y);
    y += 7;
  };

  addField("Locatário:", data.renterName);
  addField("Veículo:", `${data.vehicleModel} — ${data.vehiclePlate}`);
  addField("Serviço:", data.revisionType);
  addField("Vencimento:", formatDate(data.dueDate));

  // Items table
  y += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Itens da Manutenção", margin, y);
  y += 2;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 55, y);
  y += 8;

  if (data.items.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text("Nenhum item registrado.", margin, y);
    y += 10;
  } else {
    const colWidths = [70, 25, 25, 30];
    const tableX = margin;

    // Table header
    doc.setFillColor(241, 245, 249);
    doc.rect(tableX, y - 4, colWidths.reduce((a, b) => a + b, 0), 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Item", tableX + 3, y);
    doc.text("Qtd", tableX + colWidths[0] + 3, y);
    doc.text("Unitário", tableX + colWidths[0] + colWidths[1] + 3, y);
    doc.text("Total", tableX + colWidths[0] + colWidths[1] + colWidths[2] + 3, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    data.items.forEach((item, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(tableX, y - 4, colWidths.reduce((a, b) => a + b, 0), 7, "F");
      }
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const itemTotal = item.quantity * item.unit_cost;
      doc.text(item.supply_name, tableX + 3, y);
      doc.text(`${item.quantity} ${item.unit}`, tableX + colWidths[0] + 3, y);

      if (item.is_billable) {
        doc.text(`R$ ${item.unit_cost.toFixed(2)}`, tableX + colWidths[0] + colWidths[1] + 3, y);
        doc.text(`R$ ${itemTotal.toFixed(2)}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 3, y);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "italic");
        doc.text("incluso", tableX + colWidths[0] + colWidths[1] + 3, y);
        doc.text("—", tableX + colWidths[0] + colWidths[1] + colWidths[2] + 3, y);
        doc.setFont("helvetica", "normal");
      }
      y += 7;
    });

    // Table border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    const tableHeight = 8 + data.items.length * 7;
    doc.rect(tableX, y - tableHeight - 4, colWidths.reduce((a, b) => a + b, 0), tableHeight, "S");
  }

  // Labor charges
  if (data.laborCharges.length > 0) {
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Mão de Obra", margin, y);
    y += 7;

    data.laborCharges.forEach((lc) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`${lc.description}:`, margin, y);
      doc.setFont("helvetica", "bold");
      doc.text(`R$ ${lc.amount.toFixed(2)}`, margin + 80, y);
      y += 7;
    });
  }

  // Total
  y += 5;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("TOTAL:", margin, y);
  doc.text(`R$ ${data.totalAmount.toFixed(2)}`, pageWidth - margin - doc.getTextWidth(`R$ ${data.totalAmount.toFixed(2)}`), y);

  // PIX Payment instructions
  y += 18;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 42, 3, 3, "F");
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 42, 3, 3, "S");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text("Instruções de Pagamento — PIX", margin + 8, y + 4);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 64, 175);
  y += 13;
  doc.text("Realize o pagamento via PIX utilizando o CNPJ abaixo:", margin + 8, y);
  y += 9;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`CNPJ: ${CNPJ_PIX}`, margin + 8, y);
  y += 9;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Após o pagamento, envie o comprovante pelo sistema para validação.", margin + 8, y);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.text("FleetControl — Gestão de Frota", margin, footerY);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, pageWidth - margin - 60, footerY);

  // Save
  const filename = `fatura_${data.vehiclePlate.replace(/[^a-zA-Z0-9]/g, "")}_${data.invoiceId.slice(0, 8)}.pdf`;
  doc.save(filename);
}

function formatDate(d: string): string {
  try {
    return new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}
