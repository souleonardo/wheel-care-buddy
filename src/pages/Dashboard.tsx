import { MobileLayout } from "@/components/MobileLayout";
import { StatCard } from "@/components/StatCard";
import { useFleet } from "@/context/FleetContext";
import { useAuth } from "@/hooks/useAuth";
import { Car, CreditCard, AlertTriangle, Wrench, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const statusLabels = {
  paid: { label: "Pago", class: "bg-success/15 text-success" },
  pending: { label: "Pendente", class: "bg-warning/15 text-warning" },
  overdue: { label: "Atrasado", class: "bg-destructive/15 text-destructive" },
};

export default function Dashboard() {
  const { vehicles, payments, revisions } = useFleet();
  const { fullName } = useAuth();

  const activeRentals = vehicles.filter((v) => v.status === "rented").length;
  const overduePayments = payments.filter((p) => p.status === "overdue").length;
  const pendingPayments = payments.filter((p) => p.status === "pending").length;
  const upcomingRevisions = revisions.filter((r) => r.status === "scheduled").length;
  const totalWeeklyRevenue = vehicles.filter((v) => v.status === "rented").reduce((sum, v) => sum + v.weeklyRate, 0);

  const recentPayments = payments.slice(0, 4);
  const nextRevisions = revisions.filter((r) => r.status !== "completed").slice(0, 3);

  return (
    <MobileLayout title="FleetControl">
      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Olá, Admin 👋</h2>
          <p className="text-sm text-muted-foreground mt-1">Aqui está o resumo da sua frota</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Alugados" value={activeRentals} subtitle={`de ${vehicles.length} veículos`} icon={Car} variant="primary" />
          <StatCard title="Receita/Semana" value={`R$ ${totalWeeklyRevenue.toLocaleString("pt-BR")}`} icon={CreditCard} variant="success" />
          <StatCard title="Atrasados" value={overduePayments} subtitle={`${pendingPayments} pendentes`} icon={AlertTriangle} variant={overduePayments > 0 ? "destructive" : "default"} />
          <StatCard title="Revisões" value={upcomingRevisions} subtitle="agendadas" icon={Wrench} variant="warning" />
        </div>

        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Pagamentos Recentes</h3>
          <div className="space-y-2">
            {recentPayments.map((payment) => {
              const status = statusLabels[payment.status];
              return (
                <div key={payment.id} className="flex items-center justify-between bg-card rounded-xl border border-border/50 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{payment.renterName}</p>
                    <p className="text-xs text-muted-foreground">{payment.vehiclePlate} · Venc. {new Date(payment.dueDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-sm font-semibold text-foreground">R$ {payment.amount}</span>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", status.class)}>{status.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Próximas Revisões</h3>
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
                  <p className="text-xs text-muted-foreground">{rev.type} · {new Date(rev.scheduledDate).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
}
