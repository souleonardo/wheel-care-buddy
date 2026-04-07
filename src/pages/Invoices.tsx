import { useState, useEffect, useCallback } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Receipt, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertTriangle, Info, FileDown, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { addDays, addWeeks, addMonths, isBefore, isAfter, format } from "date-fns";

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

interface UnifiedInvoice {
  id: string;
  type: "maintenance" | "rental";
  vehicle_id: string;
  vehicle_plate: string;
  vehicle_model: string;
  renter_name: string;
  revision_id?: string;
  revision_type?: string;
  payment_id?: string;
  total_amount: number;
  status: string;
  due_date: string;
  created_at: string;
  frequency_label?: string;
  items: InvoiceItem[];
  laborCharges: LaborCharge[];
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; colorClass: string }> = {
  pending: { label: "Pendente", icon: Clock, colorClass: "text-warning bg-warning/10" },
  paid: { label: "Pago", icon: CheckCircle2, colorClass: "text-success bg-success/10" },
  overdue: { label: "Atrasado", icon: AlertTriangle, colorClass: "text-destructive bg-destructive/10" },
  informational: { label: "Informativo", icon: Info, colorClass: "text-muted-foreground bg-muted/50" },
};

const frequencyLabels: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

function getNextDates(startDate: string, frequency: string, upToDate: Date): string[] {
  const dates: string[] = [];
  let current = new Date(startDate + "T00:00:00");
  const addFn = frequency === "monthly" ? (d: Date) => addMonths(d, 1)
    : frequency === "biweekly" ? (d: Date) => addDays(d, 14)
    : (d: Date) => addWeeks(d, 1);

  while (!isAfter(current, upToDate)) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = addFn(current);
  }
  return dates;
}

export default function Invoices() {
  const { role } = useAuth();
  const [allInvoices, setAllInvoices] = useState<UnifiedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmPayId, setConfirmPayId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "rental" | "maintenance">("all");
  const isAdmin = role === "admin";

  const fetchAll = useCallback(async () => {
    setLoading(true);

    // 1. Fetch maintenance invoices
    const { data: invData } = await supabase
      .from("invoices")
      .select("id, vehicle_id, renter_id, revision_id, total_amount, status, due_date, created_at, revision:revisions(type), vehicle:vehicles(plate, model)")
      .order("created_at", { ascending: false });

    const invoiceRows = (invData ?? []) as any[];

    // Fetch items
    const invoiceIds = invoiceRows.map((i) => i.id);
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

    // Fetch renter names (collect all renter IDs first)
    const allRenterIds = new Set<string>();
    invoiceRows.forEach((i) => allRenterIds.add(i.renter_id));

    // Fetch labor charges
    const revisionIds = [...new Set(invoiceRows.map((i) => i.revision_id).filter(Boolean))];
    let laborMap: Record<string, LaborCharge[]> = {};
    if (revisionIds.length > 0) {
      const { data: charges } = await supabase
        .from("labor_charges")
        .select("revision_id, description, amount")
        .in("revision_id", revisionIds);
      (charges as any[] ?? []).forEach((c: any) => {
        if (!laborMap[c.revision_id]) laborMap[c.revision_id] = [];
        laborMap[c.revision_id].push({ description: c.description, amount: Number(c.amount) });
      });
    }

    // 2. Auto-generate rental payments
    const { data: assignments } = await supabase
      .from("vehicle_assignments")
      .select("id, vehicle_id, renter_id, payment_frequency, payment_start_date, vehicle:vehicles(plate, model, weekly_rate)")
      .eq("is_active", true);

    const activeAssignments = (assignments ?? []) as any[];
    activeAssignments.forEach((a) => allRenterIds.add(a.renter_id));

    // Fetch all renter names at once
    const renterIdArr = [...allRenterIds];
    let renterMap: Record<string, string> = {};
    if (renterIdArr.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", renterIdArr);
      renterMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
    }

    // For each active assignment, generate payment dates up to today + 2 days
    const today = new Date();
    const visibilityDate = addDays(today, 2);

    // Fetch existing rental payments to avoid duplicates
    const { data: existingPayments } = await supabase
      .from("payments")
      .select("id, vehicle_id, renter_id, amount, due_date, status, paid_date, payment_type")
      .eq("payment_type", "rental")
      .order("due_date", { ascending: false });

    const existingPaymentKeys = new Set(
      (existingPayments ?? []).map((p: any) => `${p.vehicle_id}_${p.due_date}`)
    );

    // Create missing rental payments
    const paymentsToInsert: any[] = [];
    for (const assignment of activeAssignments) {
      if (!assignment.payment_start_date) continue;
      const vehicle = Array.isArray(assignment.vehicle) ? assignment.vehicle[0] : assignment.vehicle;
      if (!vehicle) continue;

      const freq = assignment.payment_frequency || "weekly";
      const rate = Number(vehicle.weekly_rate);
      const amount = freq === "monthly" ? rate * 4 : freq === "biweekly" ? rate * 2 : rate;

      const dueDates = getNextDates(assignment.payment_start_date, freq, visibilityDate);
      for (const dueDate of dueDates) {
        const key = `${assignment.vehicle_id}_${dueDate}`;
        if (!existingPaymentKeys.has(key)) {
          paymentsToInsert.push({
            vehicle_id: assignment.vehicle_id,
            renter_id: assignment.renter_id,
            amount,
            due_date: dueDate,
            status: isBefore(new Date(dueDate + "T23:59:59"), today) ? "overdue" : "pending",
            payment_type: "rental",
          });
          existingPaymentKeys.add(key);
        }
      }
    }

    if (paymentsToInsert.length > 0) {
      await supabase.from("payments").insert(paymentsToInsert);
    }

    // Re-fetch all rental payments (including newly created)
    const { data: rentalPayments } = await supabase
      .from("payments")
      .select("id, vehicle_id, renter_id, amount, due_date, status, paid_date, payment_type, vehicle:vehicles(plate, model)")
      .eq("payment_type", "rental")
      .order("due_date", { ascending: false });

    // 3. Build unified invoice list
    const maintenanceInvoices: UnifiedInvoice[] = invoiceRows.map((inv) => ({
      id: inv.id,
      type: "maintenance" as const,
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

    // Build assignment frequency map
    const assignmentFreqMap: Record<string, string> = {};
    activeAssignments.forEach((a) => {
      assignmentFreqMap[`${a.vehicle_id}_${a.renter_id}`] = a.payment_frequency || "weekly";
    });

    // Filter rental payments: only show those visible (due_date <= today + 2 days)
    const rentalInvoices: UnifiedInvoice[] = ((rentalPayments ?? []) as any[])
      .filter((p) => {
        const due = new Date(p.due_date + "T00:00:00");
        return !isAfter(due, visibilityDate) || p.status === "paid";
      })
      .map((p) => {
        const vehicle = Array.isArray(p.vehicle) ? p.vehicle[0] : p.vehicle;
        const freq = assignmentFreqMap[`${p.vehicle_id}_${p.renter_id}`] || "weekly";
        return {
          id: p.id,
          type: "rental" as const,
          vehicle_id: p.vehicle_id,
          vehicle_plate: vehicle?.plate ?? "",
          vehicle_model: vehicle?.model ?? "",
          renter_name: renterMap[p.renter_id] ?? "—",
          payment_id: p.id,
          total_amount: Number(p.amount),
          status: p.status === "paid" ? "paid" : (isBefore(new Date(p.due_date + "T23:59:59"), today) ? "overdue" : "pending"),
          due_date: p.due_date,
          created_at: p.due_date,
          frequency_label: frequencyLabels[freq] || freq,
          items: [],
          laborCharges: [],
        };
      });

    // Also update overdue statuses in DB
    const overdueIds = rentalInvoices
      .filter((r) => r.status === "overdue")
      .map((r) => r.id);
    if (overdueIds.length > 0) {
      await supabase.from("payments").update({ status: "overdue" }).in("id", overdueIds).eq("payment_type", "rental").neq("status", "paid");
    }

    // Merge and sort by due_date desc
    const merged = [...maintenanceInvoices, ...rentalInvoices].sort(
      (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    );

    setAllInvoices(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredInvoices = filter === "all" ? allInvoices : allInvoices.filter((i) => i.type === filter);

  const formatDate = (d: string) => {
    try { return new Date(d + (d.includes("T") ? "" : "T00:00:00")).toLocaleDateString("pt-BR"); }
    catch { return d; }
  };

  const handleDownloadPDF = (inv: UnifiedInvoice) => {
    try {
      generateInvoicePDF({
        invoiceId: inv.id,
        vehicleModel: inv.vehicle_model,
        vehiclePlate: inv.vehicle_plate,
        renterName: inv.renter_name,
        revisionType: inv.type === "rental" ? `Aluguel ${inv.frequency_label ?? ""}` : (inv.revision_type ?? ""),
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

  const handleMarkPaid = async () => {
    if (!confirmPayId) return;
    const inv = allInvoices.find((i) => i.id === confirmPayId);
    if (!inv) return;
    const today = new Date().toISOString().split("T")[0];

    if (inv.type === "maintenance") {
      const { error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", inv.id);
      if (error) { toast.error("Erro: " + error.message); setConfirmPayId(null); return; }
      await supabase.from("payments").update({ status: "paid", paid_date: today }).eq("revision_id", inv.revision_id!).eq("payment_type", "maintenance");
    } else {
      const { error } = await supabase.from("payments").update({ status: "paid", paid_date: today }).eq("id", inv.id);
      if (error) { toast.error("Erro: " + error.message); setConfirmPayId(null); return; }
    }

    toast.success("Fatura marcada como paga");
    setConfirmPayId(null);
    fetchAll();
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
            const count = filteredInvoices.filter((i) => i.status === key).length;
            const conf = statusConfig[key];
            return (
              <div key={key} className={cn("flex-1 rounded-lg px-3 py-2 text-center", conf.colorClass)}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[10px] font-medium">{label}</p>
              </div>
            );
          })}
        </div>

        {/* Type filter */}
        <div className="flex gap-2">
          {([
            { key: "all", label: "Todas" },
            { key: "rental", label: "Aluguel" },
            { key: "maintenance", label: "Manutenção" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando faturas...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((inv) => {
              const conf = statusConfig[inv.status] ?? statusConfig.pending;
              const isExpanded = expandedId === inv.id;
              const billableTotal = inv.items
                .filter((i) => i.is_billable)
                .reduce((s, i) => s + i.quantity * i.unit_cost, 0);
              const laborTotal = inv.laborCharges.reduce((s, l) => s + l.amount, 0);
              const isRental = inv.type === "rental";

              return (
                <div key={inv.id} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {isRental && <Car className="h-3.5 w-3.5 text-primary shrink-0" />}
                          <h3 className="text-sm font-semibold text-foreground">
                            {isRental
                              ? `Aluguel ${inv.frequency_label ?? ""}`
                              : `${inv.vehicle_model} — ${inv.revision_type}`}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isRental
                            ? `${inv.vehicle_model} · ${inv.vehicle_plate} · ${inv.renter_name}`
                            : `${inv.vehicle_plate} · ${inv.renter_name} · ${formatDate(inv.created_at)}`}
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
                      <span className="font-semibold text-foreground">
                        R$ {inv.total_amount.toFixed(2)}
                      </span>
                      {inv.status !== "informational" && (
                        <span>Venc.: {formatDate(inv.due_date)}</span>
                      )}
                      {isRental && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          Aluguel
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/30 px-4 py-3 space-y-3">
                      {isRental ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detalhes do aluguel</p>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Veículo</span>
                              <span className="text-foreground font-medium">{inv.vehicle_model} ({inv.vehicle_plate})</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Locatário</span>
                              <span className="text-foreground font-medium">{inv.renter_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Periodicidade</span>
                              <span className="text-foreground font-medium">{inv.frequency_label}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Vencimento</span>
                              <span className="text-foreground font-medium">{formatDate(inv.due_date)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border/20 text-xs font-semibold">
                            <span>Valor</span>
                            <span>R$ {inv.total_amount.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Itens da manutenção</p>
                          <div className="space-y-1.5">
                            {inv.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-foreground">{item.supply_name}</span>
                                  <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                                </div>
                                <div>
                                  {item.is_billable ? (
                                    <span className="font-medium text-foreground">R$ {(item.quantity * item.unit_cost).toFixed(2)}</span>
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
                        </>
                      )}

                      {/* PDF download */}
                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        className="w-full flex items-center justify-center gap-2 mt-2 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                      >
                        <FileDown className="h-4 w-4" />
                        Baixar Fatura em PDF
                      </button>

                      {/* Admin: mark as paid */}
                      {isAdmin && inv.status !== "paid" && inv.status !== "informational" && (
                        <button
                          onClick={() => setConfirmPayId(inv.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors text-xs font-medium"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Marcar como Paga
                        </button>
                      )}

                      {inv.status === "paid" && (
                        <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-success/10 text-success text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Fatura paga
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

      {/* Confirm payment dialog */}
      <AlertDialog open={!!confirmPayId} onOpenChange={(open) => !open && setConfirmPayId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja marcar esta fatura como paga? O status será atualizado para o administrador e para o locatário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkPaid}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
}
