import { jsPDF } from "jspdf";

interface UsedSupply {
  name: string;
  unit: string;
  quantity: number;
}

interface RevisionReportData {
  vehicleModel: string;
  vehiclePlate: string;
  vehicleChassis?: string | null;
  vehicleRenavam?: string | null;
  type: string;
  scheduledDate: string;
  notes?: string;
  supplies: UsedSupply[];
}

export function generateRevisionPDF(data: RevisionReportData) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Revisão", margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, margin, y);

  // Vehicle info section
  y = 55;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Dados do Veículo", margin, y);
  y += 2;
  doc.setDrawColor(59, 130, 246); // blue
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 50, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const addField = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(value, margin + 45, y);
    y += 7;
  };

  addField("Modelo:", data.vehicleModel);
  addField("Placa:", data.vehiclePlate);
  if (data.vehicleChassis) addField("Chassi:", data.vehicleChassis);
  if (data.vehicleRenavam) addField("RENAVAM:", data.vehicleRenavam);
  addField("Tipo de Serviço:", data.type);
  addField("Data Agendada:", new Date(data.scheduledDate).toLocaleDateString("pt-BR"));

  if (data.notes) {
    addField("Observações:", data.notes);
  }

  // Supplies section
  y += 5;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Peças e Materiais Utilizados", margin, y);
  y += 2;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 70, y);
  y += 8;

  if (data.supplies.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text("Nenhuma peça registrada para esta revisão.", margin, y);
    y += 10;
  } else {
    // Table header
    const colWidths = [90, 40, 40];
    const tableX = margin;

    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(tableX, y - 4, colWidths[0] + colWidths[1] + colWidths[2], 8, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Item", tableX + 3, y);
    doc.text("Quantidade", tableX + colWidths[0] + 3, y);
    doc.text("Unidade", tableX + colWidths[0] + colWidths[1] + 3, y);
    y += 7;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    data.supplies.forEach((supply, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(tableX, y - 4, colWidths[0] + colWidths[1] + colWidths[2], 7, "F");
      }
      doc.setFontSize(9);
      doc.text(supply.name, tableX + 3, y);
      doc.text(String(supply.quantity), tableX + colWidths[0] + 3, y);
      doc.text(supply.unit, tableX + colWidths[0] + colWidths[1] + 3, y);
      y += 7;
    });

    // Table border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    const tableHeight = 8 + data.supplies.length * 7;
    doc.rect(tableX, y - tableHeight - 4, colWidths[0] + colWidths[1] + colWidths[2], tableHeight, "S");
  }

  // Footer
  y += 15;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Signature lines
  const sigY = y + 20;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(margin, sigY, margin + 65, sigY);
  doc.line(pageWidth - margin - 65, sigY, pageWidth - margin, sigY);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Mecânico Responsável", margin + 10, sigY + 5);
  doc.text("Administrador", pageWidth - margin - 50, sigY + 5);

  // Save
  const filename = `revisao_${data.vehiclePlate.replace(/[^a-zA-Z0-9]/g, "")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
