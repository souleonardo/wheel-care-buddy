import { useFleet } from "@/context/FleetContext";
import { useEffect, useState, useCallback } from "react";
import { Clock, CheckCircle2, Wrench, CalendarDays, Car, Package, FileText } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { AddSupplyUsageDialog } from "@/components/AddSupplyUsageDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { generateRevisionPDF } from "@/lib/generateRevisionPDF";
import { toast } from "sonner";
import { isServiceBillable } from "@/lib/billableServices";

interface UsageRecord {
  id: string;
  revision_id: string;
  quantity_used: number;
  supply: { name: string; unit: string; unit_cost: number } | null;
}

const statusConfig = {
  scheduled: { label: "Agendada", icon: CalendarDays, class: "bg-info/15 text-info", iconClass: "text-info" },
  in_progress: { label: "Em andamento", icon: Clock, class: "bg-warning/15 text-warning", iconClass: "text-warning" },
  completed: { label: "Concluída", icon: CheckCircle2, class: "bg-success/15 text-success", iconClass: "text-success" },
};

export default function Workshop() {
  const { revisions, updateRevisionStatus } = useFleet();
  const activeRevisions = revisions.filter((r) => r.status !== "completed");
  const completedRevisions = revisions.filter((r) => r.status === "completed");

  const [usageMap, setUsageMap] = useState<Record<string, UsageRecord[]>>({});

  const fetchUsage = useCallback(async () => {
    const revisionIds = revisions.map((r) => r.id);
    if (revisionIds.length === 0) return;

    const { data } = await supabase
      .from("supply_usage")
      .select("id, revision_id, quantity_used, supply:supplies(name, unit, unit_cost)")
      .in("revision_id", revisionIds);

    if (data) {
      const map: Record<string, UsageRecord[]> = {};
      (data as any[]).forEach((row) => {
        const rid = row.revision_id;
        if (!map[rid]) map[rid] = [];
        map[rid].push(row);
      });
      setUsageMap(map);
    }
  }, [revisions]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const renderUsageList = (revisionId: string) => {
    const items = usageMap[revisionId];
    if (!items || items.length === 0) return null;
    return (
      <div className="mt-2 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Package className="h-3 w-3" /> Peças utilizadas
        </p>
        {items.map((item) => (
          <div key={item.id} className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1">
            {item.supply?.name ?? "—"}: <span className="font-medium text-foreground">{item.quantity_used} {item.supply?.unit}</span>
          </div>
        ))}
      </div>
    );
  };

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

                      {/* Used supplies */}
                      {renderUsageList(rev.id)}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {rev.status === "scheduled" && (
                          <button
                            onClick={() => updateRevisionStatus(rev.id, "in_progress")}
                            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-warning/15 text-warning hover:bg-warning/25 transition-colors"
                          >
                            Iniciar Serviço
                          </button>
                        )}
                        {rev.status === "in_progress" && (
                          <>
                            <AddSupplyUsageDialog
                              revisionId={rev.id}
                              revisionLabel={`${rev.vehicleModel} — ${rev.type}`}
                              onUsageAdded={fetchUsage}
                            />
                            <button
                              onClick={async () => {
                                updateRevisionStatus(rev.id, "completed");

                                // Calculate cost & generate maintenance payment if billable
                                const usageItems = usageMap[rev.id] || [];
                                if (isServiceBillable(rev.type) && usageItems.length > 0) {
                                  const totalCost = usageItems.reduce((sum, u) => {
                                    const cost = u.supply?.unit_cost ?? 0;
                                    return sum + u.quantity_used * cost;
                                  }, 0);

                                  if (totalCost > 0) {
                                    // Find the renter via vehicle_assignments
                                    const { data: assignment } = await supabase
                                      .from("vehicle_assignments")
                                      .select("renter_id")
                                      .eq("vehicle_id", rev.vehicleId)
                                      .eq("is_active", true)
                                      .maybeSingle();

                                    if (assignment?.renter_id) {
                                      const dueDate = new Date();
                                      dueDate.setDate(dueDate.getDate() + 7);

                                      await supabase.from("payments").insert({
                                        vehicle_id: rev.vehicleId,
                                        renter_id: assignment.renter_id,
                                        amount: totalCost,
                                        due_date: dueDate.toISOString().split("T")[0],
                                        status: "pending",
                                        payment_type: "maintenance",
                                        revision_id: rev.id,
                                      });
                                      toast.success(`Fatura de manutenção gerada: R$ ${totalCost.toFixed(2)}`);
                                    }
                                  }
                                }

                                // Generate PDF report
                                const supplies = usageItems.map((u) => ({
                                  name: u.supply?.name ?? "—",
                                  unit: u.supply?.unit ?? "un",
                                  quantity: u.quantity_used,
                                }));
                                generateRevisionPDF({
                                  vehicleModel: rev.vehicleModel,
                                  vehiclePlate: rev.vehiclePlate,
                                  type: rev.type,
                                  scheduledDate: rev.scheduledDate,
                                  notes: rev.notes,
                                  supplies,
                                });
                              }}
                              className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors"
                            >
                              Concluir Serviço
                            </button>
                          </>
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
                <div key={rev.id} className="bg-card/50 rounded-xl border border-border/30 p-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{rev.vehicleModel} — {rev.type}</p>
                      <p className="text-xs text-muted-foreground">{rev.vehiclePlate} · {new Date(rev.scheduledDate).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  {renderUsageList(rev.id)}
                  <button
                    onClick={() => {
                      const supplies = (usageMap[rev.id] || []).map((u) => ({
                        name: u.supply?.name ?? "—",
                        unit: u.supply?.unit ?? "un",
                        quantity: u.quantity_used,
                      }));
                      generateRevisionPDF({
                        vehicleModel: rev.vehicleModel,
                        vehiclePlate: rev.vehiclePlate,
                        type: rev.type,
                        scheduledDate: rev.scheduledDate,
                        notes: rev.notes,
                        supplies,
                      });
                    }}
                    className="mt-2 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    Baixar Relatório PDF
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </MobileLayout>
  );
}
