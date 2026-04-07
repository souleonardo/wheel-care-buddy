import { useState, useEffect, useCallback } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Receipt, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertTriangle, Info, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface InvoiceItem {
  id: string;
  supply_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  is_billable: boolean;
}

interface LaborCharge {
  description: string;
  amount: number;
}

interface Invoice {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  vehicle_model: string;
  renter_name: string;
  revision_id: string;
  revision_type: string;
  total_amount: number;
  status: string;
  due_date: string;
  created_at: string;
  items: InvoiceItem[];
  laborCharges: LaborCharge[];
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; colorClass: string }> = {
  pending: { label: "Pendente", icon: Clock, colorClass: "text-warning bg-warning/10" },
  paid: { label: "Pago", icon: CheckCircle2, colorClass: "text-success bg-success/10" },
  overdue: { label: "Atrasado", icon: AlertTriangle, colorClass: "text-destructive bg-destructive/10" },
  informational: { label: "Informativo", icon: Info, colorClass: "text-muted-foreground bg-muted/50" },
};

export default function Invoices() {
  const { role } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("invoices")
      .select("id, vehicle_id, renter_id, revision_id, total_amount, status, due_date, created_at, revision:revisions(type), vehicle:vehicles(plate, model)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      setLoading(false);
      return;
    }

    const invoiceRows = (data ?? []) as any[];

    // Fetch items for all invoices
    const invoiceIds = invoiceRows.map((i) => i.id);
    let itemsMap: Record<string, InvoiceItem[]> = {};
    if (invoiceIds.length > 0) {
      const { data: items } = await supabase
        .from("invoice_items")
        .select("id, invoice_id, supply_name, quantity, unit, unit_cost, is_billable")
        .in("invoice_id", invoiceIds);
      (items as any[] ?? []).forEach((item) => {
        if (!itemsMap[item.invoice_id]) itemsMap[item.invoice_id] = [];
        itemsMap[item.invoice_id].push(item);
      });
    }

    // Fetch renter names
    const renterIds = [...new Set(invoiceRows.map((i) => i.renter_id))];
    let renterMap: Record<string, string> = {};
    if (renterIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", renterIds);
      renterMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
    }

    // Fetch labor charges for all revisions
    const revisionIds = [...new Set(invoiceRows.map((i) => i.revision_id).filter(Boolean))];
    let laborMap: Record<string, LaborCharge[]> = {};
    if (revisionIds.length > 0) {
      const { data: charges } = await supabase
        .from("labor_charges")
        .select("revision_id, description, amount")
        .in("revision_id", revisionIds);
      (charges as any[] ?? []).forEach((c) => {
        if (!laborMap[c.revision_id]) laborMap[c.revision_id] = [];
        laborMap[c.revision_id].push({ description: c.description, amount: Number(c.amount) });
      });
    }

    const mapped: Invoice[] = invoiceRows.map((inv) => ({
      id: inv.id,
      vehicle_id: inv.vehicle_id,
      vehicle_plate: inv.vehicle?.plate ?? "",
      vehicle_model: inv.vehicle?.model ?? "",
      renter_name: renterMap[inv.renter_id] ?? "—",
      revision_id: inv.revision_id,
      revision_type: inv.revision?.type ?? "",
      total_amount: Number(inv.total_amount),
      status: inv.status,
      due_date: inv.due_date,
      created_at: inv.created_at,
      items: itemsMap[inv.id] ?? [],
      laborCharges: laborMap[inv.revision_id] ?? [],
    }));

    setInvoices(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const formatDate = (d: string) => {
    try { return new Date(d + (d.includes("T") ? "" : "T00:00:00")).toLocaleDateString("pt-BR"); }
    catch { return d; }
  };

  const handleDownloadPDF = (inv: Invoice) => {
    try {
      generateInvoicePDF({
        invoiceId: inv.id,
        vehicleModel: inv.vehicle_model,
        vehiclePlate: inv.vehicle_plate,
        renterName: inv.renter_name,
        revisionType: inv.revision_type,
        totalAmount: inv.total_amount,
        status: inv.status,
        dueDate: inv.due_date,
        createdAt: inv.created_at,
        items: inv.items,
        laborCharges: inv.laborCharges,
      });
      toast.success("PDF gerado com sucesso");
    } catch (err) {
      toast.error("Erro ao gerar PDF");
      console.error(err);
    }
  };

  return (
    <MobileLayout title="Faturas">
      <div className="p-4 space-y-4">
        {/* Summary cards */}
        <div className="flex gap-2">
          {[
            { key: "pending", label: "Pendentes" },
            { key: "paid", label: "Pagas" },
            { key: "overdue", label: "Atrasadas" },
          ].map(({ key, label }) => {
            const count = invoices.filter((i) => i.status === key).length;
            const conf = statusConfig[key];
            return (
              <div key={key} className={cn("flex-1 rounded-lg px-3 py-2 text-center", conf.colorClass)}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[10px] font-medium">{label}</p>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando faturas...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const conf = statusConfig[inv.status] ?? statusConfig.pending;
              const isExpanded = expandedId === inv.id;
              const billableTotal = inv.items
                .filter((i) => i.is_billable)
                .reduce((s, i) => s + i.quantity * i.unit_cost, 0);
              const laborTotal = inv.laborCharges.reduce((s, l) => s + l.amount, 0);

              return (
                <div key={inv.id} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {inv.vehicle_model} — {inv.revision_type}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {inv.vehicle_plate} · {inv.renter_name} · {formatDate(inv.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1", conf.colorClass)}>
                          <conf.icon className="h-3 w-3" />
                          {conf.label}
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {inv.total_amount > 0 && (
                        <span className="font-semibold text-foreground">
                          R$ {inv.total_amount.toFixed(2)}
                        </span>
                      )}
                      {inv.status !== "informational" && (
                        <span>Venc.: {formatDate(inv.due_date)}</span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/30 px-4 py-3 space-y-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Itens da manutenção</p>
                      <div className="space-y-1.5">
                        {inv.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground">{item.supply_name}</span>
                              <span className="text-muted-foreground">
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.is_billable ? (
                                <span className="font-medium text-foreground">
                                  R$ {(item.quantity * item.unit_cost).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">incluso</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {inv.laborCharges.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mão de obra</p>
                          {inv.laborCharges.map((lc, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-foreground">{lc.description}</span>
                              <span className="font-medium text-foreground">R$ {lc.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(billableTotal > 0 || laborTotal > 0) && (
                        <div className="flex justify-between pt-2 border-t border-border/20 text-xs font-semibold">
                          <span>Total cobrável</span>
                          <span>R$ {(billableTotal + laborTotal).toFixed(2)}</span>
                        </div>
                      )}

                      {/* PDF download button */}
                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        className="w-full flex items-center justify-center gap-2 mt-2 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                      >
                        <FileDown className="h-4 w-4" />
                        Baixar Fatura em PDF
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
