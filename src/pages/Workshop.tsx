import { useFleet } from "@/context/FleetContext";
import { useEffect, useState, useCallback } from "react";
import { Clock, CheckCircle2, Wrench, CalendarDays, Car, Package, FileText, Droplets, AlertTriangle, Trash2 } from "lucide-react";
import { DaySchedulePopover } from "@/components/DaySchedulePopover";
import { MobileLayout } from "@/components/MobileLayout";
import { AddSupplyUsageDialog } from "@/components/AddSupplyUsageDialog";
import { OilChangeMileageDialog } from "@/components/OilChangeMileageDialog";
import { MechanicNotesDialog } from "@/components/MechanicNotesDialog";
import { LaborChargeDialog } from "@/components/LaborChargeDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { generateRevisionPDF } from "@/lib/generateRevisionPDF";
import { toast } from "sonner";
import { BillableConfigDialog } from "@/components/BillableConfigDialog";
import { useAuth } from "@/hooks/useAuth";

interface UsageRecord {
  id: string;
  revision_id: string;
  quantity_used: number;
  supply: { name: string; unit: string; unit_cost: number } | null;
}

interface VehicleOilStatus {
  id: string;
  model: string;
  plate: string;
  current_mileage: number;
  next_oil_change_km: number | null;
  last_oil_change_date: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof CalendarDays; class: string; iconClass: string }> = {
  pending_approval: { label: "Pendente", icon: CalendarDays, class: "bg-muted text-muted-foreground", iconClass: "text-muted-foreground" },
  scheduled: { label: "Agendada", icon: CalendarDays, class: "bg-info/15 text-info", iconClass: "text-info" },
  in_progress: { label: "Em andamento", icon: Clock, class: "bg-warning/15 text-warning", iconClass: "text-warning" },
  completed: { label: "Concluída", icon: CheckCircle2, class: "bg-success/15 text-success", iconClass: "text-success" },
  rejected: { label: "Rejeitada", icon: AlertTriangle, class: "bg-destructive/15 text-destructive", iconClass: "text-destructive" },
};
const fallbackStatusConfig = { label: "Desconhecido", icon: CalendarDays, class: "bg-muted text-muted-foreground", iconClass: "text-muted-foreground" };

export default function Workshop() {
  const { revisions, updateRevisionStatus } = useFleet();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const pendingRevisions = revisions.filter((r) => r.status === "pending_approval" || r.status === "scheduled");
  const activeRevisions = revisions.filter((r) => r.status === "in_progress");
  const completedRevisions = revisions.filter((r) => r.status === "completed");

  const [usageMap, setUsageMap] = useState<Record<string, UsageRecord[]>>({});
  const [localUsageMap, setLocalUsageMap] = useState<Record<string, { name: string; unit: string; quantity: number; unitCost: number }[]>>({});
  const [billableTypes, setBillableTypes] = useState<Set<string>>(new Set());
  const [oilVehicles, setOilVehicles] = useState<VehicleOilStatus[]>([]);
  const [oilDialog, setOilDialog] = useState<{
    open: boolean;
    vehicleId: string;
    vehicleModel: string;
    vehiclePlate: string;
    revisionId: string;
    pendingComplete: (() => void) | null;
  }>({ open: false, vehicleId: "", vehicleModel: "", vehiclePlate: "", revisionId: "", pendingComplete: null });

  const [notesDialog, setNotesDialog] = useState<{
    open: boolean;
    revisionLabel: string;
    pendingComplete: ((notes: string) => void) | null;
  }>({ open: false, revisionLabel: "", pendingComplete: null });

  const [laborDialog, setLaborDialog] = useState<{
    open: boolean;
    revisionLabel: string;
    revisionId: string;
    pendingContinue: (() => void) | null;
  }>({ open: false, revisionLabel: "", revisionId: "", pendingContinue: null });

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

  const fetchBillableTypes = useCallback(async () => {
    const { data } = await supabase
      .from("billable_service_types")
      .select("service_type");
    if (data) setBillableTypes(new Set(data.map((d: any) => d.service_type)));
  }, []);

  const fetchOilStatus = useCallback(async () => {
    const { data } = await supabase
      .from("vehicles")
      .select("id, model, plate, current_mileage, next_oil_change_km, last_oil_change_date")
      .not("next_oil_change_km", "is", null)
      .order("next_oil_change_km", { ascending: true });

    if (data) setOilVehicles(data as VehicleOilStatus[]);
  }, []);

  useEffect(() => {
    fetchUsage();
    fetchBillableTypes();
    fetchOilStatus();
  }, [fetchUsage, fetchBillableTypes, fetchOilStatus]);

  const handleRemoveUsage = async (usageId: string) => {
    const { error } = await supabase.from("supply_usage").delete().eq("id", usageId);
    if (error) {
      toast.error("Erro ao remover peça: " + error.message);
      return;
    }
    toast.success("Peça removida e estoque restaurado");
    fetchUsage();
  };

  const renderUsageList = (revisionId: string, allowDelete = false) => {
    const dbItems = usageMap[revisionId] || [];
    const localItems = localUsageMap[revisionId] || [];
    if (dbItems.length === 0 && localItems.length === 0) return null;
    return (
      <div className="mt-2 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Package className="h-3 w-3" /> Peças utilizadas ({dbItems.length + localItems.length})
        </p>
        {dbItems.map((item) => (
          <div key={item.id} className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1 flex items-center justify-between">
            <span>
              {item.supply?.name ?? "—"}: <span className="font-medium text-foreground">{item.quantity_used} {item.supply?.unit}</span>
            </span>
            {allowDelete && (
              <button
                onClick={() => handleRemoveUsage(item.id)}
                className="text-destructive hover:text-destructive/80 p-0.5 ml-2"
                title="Remover peça"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {localItems.map((item, idx) => (
          <div key={`local-${idx}`} className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1">
            {item.name}: <span className="font-medium text-foreground">{item.quantity} {item.unit}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleCompleteRevision = async (rev: typeof revisions[0]) => {
    // Step 1: Show labor charge dialog first
    setLaborDialog({
      open: true,
      revisionLabel: `${rev.vehicleModel} — ${rev.type}`,
      revisionId: rev.id,
      pendingContinue: () => proceedAfterLabor(rev),
    });
  };

  const saveLaborCharge = async (revisionId: string, data: { amount: number; description: string }) => {
    const { data: userData } = await supabase.auth.getUser();
    const mechanicId = userData?.user?.id;
    if (!mechanicId) return;

    const { error } = await supabase.from("labor_charges").insert({
      revision_id: revisionId,
      mechanic_id: mechanicId,
      amount: data.amount,
      description: data.description,
    } as any);

    if (error) {
      console.error("Error saving labor charge:", error);
      toast.error("Erro ao salvar mão de obra: " + error.message);
    } else {
      toast.success(`Mão de obra lançada: R$ ${data.amount.toFixed(2)}`);
    }
  };

  const proceedAfterLabor = async (rev: typeof revisions[0]) => {
    const isOilChange = rev.type === "Troca de óleo";
    const hasPartsRegistered = (usageMap[rev.id] || []).length > 0 || (localUsageMap[rev.id] || []).length > 0;

    // If no parts registered, require mechanic notes first
    if (!hasPartsRegistered) {
      setNotesDialog({
        open: true,
        revisionLabel: `${rev.vehicleModel} — ${rev.type}`,
        pendingComplete: async (mechanicNotes: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(rev.id)) {
            await supabase
              .from("revisions")
              .update({ mechanic_notes: mechanicNotes })
              .eq("id", rev.id);
          }

          if (isOilChange) {
            setOilDialog({
              open: true,
              vehicleId: rev.vehicleId,
              vehicleModel: rev.vehicleModel,
              vehiclePlate: rev.vehiclePlate,
              revisionId: rev.id,
              pendingComplete: () => finalizeCompletion(rev),
            });
          } else {
            await finalizeCompletion(rev);
          }
        },
      });
      return;
    }

    if (isOilChange) {
      setOilDialog({
        open: true,
        vehicleId: rev.vehicleId,
        vehicleModel: rev.vehicleModel,
        vehiclePlate: rev.vehiclePlate,
        revisionId: rev.id,
        pendingComplete: () => finalizeCompletion(rev),
      });
    } else {
      await finalizeCompletion(rev);
    }
  };

  const finalizeCompletion = async (rev: typeof revisions[0]) => {
    updateRevisionStatus(rev.id, "completed");

    const usageItems = usageMap[rev.id] || [];

    // Get active renter for this vehicle
    const { data: assignment } = await supabase
      .from("vehicle_assignments")
      .select("renter_id")
      .eq("vehicle_id", rev.vehicleId)
      .eq("is_active", true)
      .maybeSingle();

    // Fetch labor charges for this revision
    const { data: laborChargesData } = await supabase
      .from("labor_charges")
      .select("amount")
      .eq("revision_id", rev.id);
    const laborTotal = (laborChargesData ?? []).reduce((sum, c) => sum + Number(c.amount), 0);

    const isBillableRevision = billableTypes.has(rev.type);

    // Generate invoice if there's a renter AND (has parts, has labor, or is billable type)
    if (assignment?.renter_id && (usageItems.length > 0 || laborTotal > 0 || isBillableRevision)) {
      const items = usageItems.map((u) => ({
        supply_name: u.supply?.name ?? "—",
        quantity: u.quantity_used,
        unit: u.supply?.unit ?? "un",
        unit_cost: Number(u.supply?.unit_cost ?? 0),
        is_billable: isBillableRevision,
      }));

      const partsTotal = items
        .filter((i) => i.is_billable)
        .reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

      const totalBillable = partsTotal + (isBillableRevision ? laborTotal : 0);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          vehicle_id: rev.vehicleId,
          renter_id: assignment.renter_id,
          revision_id: rev.id,
          total_amount: totalBillable,
          status: totalBillable > 0 ? "pending" : "informational",
          due_date: dueDate.toISOString().split("T")[0],
        } as any)
        .select("id")
        .single();

      if (!invoiceError && invoice) {
        // Insert supply items (if any)
        if (items.length > 0) {
          const invoiceItems = items.map((i) => ({
            invoice_id: (invoice as any).id,
            ...i,
          }));
          await supabase.from("invoice_items").insert(invoiceItems as any);
        }

        // Also create payment record for billable amount
        if (totalBillable > 0) {
          await supabase.from("payments").insert({
            vehicle_id: rev.vehicleId,
            renter_id: assignment.renter_id,
            amount: totalBillable,
            due_date: dueDate.toISOString().split("T")[0],
            status: "pending",
            payment_type: "maintenance",
            revision_id: rev.id,
          });
        }

        toast.success(
          totalBillable > 0
            ? `Fatura gerada: R$ ${totalBillable.toFixed(2)}`
            : "Fatura informativa gerada (sem cobrança)"
        );
      }
    }

    // Fetch vehicle details for PDF
    const { data: vehicleDetails } = await supabase
      .from("vehicles")
      .select("chassis, renavam")
      .eq("id", rev.vehicleId)
      .single();

    // Generate PDF report
    const supplies = usageItems.map((u) => ({
      name: u.supply?.name ?? "—",
      unit: u.supply?.unit ?? "un",
      quantity: u.quantity_used,
    }));
    generateRevisionPDF({
      vehicleModel: rev.vehicleModel,
      vehiclePlate: rev.vehiclePlate,
      vehicleChassis: (vehicleDetails as any)?.chassis,
      vehicleRenavam: (vehicleDetails as any)?.renavam,
      type: rev.type,
      scheduledDate: rev.scheduledDate,
      notes: rev.notes,
      supplies,
    });

    fetchOilStatus();
  };

  // Oil change status helpers
  const getOilStatus = (v: VehicleOilStatus) => {
    if (!v.next_oil_change_km) return null;
    const remaining = v.next_oil_change_km - v.current_mileage;
    if (remaining <= 0) return { label: "Vencida", class: "bg-destructive/15 text-destructive", urgent: true };
    if (remaining <= 1000) return { label: `Faltam ${remaining.toLocaleString("pt-BR")} km`, class: "bg-warning/15 text-warning", urgent: true };
    return { label: `Faltam ${remaining.toLocaleString("pt-BR")} km`, class: "bg-success/15 text-success", urgent: false };
  };

  const urgentOilVehicles = oilVehicles.filter((v) => {
    const s = getOilStatus(v);
    return s?.urgent;
  });

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

        {isAdmin && (
          <div className="flex justify-end">
            <BillableConfigDialog onUpdated={fetchBillableTypes} />
          </div>
        )}

        {/* New Requests (pending_approval + scheduled) */}
        {pendingRevisions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Novas Solicitações</h2>
            <div className="space-y-3">
              {pendingRevisions.map((rev) => {
                const config = statusConfig[rev.status] ?? fallbackStatusConfig;
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
                            <span>{new Date(rev.scheduledDate).toLocaleDateString("pt-BR")}{rev.scheduledTime ? ` às ${rev.scheduledTime}` : ""}</span>
                          </div>
                        </div>
                        {rev.notes && (
                          <p className="text-[11px] text-muted-foreground/70 mt-2 italic">📝 {rev.notes}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {rev.status === "pending_approval" && (
                            <>
                              <DaySchedulePopover date={rev.scheduledDate} highlightTime={rev.scheduledTime} />
                              <button
                                onClick={() => updateRevisionStatus(rev.id, "scheduled")}
                                className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors"
                              >
                                ✅ Aprovar
                              </button>
                              <button
                                onClick={() => updateRevisionStatus(rev.id, "rejected")}
                                className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                              >
                                ❌ Rejeitar
                              </button>
                            </>
                          )}
                          {rev.status === "scheduled" && (
                            <button
                              onClick={() => updateRevisionStatus(rev.id, "in_progress")}
                              className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-warning/15 text-warning hover:bg-warning/25 transition-colors"
                            >
                              Iniciar Serviço
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
        )}

        {/* Active Services (in_progress) */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Serviços Ativos</h2>
          {activeRevisions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum serviço em andamento</p>
          )}
          <div className="space-y-3">
            {activeRevisions.map((rev) => {
              const config = statusConfig[rev.status] ?? fallbackStatusConfig;
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
                          <span>{new Date(rev.scheduledDate).toLocaleDateString("pt-BR")}{rev.scheduledTime ? ` às ${rev.scheduledTime}` : ""}</span>
                        </div>
                      </div>
                      {rev.notes && (
                        <p className="text-[11px] text-muted-foreground/70 mt-2 italic">📝 {rev.notes}</p>
                      )}
                      {renderUsageList(rev.id, true)}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <AddSupplyUsageDialog
                          revisionId={rev.id}
                          revisionLabel={`${rev.vehicleModel} — ${rev.type}`}
                          onUsageAdded={() => {
                            fetchUsage();
                          }}
                        />
                        <button
                          onClick={() => handleCompleteRevision(rev)}
                          className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors"
                        >
                          Concluir Serviço
                        </button>
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
                      <p className="text-xs text-muted-foreground">{rev.vehiclePlate} · {new Date(rev.scheduledDate).toLocaleDateString("pt-BR")}{rev.scheduledTime ? ` às ${rev.scheduledTime}` : ""}</p>
                    </div>
                  </div>
                  {renderUsageList(rev.id)}
                  <button
                    onClick={async () => {
                      const supplies = (usageMap[rev.id] || []).map((u) => ({
                        name: u.supply?.name ?? "—",
                        unit: u.supply?.unit ?? "un",
                        quantity: u.quantity_used,
                      }));
                      const { data: vd } = await supabase
                        .from("vehicles")
                        .select("chassis, renavam")
                        .eq("id", rev.vehicleId)
                        .single();
                      generateRevisionPDF({
                        vehicleModel: rev.vehicleModel,
                        vehiclePlate: rev.vehiclePlate,
                        vehicleChassis: (vd as any)?.chassis,
                        vehicleRenavam: (vd as any)?.renavam,
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

        {/* Oil Change Status Panel - moved to end */}
        {oilVehicles.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-info" />
              Controle de Troca de Óleo
            </h2>
            {urgentOilVehicles.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">
                  {urgentOilVehicles.length} veículo(s) com troca de óleo próxima ou vencida
                </p>
              </div>
            )}
            <div className="space-y-2">
              {oilVehicles.map((v) => {
                const status = getOilStatus(v);
                if (!status) return null;
                const remaining = v.next_oil_change_km! - v.current_mileage;
                return (
                  <div key={v.id} className="bg-card rounded-xl border border-border/50 p-3 flex items-center gap-3">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", status.class)}>
                      <Droplets className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">{v.model}</p>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", status.class)}>
                          {remaining <= 0 ? "Vencida" : `${remaining.toLocaleString("pt-BR")} km`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span>{v.plate}</span>
                        <span>Atual: {v.current_mileage.toLocaleString("pt-BR")} km</span>
                        <span>Próxima: {v.next_oil_change_km!.toLocaleString("pt-BR")} km</span>
                      </div>
                      {v.last_oil_change_date && (
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          Última troca: {new Date(v.last_oil_change_date).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Oil Change Mileage Dialog */}
      <OilChangeMileageDialog
        open={oilDialog.open}
        onOpenChange={(open) => {
          if (!open) setOilDialog((prev) => ({ ...prev, open: false }));
        }}
        vehicleId={oilDialog.vehicleId}
        vehicleModel={oilDialog.vehicleModel}
        vehiclePlate={oilDialog.vehiclePlate}
        revisionId={oilDialog.revisionId}
        onConfirm={() => {
          oilDialog.pendingComplete?.();
        }}
      />

      {/* Mechanic Notes Dialog (when no parts registered) */}
      <MechanicNotesDialog
        open={notesDialog.open}
        onOpenChange={(open) => {
          if (!open) setNotesDialog((prev) => ({ ...prev, open: false }));
        }}
        revisionLabel={notesDialog.revisionLabel}
        onConfirm={(notes) => {
          notesDialog.pendingComplete?.(notes);
        }}
      />

      {/* Labor Charge Dialog */}
      <LaborChargeDialog
        open={laborDialog.open}
        onOpenChange={(open) => {
          if (!open) setLaborDialog((prev) => ({ ...prev, open: false }));
        }}
        revisionLabel={laborDialog.revisionLabel}
        onConfirm={async (data) => {
          await saveLaborCharge(laborDialog.revisionId, data);
          laborDialog.pendingContinue?.();
        }}
        onSkip={() => {
          laborDialog.pendingContinue?.();
        }}
      />
    </MobileLayout>
  );
}
