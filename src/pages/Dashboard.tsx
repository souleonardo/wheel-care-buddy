import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { useFleet } from "@/context/FleetContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Car, CreditCard, AlertTriangle, Wrench, Clock, CalendarIcon, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, useCallback } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type PeriodPreset = "week" | "month" | "30d" | "90d" | "custom";

const presetLabels: Record<PeriodPreset, string> = {
  week: "Esta semana",
  month: "Este mês",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  custom: "Personalizado",
};

function getPresetRange(preset: PeriodPreset): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "30d":
      return { from: subDays(now, 30), to: now };
    case "90d":
      return { from: subDays(now, 90), to: now };
    default:
      return { from: subDays(now, 30), to: now };
  }
}

const statusLabels: Record<string, { label: string; class: string }> = {
  paid: { label: "Pago", class: "bg-success/15 text-success" },
  pending: { label: "Pendente", class: "bg-warning/15 text-warning" },
  overdue: { label: "Atrasado", class: "bg-destructive/15 text-destructive" },
};

interface DBPayment {
  id: string;
  vehicle_id: string;
  renter_id: string;
  amount: number;
  due_date: string;
  status: string;
  paid_date: string | null;
  payment_type: string;
  vehicle?: { plate: string } | null;
  renter?: { full_name: string } | null;
}

export default function Dashboard() {
  const { vehicles, revisions } = useFleet();
  const { fullName } = useAuth();

  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const range = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  const fromStr = format(range.from, "yyyy-MM-dd");
  const toStr = format(range.to, "yyyy-MM-dd");

  // Fetch payments from DB filtered by period
  const [dbPayments, setDbPayments] = useState<DBPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    const { data, error } = await supabase
      .from("payments")
      .select("id, vehicle_id, renter_id, amount, due_date, status, paid_date, payment_type, vehicle:vehicles(plate)")
      .gte("due_date", fromStr)
      .lte("due_date", toStr)
      .order("due_date", { ascending: false });

    if (!error && data) {
      // Fetch renter names
      const renterIds = [...new Set((data as any[]).map((p) => p.renter_id))];
      let profileMap: Record<string, string> = {};
      if (renterIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", renterIds);
        profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.full_name]));
      }

      setDbPayments((data as any[]).map((p) => ({
        ...p,
        vehicle: p.vehicle ? (Array.isArray(p.vehicle) ? p.vehicle[0] : p.vehicle) : null,
        renter: { full_name: profileMap[p.renter_id] ?? "—" },
      })));
    }
    setPaymentsLoading(false);
  }, [fromStr, toStr]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Filter revisions by period
  const filteredRevisions = useMemo(() => {
    return revisions.filter((r) => r.scheduledDate >= fromStr && r.scheduledDate <= toStr);
  }, [revisions, fromStr, toStr]);

  // Filter vehicles with active assignments during the period
  const [assignmentCounts, setAssignmentCounts] = useState({ rented: 0, available: 0 });

  useEffect(() => {
    // Current snapshot: vehicles rented now
    const rented = vehicles.filter((v) => v.status === "rented").length;
    const available = vehicles.filter((v) => v.status === "available").length;
    setAssignmentCounts({ rented, available });
  }, [vehicles]);

  // Stats
  const paidPayments = dbPayments.filter((p) => p.status === "paid");
  const overduePayments = dbPayments.filter((p) => p.status === "overdue");
  const pendingPayments = dbPayments.filter((p) => p.status === "pending");

  const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOverdue = overduePayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const scheduledRevisions = filteredRevisions.filter((r) => r.status === "scheduled" || r.status === "in_progress").length;
  const completedRevisions = filteredRevisions.filter((r) => r.status === "completed").length;

  const recentPayments = dbPayments.slice(0, 5);
  const nextRevisions = filteredRevisions.filter((r) => r.status !== "completed").slice(0, 3);

  return (
    <AppLayout title="FleetControl">
      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Olá, {fullName?.split(" ")[0] || "Admin"} 👋</h2>
          <p className="text-sm text-muted-foreground mt-1">Aqui está o resumo da sua frota</p>
        </div>

        {/* Period Filter */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Período</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(presetLabels) as PeriodPreset[]).filter((k) => k !== "custom").map((key) => (
              <Button
                key={key}
                size="sm"
                variant={preset === key ? "default" : "outline"}
                className="text-xs h-8"
                onClick={() => setPreset(key)}
              >
                {presetLabels[key]}
              </Button>
            ))}
            <Button
              size="sm"
              variant={preset === "custom" ? "default" : "outline"}
              className="text-xs h-8"
              onClick={() => {
                setPreset("custom");
                if (!customFrom) setCustomFrom(subDays(new Date(), 30));
                if (!customTo) setCustomTo(new Date());
              }}
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              Personalizado
            </Button>
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-2 mt-2">
              <Popover open={showFromPicker} onOpenChange={setShowFromPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    {customFrom ? format(customFrom, "dd/MM/yyyy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customFrom}
                    onSelect={(d) => { setCustomFrom(d ?? undefined); setShowFromPicker(false); }}
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">até</span>
              <Popover open={showToPicker} onOpenChange={setShowToPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    {customTo ? format(customTo, "dd/MM/yyyy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customTo}
                    onSelect={(d) => { setCustomTo(d ?? undefined); setShowToPicker(false); }}
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            {format(range.from, "dd/MM/yyyy")} — {format(range.to, "dd/MM/yyyy")}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Alugados"
            value={assignmentCounts.rented}
            subtitle={`${assignmentCounts.available} disponíveis`}
            icon={Car}
            variant="primary"
          />
          <StatCard
            title="Faturamento"
            value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
            subtitle={`${paidPayments.length} pagos`}
            icon={CreditCard}
            variant="success"
          />
          <StatCard
            title="Atrasados"
            value={`R$ ${totalOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
            subtitle={`${overduePayments.length} pgtos · ${pendingPayments.length} pendentes`}
            icon={AlertTriangle}
            variant={overduePayments.length > 0 ? "destructive" : "default"}
          />
          <StatCard
            title="Revisões"
            value={scheduledRevisions}
            subtitle={`${completedRevisions} concluídas`}
            icon={Wrench}
            variant="warning"
          />
        </div>

        {/* Recent Payments */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Pagamentos no Período</h3>
          {paymentsLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : recentPayments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum pagamento no período.</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((payment) => {
                const st = statusLabels[payment.status] ?? statusLabels.pending;
                return (
                  <div key={payment.id} className="flex items-center justify-between bg-card rounded-xl border border-border/50 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{payment.renter?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{payment.vehicle?.plate ?? "—"} · Venc. {new Date(payment.due_date).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-semibold text-foreground">R$ {Number(payment.amount).toLocaleString("pt-BR")}</span>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", st.class)}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Revisions */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Revisões no Período</h3>
          {nextRevisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma revisão no período.</p>
          ) : (
            <div className="space-y-2">
              {nextRevisions.map((rev) => (
                <div key={rev.id} className="flex items-center gap-3 bg-card rounded-xl border border-border/50 p-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    rev.status === "in_progress" ? "bg-warning/15" : "bg-info/15"
                  )}>
                    {rev.status === "in_progress" ? <Clock className="h-4 w-4 text-warning" /> : <Wrench className="h-4 w-4 text-info" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{rev.vehicleModel}</p>
                    <p className="text-xs text-muted-foreground">{rev.type} · {new Date(rev.scheduledDate).toLocaleDateString("pt-BR")}{rev.scheduledTime ? ` às ${rev.scheduledTime}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
