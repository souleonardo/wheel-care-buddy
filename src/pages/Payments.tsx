import { useState } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { payments } from "@/data/mockData";
import { cn } from "@/lib/utils";

const statusConfig = {
  paid: { label: "Pago", class: "bg-success/15 text-success", dotClass: "bg-success" },
  pending: { label: "Pendente", class: "bg-warning/15 text-warning", dotClass: "bg-warning" },
  overdue: { label: "Atrasado", class: "bg-destructive/15 text-destructive", dotClass: "bg-destructive" },
};

type FilterStatus = "all" | "paid" | "pending" | "overdue";

export default function Payments() {
  const [filter, setFilter] = useState<FilterStatus>("all");

  const filtered = filter === "all" ? payments : payments.filter((p) => p.status === filter);

  const totalPending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);

  return (
    <MobileLayout title="Pagamentos">
      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="text-xl font-bold text-foreground">R$ {totalPending.toLocaleString("pt-BR")}</p>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Atrasado</p>
            <p className="text-xl font-bold text-foreground">R$ {totalOverdue.toLocaleString("pt-BR")}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {([
            { key: "all", label: "Todos" },
            { key: "pending", label: "Pendentes" },
            { key: "overdue", label: "Atrasados" },
            { key: "paid", label: "Pagos" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                filter === f.key
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Payment List */}
        <div className="space-y-2">
          {filtered.map((payment) => {
            const config = statusConfig[payment.status];
            return (
              <div key={payment.id} className="bg-card rounded-xl border border-border/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", config.dotClass)} />
                    <span className="text-sm font-medium text-foreground">{payment.renterName}</span>
                  </div>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", config.class)}>
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {payment.vehiclePlate} · Venc. {new Date(payment.dueDate).toLocaleDateString("pt-BR")}
                  </div>
                  <span className="text-base font-bold text-foreground">R$ {payment.amount}</span>
                </div>
                {payment.paidDate && (
                  <p className="text-[10px] text-success mt-1">Pago em {new Date(payment.paidDate).toLocaleDateString("pt-BR")}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
}
