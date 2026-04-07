import { useState, useEffect, useCallback } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Receipt, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertTriangle, Info, FileDown, Car, Plus, ShieldAlert, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface TrafficViolation {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  vehicle_model: string;
  renter_name: string;
  renter_id: string;
  description: string;
  amount: number;
  violation_date: string;
  due_date: string;
  status: string;
  paid_date: string | null;
  auto_number: string | null;
  source: string;
  document_url: string | null;
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

type TabKey = "invoices" | "violations";

export default function Invoices() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("invoices");
  const [allInvoices, setAllInvoices] = useState<UnifiedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmPayId, setConfirmPayId] = useState<string | null>(null);
  const [confirmPayType, setConfirmPayType] = useState<"invoice" | "violation">("invoice");
  const [filter, setFilter] = useState<"all" | "rental" | "maintenance">("all");
  const isAdmin = role === "admin";

  // Violations state
  const [violations, setViolations] = useState<TrafficViolation[]>([]);
  const [violationsLoading, setViolationsLoading] = useState(true);
  const [addViolationOpen, setAddViolationOpen] = useState(false);
  const [violationForm, setViolationForm] = useState({
    vehicle_id: "",
    renter_id: "",
    description: "",
    amount: 0,
    violation_date: "",
    due_date: "",
    auto_number: "",
  });
  const [vehicleOptions, setVehicleOptions] = useState<{ id: string; plate: string; model: string; renter_id: string; renter_name: string }[]>([]);

  // ---- INVOICES FETCH ----
  const fetchAll = useCallback(async () => {
    setLoading(true);

    const { data: invData } = await supabase
      .from("invoices")
      .select("id, vehicle_id, renter_id, revision_id, total_amount, status, due_date, created_at, revision:revisions(type), vehicle:vehicles(plate, model)")
      .order("created_at", { ascending: false });

    const invoiceRows = (invData ?? []) as any[];

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

    const allRenterIds = new Set<string>();
    invoiceRows.forEach((i) => allRenterIds.add(i.renter_id));

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

    const { data: assignments } = await supabase
      .from("vehicle_assignments")
      .select("id, vehicle_id, renter_id, payment_frequency, payment_start_date, vehicle:vehicles(plate, model, weekly_rate)")
      .eq("is_active", true);

    const activeAssignments = (assignments ?? []) as any[];
    activeAssignments.forEach((a) => allRenterIds.add(a.renter_id));

    const renterIdArr = [...allRenterIds];
    let renterMap: Record<string, string> = {};
    if (renterIdArr.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", renterIdArr);
      renterMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
    }

    const today = new Date();
    const visibilityDate = addDays(today, 2);

    const { data: existingPayments } = await supabase
      .from("payments")
      .select("id, vehicle_id, renter_id, amount, due_date, status, paid_date, payment_type")
      .eq("payment_type", "rental")
      .order("due_date", { ascending: false });

    const existingPaymentKeys = new Set(
      (existingPayments ?? []).map((p: any) => `${p.vehicle_id}_${p.due_date}`)
    );

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

    const { data: rentalPayments } = await supabase
      .from("payments")
      .select("id, vehicle_id, renter_id, amount, due_date, status, paid_date, payment_type, vehicle:vehicles(plate, model)")
      .eq("payment_type", "rental")
      .order("due_date", { ascending: false });

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

    const assignmentFreqMap: Record<string, string> = {};
    activeAssignments.forEach((a) => {
      assignmentFreqMap[`${a.vehicle_id}_${a.renter_id}`] = a.payment_frequency || "weekly";
    });

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

    const overdueIds = rentalInvoices
      .filter((r) => r.status === "overdue")
      .map((r) => r.id);
    if (overdueIds.length > 0) {
      await supabase.from("payments").update({ status: "overdue" }).in("id", overdueIds).eq("payment_type", "rental").neq("status", "paid");
    }

    const merged = [...maintenanceInvoices, ...rentalInvoices].sort(
      (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    );

    setAllInvoices(merged);
    setLoading(false);
  }, []);

  // ---- VIOLATIONS FETCH ----
  const fetchViolations = useCallback(async () => {
    setViolationsLoading(true);
    const { data } = await supabase
      .from("traffic_violations")
      .select("*, vehicle:vehicles(plate, model)")
      .order("violation_date", { ascending: false });

    const rows = (data ?? []) as any[];
    const renterIds = [...new Set(rows.map((r) => r.renter_id))];
    let renterMap: Record<string, string> = {};
    if (renterIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", renterIds);
      renterMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
    }

    const mapped: TrafficViolation[] = rows.map((r) => ({
      id: r.id,
      vehicle_id: r.vehicle_id,
      vehicle_plate: r.vehicle?.plate ?? "",
      vehicle_model: r.vehicle?.model ?? "",
      renter_name: renterMap[r.renter_id] ?? "—",
      renter_id: r.renter_id,
      description: r.description,
      amount: Number(r.amount),
      violation_date: r.violation_date,
      due_date: r.due_date,
      status: r.status === "paid" ? "paid" : (isBefore(new Date(r.due_date + "T23:59:59"), new Date()) ? "overdue" : r.status),
      paid_date: r.paid_date,
      auto_number: r.auto_number,
      source: r.source,
      document_url: r.document_url ?? null,
    }));

    setViolations(mapped);
    setViolationsLoading(false);
  }, []);

  const fetchVehicleOptions = useCallback(async () => {
    const { data: assigns } = await supabase
      .from("vehicle_assignments")
      .select("vehicle_id, renter_id, vehicle:vehicles(plate, model)")
      .eq("is_active", true);

    if (!assigns) return;
    const renterIds = [...new Set((assigns as any[]).map((a) => a.renter_id))];
    let rMap: Record<string, string> = {};
    if (renterIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", renterIds);
      rMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
    }

    setVehicleOptions((assigns as any[]).map((a) => {
      const v = Array.isArray(a.vehicle) ? a.vehicle[0] : a.vehicle;
      return {
        id: a.vehicle_id,
        plate: v?.plate ?? "",
        model: v?.model ?? "",
        renter_id: a.renter_id,
        renter_name: rMap[a.renter_id] ?? "—",
      };
    }));
  }, []);

  useEffect(() => { fetchAll(); fetchViolations(); }, [fetchAll, fetchViolations]);

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
    const today = new Date().toISOString().split("T")[0];

    if (confirmPayType === "violation") {
      const { error } = await supabase
        .from("traffic_violations")
        .update({ status: "paid", paid_date: today } as any)
        .eq("id", confirmPayId);
      if (error) { toast.error("Erro: " + error.message); setConfirmPayId(null); return; }
      toast.success("Infração marcada como paga");
      setConfirmPayId(null);
      fetchViolations();
      return;
    }

    const inv = allInvoices.find((i) => i.id === confirmPayId);
    if (!inv) return;

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

  const handleAddViolation = async () => {
    if (!violationForm.vehicle_id || !violationForm.description || !violationForm.violation_date || !violationForm.due_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const selected = vehicleOptions.find((v) => v.id === violationForm.vehicle_id);
    if (!selected) { toast.error("Veículo não encontrado"); return; }

    const { error } = await supabase.from("traffic_violations").insert({
      vehicle_id: violationForm.vehicle_id,
      renter_id: selected.renter_id,
      description: violationForm.description,
      amount: violationForm.amount,
      violation_date: violationForm.violation_date,
      due_date: violationForm.due_date,
      auto_number: violationForm.auto_number || null,
    } as any);

    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Infração registrada");
    setViolationForm({ vehicle_id: "", renter_id: "", description: "", amount: 0, violation_date: "", due_date: "", auto_number: "" });
    setAddViolationOpen(false);
    fetchViolations();
  };

  // ---- RENDER ----
  return (
    <MobileLayout title="Faturas">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-border/50 pb-2">
          {([
            { key: "invoices" as TabKey, label: "Faturas", icon: Receipt },
            { key: "violations" as TabKey, label: "Infrações de Trânsito", icon: ShieldAlert },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors",
                activeTab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "invoices" && (
          <>
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

                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            className="w-full flex items-center justify-center gap-2 mt-2 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                          >
                            <FileDown className="h-4 w-4" />
                            Baixar Fatura em PDF
                          </button>

                          {isAdmin && inv.status !== "paid" && inv.status !== "informational" && (
                            <button
                              onClick={() => { setConfirmPayId(inv.id); setConfirmPayType("invoice"); }}
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
          </>
        )}

        {/* ======== VIOLATIONS TAB ======== */}
        {activeTab === "violations" && (
          <>
            {/* Summary */}
            <div className="flex gap-2">
              {[
                { key: "pending", label: "Pendentes" },
                { key: "paid", label: "Pagas" },
                { key: "overdue", label: "Atrasadas" },
              ].map(({ key, label }) => {
                const count = violations.filter((v) => v.status === key).length;
                const conf = statusConfig[key];
                return (
                  <div key={key} className={cn("flex-1 rounded-lg px-3 py-2 text-center", conf.colorClass)}>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-[10px] font-medium">{label}</p>
                  </div>
                );
              })}
            </div>

            {/* Add button (admin) */}
            {isAdmin && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => { setAddViolationOpen(true); fetchVehicleOptions(); }}
              >
                <Plus className="h-4 w-4" />
                Registrar Infração
              </Button>
            )}

            {violationsLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Carregando infrações...</div>
            ) : violations.length === 0 ? (
              <div className="text-center py-12">
                <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma infração registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {violations.map((v) => {
                  const conf = statusConfig[v.status] ?? statusConfig.pending;
                  const isExpanded = expandedId === v.id;

                  return (
                    <div key={v.id} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : v.id)}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />
                              <h3 className="text-sm font-semibold text-foreground">{v.description}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {v.vehicle_model} · {v.vehicle_plate} · {v.renter_name}
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
                          <span className="font-semibold text-foreground">R$ {v.amount.toFixed(2)}</span>
                          <span>Infração: {formatDate(v.violation_date)}</span>
                          <span>Venc.: {formatDate(v.due_date)}</span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border/30 px-4 py-3 space-y-3">
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Veículo</span>
                              <span className="text-foreground font-medium">{v.vehicle_model} ({v.vehicle_plate})</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Locatário</span>
                              <span className="text-foreground font-medium">{v.renter_name}</span>
                            </div>
                            {v.auto_number && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Nº do Auto</span>
                                <span className="text-foreground font-medium">{v.auto_number}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Data da Infração</span>
                              <span className="text-foreground font-medium">{formatDate(v.violation_date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Vencimento</span>
                              <span className="text-foreground font-medium">{formatDate(v.due_date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Origem</span>
                              <span className="text-foreground font-medium">{v.source === "manual" ? "Lançamento manual" : v.source}</span>
                            </div>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border/20 text-xs font-semibold">
                            <span>Valor da multa</span>
                            <span>R$ {v.amount.toFixed(2)}</span>
                          </div>

                          {/* Document upload (admin) / download (all) */}
                          {v.document_url ? (
                            <button
                              onClick={async () => {
                                const { data } = await supabase.storage.from("violation-documents").createSignedUrl(v.document_url!, 300);
                                if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                                else toast.error("Erro ao gerar link de download");
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                            >
                              <FileDown className="h-4 w-4" />
                              Baixar Documento da Infração
                            </button>
                          ) : isAdmin ? (
                            <label className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-xs font-medium cursor-pointer">
                              <Upload className="h-4 w-4" />
                              Anexar Documento
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const ext = file.name.split(".").pop();
                                  const path = `${v.renter_id}/${v.id}.${ext}`;
                                  const { error: upErr } = await supabase.storage.from("violation-documents").upload(path, file, { upsert: true });
                                  if (upErr) { toast.error("Erro no upload: " + upErr.message); return; }
                                  await supabase.from("traffic_violations").update({ document_url: path } as any).eq("id", v.id);
                                  toast.success("Documento anexado");
                                  fetchViolations();
                                }}
                              />
                            </label>
                          ) : (
                            <p className="text-[10px] text-muted-foreground text-center italic">Nenhum documento anexado</p>
                          )}

                          {isAdmin && v.status !== "paid" && (
                            <button
                              onClick={() => { setConfirmPayId(v.id); setConfirmPayType("violation"); }}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors text-xs font-medium"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Marcar como Paga
                            </button>
                          )}

                          {v.status === "paid" && (
                            <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-success/10 text-success text-xs font-medium">
                              <CheckCircle2 className="h-4 w-4" />
                              Infração paga {v.paid_date ? `em ${formatDate(v.paid_date)}` : ""}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm payment dialog */}
      <AlertDialog open={!!confirmPayId} onOpenChange={(open) => !open && setConfirmPayId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPayType === "violation"
                ? "Deseja marcar esta infração como paga? O status será atualizado para o administrador e para o locatário."
                : "Deseja marcar esta fatura como paga? O status será atualizado para o administrador e para o locatário."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkPaid}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add violation dialog */}
      <Dialog open={addViolationOpen} onOpenChange={setAddViolationOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Infração de Trânsito</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Veículo / Locatário *</Label>
              <Select
                value={violationForm.vehicle_id}
                onValueChange={(v) => {
                  const sel = vehicleOptions.find((o) => o.id === v);
                  setViolationForm({ ...violationForm, vehicle_id: v, renter_id: sel?.renter_id ?? "" });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>
                  {vehicleOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.model} ({o.plate}) — {o.renter_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição da infração *</Label>
              <Input
                value={violationForm.description}
                onChange={(e) => setViolationForm({ ...violationForm, description: e.target.value })}
                placeholder="Ex: Excesso de velocidade"
              />
            </div>
            <div>
              <Label>Nº do Auto</Label>
              <Input
                value={violationForm.auto_number}
                onChange={(e) => setViolationForm({ ...violationForm, auto_number: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={violationForm.amount}
                  onChange={(e) => setViolationForm({ ...violationForm, amount: +e.target.value })}
                />
              </div>
              <div>
                <Label>Data da infração *</Label>
                <Input
                  type="date"
                  value={violationForm.violation_date}
                  onChange={(e) => setViolationForm({ ...violationForm, violation_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={violationForm.due_date}
                onChange={(e) => setViolationForm({ ...violationForm, due_date: e.target.value })}
              />
            </div>
            <Button onClick={handleAddViolation} className="w-full">Registrar Infração</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
