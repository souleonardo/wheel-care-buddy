import { useFleet } from "@/context/FleetContext";
import { Clock, CheckCircle2, Wrench, CalendarDays, Car } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { cn } from "@/lib/utils";

const statusConfig = {
  scheduled: { label: "Agendada", icon: CalendarDays, class: "bg-info/15 text-info", iconClass: "text-info" },
  in_progress: { label: "Em andamento", icon: Clock, class: "bg-warning/15 text-warning", iconClass: "text-warning" },
  completed: { label: "Concluída", icon: CheckCircle2, class: "bg-success/15 text-success", iconClass: "text-success" },
};

export default function Workshop() {
  const { revisions, updateRevisionStatus } = useFleet();
  const activeRevisions = revisions.filter((r) => r.status !== "completed");
  const completedRevisions = revisions.filter((r) => r.status === "completed");

  return (
    <MobileLayout title="Oficina — Agendamentos">
      <div className="p-4 space-y-6">
        {/* Summary */}
        <div className="flex gap-2">
          {(["scheduled", "in_progress", "completed"] as const).map((status) => {
            const count = revisions.filter((r) => r.status === status).length;
            const config = statusConfig[status];
            return (
              <div key={status} className={cn("flex-1 rounded-lg px-3 py-2 text-center", config.class)}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[10px] font-medium">{config.label}</p>
              </div>
            );
          })}
        </div>

        {/* Active */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Serviços Ativos</h2>
          {activeRevisions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum agendamento pendente</p>
          )}
          <div className="space-y-3">
            {activeRevisions.map((rev) => {
              const config = statusConfig[rev.status];
              const StatusIcon = config.icon;
              return (
                <div key={rev.id} className="bg-card rounded-xl border border-border/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", config.class)}>
                      <StatusIcon className={cn("h-5 w-5", config.iconClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{rev.vehicleModel}</h3>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", config.class)}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Car className="h-3 w-3" />
                        <span>{rev.vehiclePlate}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          <span>{rev.type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          <span>{new Date(rev.scheduledDate).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                      {rev.notes && (
                        <p className="text-[11px] text-muted-foreground/70 mt-2 italic">📝 {rev.notes}</p>
                      )}
                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3">
                        {rev.status === "scheduled" && (
                          <button
                            onClick={() => updateRevisionStatus(rev.id, "in_progress")}
                            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-warning/15 text-warning hover:bg-warning/25 transition-colors"
                          >
                            Iniciar Serviço
                          </button>
                        )}
                        {rev.status === "in_progress" && (
                          <button
                            onClick={() => updateRevisionStatus(rev.id, "completed")}
                            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors"
                          >
                            Concluir Serviço
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Completed */}
        {completedRevisions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Concluídos</h2>
            <div className="space-y-2">
              {completedRevisions.map((rev) => (
                <div key={rev.id} className="bg-card/50 rounded-xl border border-border/30 p-3 flex items-center gap-3 opacity-70">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{rev.vehicleModel} — {rev.type}</p>
                    <p className="text-xs text-muted-foreground">{rev.vehiclePlate} · {new Date(rev.scheduledDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </MobileLayout>
  );
}
