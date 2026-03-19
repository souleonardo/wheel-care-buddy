import { MobileLayout } from "@/components/MobileLayout";
import { revisions } from "@/data/mockData";
import { Clock, CheckCircle2, Wrench, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  scheduled: { label: "Agendada", icon: CalendarDays, class: "bg-info/15 text-info", iconClass: "text-info" },
  in_progress: { label: "Em andamento", icon: Clock, class: "bg-warning/15 text-warning", iconClass: "text-warning" },
  completed: { label: "Concluída", icon: CheckCircle2, class: "bg-success/15 text-success", iconClass: "text-success" },
};

export default function Revisions() {
  return (
    <MobileLayout title="Revisões">
      <div className="p-4 space-y-4">
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

        {/* Revision List */}
        <div className="space-y-3">
          {revisions.map((rev) => {
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
                    <p className="text-xs text-muted-foreground">{rev.vehiclePlate}</p>
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
}
