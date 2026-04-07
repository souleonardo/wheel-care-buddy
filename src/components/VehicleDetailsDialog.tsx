import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Info, Loader2, Plus, CircleDollarSign, CheckCircle2, AlertTriangle, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface VehicleDetailsDialogProps {
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  onUpdated?: () => void;
}

interface VehicleInfo {
  chassis: string | null;
  renavam: string | null;
  entry_date: string | null;
  year: number;
  model: string;
  plate: string;
  created_at: string;
}

interface Debt {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: string;
  source: string;
}

export function VehicleDetailsDialog({ vehicleId, vehiclePlate, vehicleModel, onUpdated }: VehicleDetailsDialogProps) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<VehicleInfo | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showDebts, setShowDebts] = useState(false);

  // Editable fields (admin only)
  const [chassis, setChassis] = useState("");
  const [renavam, setRenavam] = useState("");
  const [entryDate, setEntryDate] = useState("");

  // New debt form
  const [showNewDebt, setShowNewDebt] = useState(false);
  const [newDebt, setNewDebt] = useState({ description: "", amount: "", due_date: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [vehRes, debtRes] = await Promise.all([
      supabase
        .from("vehicles")
        .select("chassis, renavam, entry_date, year, model, plate, created_at")
        .eq("id", vehicleId)
        .single(),
      supabase
        .from("vehicle_debts")
        .select("id, description, amount, due_date, status, source")
        .eq("vehicle_id", vehicleId)
        .order("due_date", { ascending: false }),
    ]);

    if (vehRes.data) {
      const v = vehRes.data as any;
      setInfo(v);
      setChassis(v.chassis || "");
      setRenavam(v.renavam || "");
      setEntryDate(v.entry_date || "");
    }

    setDebts((debtRes.data as Debt[]) || []);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const handleSaveInfo = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("vehicles")
      .update({
        chassis: chassis || null,
        renavam: renavam || null,
        entry_date: entryDate || null,
      } as any)
      .eq("id", vehicleId);
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Dados do veículo atualizados");
    onUpdated?.();
  };

  const handleAddDebt = async () => {
    if (!newDebt.description || !newDebt.amount) return;
    const { error } = await supabase.from("vehicle_debts").insert({
      vehicle_id: vehicleId,
      description: newDebt.description,
      amount: parseFloat(newDebt.amount),
      due_date: newDebt.due_date || null,
      source: "manual",
    } as any);

    if (error) {
      toast.error("Erro ao adicionar débito: " + error.message);
      return;
    }
    toast.success("Débito adicionado");
    setNewDebt({ description: "", amount: "", due_date: "" });
    setShowNewDebt(false);
    fetchData();
  };

  const handleToggleDebtStatus = async (debt: Debt) => {
    const newStatus = debt.status === "pending" ? "paid" : "pending";
    const { error } = await supabase
      .from("vehicle_debts")
      .update({ status: newStatus } as any)
      .eq("id", debt.id);

    if (error) {
      toast.error("Erro ao atualizar débito");
      return;
    }
    setDebts((prev) => prev.map((d) => (d.id === debt.id ? { ...d, status: newStatus } : d)));
  };

  const handleDeleteDebt = async (debtId: string) => {
    const { error } = await supabase.from("vehicle_debts").delete().eq("id", debtId);
    if (error) {
      toast.error("Erro ao remover débito");
      return;
    }
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
    toast.success("Débito removido");
  };

  const pendingDebts = debts.filter((d) => d.status === "pending");
  const totalPending = pendingDebts.reduce((s, d) => s + Number(d.amount), 0);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
    } catch {
      return d;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalhes — {vehicleModel} ({vehiclePlate})</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : info ? (
          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {/* Vehicle Info */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Características</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Ano/Modelo</p>
                  <p className="text-sm font-semibold text-foreground">{info.year} / {info.model}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Placa</p>
                  <p className="text-sm font-semibold text-foreground">{info.plate}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Entrada no Estoque</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(info.entry_date) !== "—" ? formatDate(info.entry_date) : formatDate(info.created_at?.split("T")[0])}
                  </p>
                </div>
              </div>

              {isAdmin ? (
                <div className="space-y-2 border border-border/50 rounded-lg p-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Chassi</Label>
                    <Input
                      value={chassis}
                      onChange={(e) => setChassis(e.target.value.toUpperCase())}
                      placeholder="Ex: 9BWZZZ377VT004251"
                      className="h-8 text-xs font-mono"
                      maxLength={17}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">RENAVAM</Label>
                    <Input
                      value={renavam}
                      onChange={(e) => setRenavam(e.target.value.replace(/\D/g, ""))}
                      placeholder="Ex: 00123456789"
                      className="h-8 text-xs font-mono"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data de Entrada</Label>
                    <Input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button size="sm" className="w-full gap-1.5 h-8 text-xs" onClick={handleSaveInfo} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Salvar Dados
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground font-medium">Chassi</p>
                    <p className="text-sm font-semibold text-foreground font-mono">{info.chassis || "—"}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground font-medium">RENAVAM</p>
                    <p className="text-sm font-semibold text-foreground font-mono">{info.renavam || "—"}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Debts Section */}
            <section className="space-y-3">
              <button
                onClick={() => setShowDebts(!showDebts)}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CircleDollarSign className="h-3.5 w-3.5" />
                  Débitos
                </h3>
                <div className="flex items-center gap-2">
                  {pendingDebts.length > 0 ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                      {pendingDebts.length} pendente{pendingDebts.length > 1 ? "s" : ""} · R$ {totalPending.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">
                      Sem débitos
                    </span>
                  )}
                </div>
              </button>

              {showDebts && (
                <div className="space-y-2">
                  {debts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum débito registrado.</p>
                  ) : (
                    debts.map((debt) => (
                      <div key={debt.id} className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                        <button
                          onClick={() => isAdmin && handleToggleDebtStatus(debt)}
                          disabled={!isAdmin}
                          className={cn(
                            "shrink-0 h-7 w-7 rounded-full flex items-center justify-center",
                            debt.status === "paid"
                              ? "bg-success/15 text-success"
                              : "bg-destructive/15 text-destructive"
                          )}
                        >
                          {debt.status === "paid" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{debt.description}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-semibold">R$ {Number(debt.amount).toFixed(2)}</span>
                            {debt.due_date && <span>· Venc.: {formatDate(debt.due_date)}</span>}
                            {debt.source === "api" && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-info/15 text-info font-medium">API</span>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteDebt(debt.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}

                  {/* Add Debt (admin only) */}
                  {isAdmin && !showNewDebt && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      onClick={() => setShowNewDebt(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar Débito
                    </Button>
                  )}

                  {isAdmin && showNewDebt && (
                    <div className="border border-border/50 rounded-lg p-3 space-y-2">
                      <Input
                        placeholder="Descrição (ex: IPVA 2026)"
                        value={newDebt.description}
                        onChange={(e) => setNewDebt((f) => ({ ...f, description: e.target.value }))}
                        className="h-8 text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Valor (R$)"
                          value={newDebt.amount}
                          onChange={(e) => setNewDebt((f) => ({ ...f, amount: e.target.value }))}
                          className="h-8 text-xs"
                        />
                        <Input
                          type="date"
                          placeholder="Vencimento"
                          value={newDebt.due_date}
                          onChange={(e) => setNewDebt((f) => ({ ...f, due_date: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAddDebt} disabled={!newDebt.description || !newDebt.amount}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewDebt(false)}>
                          Cancelar
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        💡 Futuramente, débitos poderão ser importados automaticamente via API do DETRAN.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
