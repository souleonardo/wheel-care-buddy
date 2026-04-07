import { useState, useEffect, useCallback } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Receipt, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceItem {
  id: string;
  supply_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  is_billable: boolean;
}

interface Invoice {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  vehicle_model: string;
  revision_type: string;
  total_amount: number;
  status: string;
  due_date: string;
  created_at: string;
  items: InvoiceItem[];
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
      .select("id, vehicle_id, total_amount, status, due_date, created_at, revision_id, revision:revisions(type), vehicle:vehicles(plate, model)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      setLoading(false);
      return;
    }

    // Fetch items for all invoices
    const invoiceIds = (data ?? []).map((i: any) => i.id);
    let itemsMap: Record<string, InvoiceItem[]> = {};

    if (invoiceIds.length > 0) {
      const { data: items } = await supabase
        .from("invoice_items")
        .select("id, invoice_id, supply_name, quantity, unit, unit_cost, is_billable")
        .in("invoice_id", invoiceIds);

      (items as any[] ?? []).forEach((item: any) => {
        if (!itemsMap[item.invoice_id]) itemsMap[item.invoice_id] = [];
        itemsMap[item.invoice_id].push(item);
      });
    }

    const mapped: Invoice[] = (data as any[]).map((inv) => ({
      id: inv.id,
      vehicle_id: inv.vehicle_id,
      vehicle_plate: inv.vehicle?.plate ?? "",
      vehicle_model: inv.vehicle?.model ?? "",
      revision_type: inv.revision?.type ?? "",
      total_amount: Number(inv.total_amount),
      status: inv.status,
      due_date: inv.due_date,
      created_at: inv.created_at,
      items: itemsMap[inv.id] ?? [],
    }));

    setInvoices(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const formatDate = (d: string) => {
    try { return new Date(d + (d.includes("T") ? "" : "T00:00:00")).toLocaleDateString("pt-BR"); }
    catch { return d; }
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
                          {inv.vehicle_plate} · {formatDate(inv.created_at)}
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
                    <div className="border-t border-border/30 px-4 py-3 space-y-2">
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
                      {billableTotal > 0 && (
                        <div className="flex justify-between pt-2 border-t border-border/20 text-xs font-semibold">
                          <span>Total cobrável</span>
                          <span>R$ {billableTotal.toFixed(2)}</span>
                        </div>
                      )}
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
