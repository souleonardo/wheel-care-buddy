import { useState, useEffect, useCallback } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Car, User, Wrench, Download, FileSpreadsheet, DollarSign, Package, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  generateFinancialReport,
  generateMaintenanceReport,
  generateFleetReport,
  generateInventoryReport,
} from "@/lib/generateReportXLSX";

interface VehicleOption { id: string; plate: string; model: string }
interface RenterOption { id: string; name: string }

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [vehicleId, setVehicleId] = useState("all");
  const [renterId, setRenterId] = useState("all");
  const [serviceType, setServiceType] = useState("all");
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [renters, setRenters] = useState<RenterOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState("");

  const fetchOptions = useCallback(async () => {
    const [vRes, rRes, sRes] = await Promise.all([
      supabase.from("vehicles").select("id, plate, model").order("model"),
      supabase.from("profiles").select("user_id, full_name"),
      supabase.from("revisions").select("type"),
    ]);
    if (vRes.data) setVehicles(vRes.data.map((v) => ({ id: v.id, plate: v.plate, model: v.model })));
    if (rRes.data) setRenters(rRes.data.map((r) => ({ id: r.user_id, name: r.full_name })));
    if (sRes.data) {
      const unique = [...new Set(sRes.data.map((s: any) => s.type as string))];
      setServiceTypes(unique.sort());
    }
  }, []);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const handleFinancial = async () => {
    setLoading("financial");
    try {
      let query = supabase
        .from("payments")
        .select("vehicle_id, amount, due_date, paid_date, status, payment_type, renter_id")
        .gte("due_date", dateFrom)
        .lte("due_date", dateTo);
      if (vehicleId !== "all") query = query.eq("vehicle_id", vehicleId);
      if (renterId !== "all") query = query.eq("renter_id", renterId);

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with vehicle plates and renter names
      const vMap = Object.fromEntries(vehicles.map((v) => [v.id, v.plate]));
      const rMap = Object.fromEntries(renters.map((r) => [r.id, r.name]));

      await generateFinancialReport({
        payments: (data ?? []).map((p) => ({
          vehicle_plate: vMap[p.vehicle_id] ?? p.vehicle_id,
          renter_name: rMap[p.renter_id] ?? p.renter_id,
          amount: Number(p.amount),
          due_date: p.due_date,
          paid_date: p.paid_date,
          status: p.status,
          payment_type: p.payment_type,
        })),
        dateRange: { from: dateFrom, to: dateTo },
      });
      toast.success("Relatório financeiro gerado!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
    setLoading("");
  };

  const handleMaintenance = async () => {
    setLoading("maintenance");
    try {
      let query = supabase
        .from("revisions")
        .select("id, vehicle_id, type, scheduled_date, status, mechanic_notes, vehicle:vehicles(plate, model)")
        .gte("scheduled_date", dateFrom)
        .lte("scheduled_date", dateTo);
      if (vehicleId !== "all") query = query.eq("vehicle_id", vehicleId);
      if (serviceType !== "all") query = query.eq("type", serviceType);

      const { data: revData, error } = await query;
      if (error) throw error;

      const revIds = (revData ?? []).map((r: any) => r.id);
      let usageData: any[] = [];
      if (revIds.length > 0) {
        const { data } = await supabase
          .from("supply_usage")
          .select("revision_id, quantity_used, supply:supplies(name, unit, unit_cost)")
          .in("revision_id", revIds);
        usageData = data ?? [];
      }

      const usageByRev: Record<string, any[]> = {};
      usageData.forEach((u: any) => {
        if (!usageByRev[u.revision_id]) usageByRev[u.revision_id] = [];
        usageByRev[u.revision_id].push({
          name: u.supply?.name ?? "—",
          quantity: u.quantity_used,
          unit: u.supply?.unit ?? "",
          unit_cost: Number(u.supply?.unit_cost ?? 0),
        });
      });

      await generateMaintenanceReport({
        revisions: (revData as any[]).map((r) => ({
          vehicle_plate: r.vehicle?.plate ?? "",
          vehicle_model: r.vehicle?.model ?? "",
          type: r.type,
          scheduled_date: r.scheduled_date,
          status: r.status,
          mechanic_notes: r.mechanic_notes,
          parts: usageByRev[r.id] ?? [],
        })),
        dateRange: { from: dateFrom, to: dateTo },
      });
      toast.success("Relatório de manutenções gerado!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
    setLoading("");
  };

  const handleFleet = async () => {
    setLoading("fleet");
    try {
      let query = supabase.from("vehicles").select("id, plate, model, year, status, weekly_rate, current_mileage");
      if (vehicleId !== "all") query = query.eq("id", vehicleId);

      const { data: vData, error } = await query;
      if (error) throw error;

      // Get active assignments for renter names
      const vIds = (vData ?? []).map((v) => v.id);
      let assignments: any[] = [];
      if (vIds.length > 0) {
        const { data } = await supabase
          .from("vehicle_assignments")
          .select("vehicle_id, renter_id")
          .in("vehicle_id", vIds)
          .eq("is_active", true);
        assignments = data ?? [];
      }
      const rMap = Object.fromEntries(renters.map((r) => [r.id, r.name]));
      const assignMap = Object.fromEntries(assignments.map((a: any) => [a.vehicle_id, rMap[a.renter_id] ?? null]));

      await generateFleetReport({
        vehicles: (vData ?? []).map((v) => ({
          plate: v.plate,
          model: v.model,
          year: v.year,
          status: v.status,
          weekly_rate: Number(v.weekly_rate),
          current_mileage: v.current_mileage,
          renter_name: assignMap[v.id] ?? null,
        })),
      });
      toast.success("Relatório de frota gerado!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
    setLoading("");
  };

  const handleInventory = async () => {
    setLoading("inventory");
    try {
      const [supRes, usageRes] = await Promise.all([
        supabase.from("supplies").select("name, quantity, min_quantity, unit, unit_cost").order("name"),
        supabase.from("supply_usage").select("quantity_used, supply:supplies(name, unit)")
          .gte("created_at", dateFrom)
          .lte("created_at", dateTo + "T23:59:59"),
      ]);
      if (supRes.error) throw supRes.error;

      // Aggregate usage
      const usageAgg: Record<string, { total: number; unit: string }> = {};
      (usageRes.data ?? []).forEach((u: any) => {
        const name = u.supply?.name ?? "—";
        if (!usageAgg[name]) usageAgg[name] = { total: 0, unit: u.supply?.unit ?? "" };
        usageAgg[name].total += u.quantity_used;
      });

      await generateInventoryReport({
        supplies: (supRes.data ?? []).map((s) => ({
          name: s.name,
          quantity: s.quantity,
          min_quantity: s.min_quantity,
          unit: s.unit,
          unit_cost: Number(s.unit_cost),
        })),
        usage: Object.entries(usageAgg).map(([name, v]) => ({
          supply_name: name,
          total_used: v.total,
          unit: v.unit,
        })),
      });
      toast.success("Relatório de estoque gerado!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
    setLoading("");
  };

  const reports = [
    { key: "financial", label: "Financeiro", desc: "Receitas, pagamentos e inadimplência", icon: DollarSign, handler: handleFinancial, color: "text-emerald-500" },
    { key: "maintenance", label: "Manutenções", desc: "Revisões e peças utilizadas", icon: Wrench, handler: handleMaintenance, color: "text-blue-500" },
    { key: "fleet", label: "Frota", desc: "Status dos veículos e locações", icon: Car, handler: handleFleet, color: "text-amber-500" },
    { key: "inventory", label: "Estoque", desc: "Inventário e consumo de peças", icon: Package, handler: handleInventory, color: "text-purple-500" },
  ];

  return (
    <MobileLayout title="Relatórios">
      <div className="p-4 space-y-6">
        {/* Filters */}
        <section className="bg-card rounded-xl border border-border/50 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Filtros
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Car className="h-3 w-3" /> Veículo</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">{v.plate} — {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Locatário</Label>
              <Select value={renterId} onValueChange={setRenterId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  {renters.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Wrench className="h-3 w-3" /> Tipo de Serviço</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  {serviceTypes.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Report Cards */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Gerar Relatório</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reports.map((r) => (
              <button
                key={r.key}
                onClick={r.handler}
                disabled={!!loading}
                className="bg-card rounded-xl border border-border/50 p-4 text-left hover:border-primary/40 hover:shadow-md transition-all group disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-muted/50 ${r.color} group-hover:scale-110 transition-transform`}>
                    <r.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{r.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{r.desc}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {loading === r.key ? (
                      <span className="animate-pulse">Gerando...</span>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        XLSX
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
}
