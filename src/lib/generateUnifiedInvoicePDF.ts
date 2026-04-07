import { jsPDF } from "jspdf";

interface PendingEntry {
  type: "rental" | "maintenance" | "violation";
  description: string;
  vehicleInfo: string;
  dueDate: string;
  amount: number;
  details?: string;
}

interface UnifiedInvoiceData {
  renterName: string;
  entries: PendingEntry[];
}

const CNPJ_PIX = "12.345.678/0001-90";

const typeLabels: Record<string, string> = {
  rental: "Aluguel",
  maintenance: "Manutenção",
  violation: "Infração de Trânsito",
};

function formatDate(d: string): string {
  try {
    return new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

export function generateUnifiedInvoicePDF(data: UnifiedInvoiceData) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 25;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 44, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FATURA UNIFICADA", margin, y);
  y += 9;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Pendências consolidadas`, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.text(`Emitida em: ${new Date().toLocaleDateString("pt-BR")}`, margin, y);

  // Renter info
  y = 58;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Locatário", margin, y);
  y += 2;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 30, y);
  y += 9;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.text(data.renterName, margin, y);
  y += 10;

  // Summary by type
  const grouped: Record<string, PendingEntry[]> = {};
  data.entries.forEach((e) => {
    if (!grouped[e.type]) grouped[e.type] = [];
    grouped[e.type].push(e);
  });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo por Categoria", margin, y);
  y += 2;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 55, y);
  y += 8;

  const summaryData = Object.entries(grouped).map(([type, items]) => ({
    type,
    label: typeLabels[type] || type,
    count: items.length,
    total: items.reduce((s, i) => s + i.amount, 0),
  }));

  // Summary table header
  const colW = [70, 30, 40, 30];
  const tableX = margin;
  doc.setFillColor(241, 245, 249);
  doc.rect(tableX, y - 4, colW.reduce((a, b) => a + b, 0), 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Categoria", tableX + 3, y);
  doc.text("Qtd", tableX + colW[0] + 3, y);
  doc.text("Subtotal", tableX + colW[0] + colW[1] + 3, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  summaryData.forEach((s, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y - 4, colW.reduce((a, b) => a + b, 0), 7, "F");
    }
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(s.label, tableX + 3, y);
    doc.text(String(s.count), tableX + colW[0] + 3, y);
    doc.setFont("helvetica", "bold");
    doc.text(`R$ ${s.total.toFixed(2)}`, tableX + colW[0] + colW[1] + 3, y);
    doc.setFont("helvetica", "normal");
    y += 7;
  });

  // Detailed items
  y += 8;

  for (const [type, items] of Object.entries(grouped)) {
    // Check page break
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 25;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(typeLabels[type] || type, margin, y);
    y += 2;
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 45, y);
    y += 7;

    // Items table header
    const detColW = [55, 40, 35, 35];
    doc.setFillColor(241, 245, 249);
    doc.rect(tableX, y - 4, detColW.reduce((a, b) => a + b, 0), 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Descrição", tableX + 3, y);
    doc.text("Veículo", tableX + detColW[0] + 3, y);
    doc.text("Vencimento", tableX + detColW[0] + detColW[1] + 3, y);
    doc.text("Valor", tableX + detColW[0] + detColW[1] + detColW[2] + 3, y);
    y += 7;

    items.forEach((item, idx) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 25;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(tableX, y - 4, detColW.reduce((a, b) => a + b, 0), 7, "F");
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);

      const descText = item.description.length > 28 ? item.description.substring(0, 26) + "…" : item.description;
      const vehText = item.vehicleInfo.length > 20 ? item.vehicleInfo.substring(0, 18) + "…" : item.vehicleInfo;

      doc.text(descText, tableX + 3, y);
      doc.text(vehText, tableX + detColW[0] + 3, y);
      doc.text(formatDate(item.dueDate), tableX + detColW[0] + detColW[1] + 3, y);
      doc.setFont("helvetica", "bold");
      doc.text(`R$ ${item.amount.toFixed(2)}`, tableX + detColW[0] + detColW[1] + detColW[2] + 3, y);
      y += 7;
    });

    y += 5;
  }

  // Grand total
  const grandTotal = data.entries.reduce((s, e) => s + e.amount, 0);
  y += 3;
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 25;
  }
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("TOTAL GERAL:", margin, y);
  const totalText = `R$ ${grandTotal.toFixed(2)}`;
  doc.text(totalText, pageWidth - margin - doc.getTextWidth(totalText), y);

  // PIX Payment instructions
  y += 18;
  if (y > pageHeight - 60) {
    doc.addPage();
    y = 25;
  }
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
  const footerY = pageHeight - 15;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.text("FleetControl — Gestão de Frota", margin, footerY);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, pageWidth - margin - 60, footerY);

  const filename = `fatura_unificada_${data.renterName.replace(/\s+/g, "_").substring(0, 20)}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
