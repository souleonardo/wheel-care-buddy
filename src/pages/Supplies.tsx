import { useState, useEffect } from "react";
import { Package, Plus, Minus, AlertTriangle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MobileLayout } from "@/components/MobileLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Supply {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  min_quantity: number;
  unit: string;
  unit_cost: number;
  is_billable: boolean;
  is_labor_billable: boolean;
}

const unitLabels: Record<string, string> = {
  un: "Unidade",
  lt: "Litro",
  kg: "Quilograma",
  m: "Metro",
  pc: "Peça",
};

export default function Supplies() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);

  // New supply form
  const [form, setForm] = useState({ name: "", description: "", quantity: 0, min_quantity: 5, unit: "un", unit_cost: 0, is_billable: false, is_labor_billable: false });

  const fetchSupplies = async () => {
    const { data, error } = await supabase.from("supplies").select("*").order("name");
    if (error) { toast.error("Erro ao carregar suprimentos"); return; }
    setSupplies(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSupplies(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("supplies").insert({
      name: form.name,
      description: form.description || null,
      quantity: form.quantity,
      min_quantity: form.min_quantity,
      unit: form.unit,
      unit_cost: form.unit_cost,
      is_billable: form.is_billable,
      is_labor_billable: form.is_labor_billable,
    } as any);
    if (error) { toast.error("Erro ao adicionar suprimento"); return; }
    toast.success("Suprimento adicionado");
    setForm({ name: "", description: "", quantity: 0, min_quantity: 5, unit: "un", unit_cost: 0, is_billable: false, is_labor_billable: false });
    setAddOpen(false);
    fetchSupplies();
  };

  const handleAdjust = async (type: "add" | "remove") => {
    if (!selectedSupply) return;
    if (type === "remove") {
      // Use supply_usage to deduct via trigger
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("supply_usage").insert({
        supply_id: selectedSupply.id,
        quantity_used: adjustQty,
        used_by: user.id,
        notes: "Ajuste manual de estoque",
      });
      if (error) { toast.error("Erro ao registrar uso"); return; }
    } else {
      // Direct update for adding stock
      const { error } = await supabase
        .from("supplies")
        .update({ quantity: selectedSupply.quantity + adjustQty })
        .eq("id", selectedSupply.id);
      if (error) { toast.error("Erro ao atualizar estoque"); return; }
    }
    toast.success(type === "add" ? "Estoque adicionado" : "Uso registrado");
    setAdjustOpen(false);
    setAdjustQty(1);
    fetchSupplies();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("supplies").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Suprimento excluído");
    fetchSupplies();
  };

  const filtered = supplies.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = supplies.filter((s) => s.quantity <= s.min_quantity);

  return (
    <MobileLayout title="Estoque de Suprimentos">
      <div className="p-4 space-y-4">
        {/* Alert */}
        {lowStock.length > 0 && (
          <div className="bg-warning/15 text-warning rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold">{lowStock.length} item(ns) com estoque baixo</p>
              <p className="text-[11px] mt-0.5">{lowStock.map((s) => s.name).join(", ")}</p>
            </div>
          </div>
        )}

        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar suprimento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {isAdmin && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Suprimento</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Quantidade inicial</Label>
                      <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Qtd. mínima</Label>
                      <Input type="number" min={0} value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: +e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Unidade</Label>
                      <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(unitLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Custo unitário (R$)</Label>
                      <Input type="number" min={0} step={0.01} value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: +e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={handleAdd} className="w-full">Adicionar</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Summary */}
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg px-3 py-2 text-center bg-primary/15 text-primary">
            <p className="text-lg font-bold">{supplies.length}</p>
            <p className="text-[10px] font-medium">Itens</p>
          </div>
          <div className="flex-1 rounded-lg px-3 py-2 text-center bg-warning/15 text-warning">
            <p className="text-lg font-bold">{lowStock.length}</p>
            <p className="text-[10px] font-medium">Estoque Baixo</p>
          </div>
          <div className="flex-1 rounded-lg px-3 py-2 text-center bg-success/15 text-success">
            <p className="text-lg font-bold">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                supplies.reduce((sum, s) => sum + s.quantity * s.unit_cost, 0)
              )}
            </p>
            <p className="text-[10px] font-medium">Valor Total</p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum suprimento encontrado</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const isLow = s.quantity <= s.min_quantity;
              return (
                <div key={s.id} className="bg-card rounded-xl border border-border/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      isLow ? "bg-warning/15" : "bg-primary/15"
                    )}>
                      <Package className={cn("h-5 w-5", isLow ? "text-warning" : "text-primary")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
                        {isLow && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                            Baixo
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{s.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{s.quantity} {unitLabels[s.unit] || s.unit}</span>
                        <span>Mín: {s.min_quantity}</span>
                        <span>R$ {s.unit_cost.toFixed(2)}/{s.unit}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => { setSelectedSupply(s); setAdjustQty(1); setAdjustOpen(true); }}
                          className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                        >
                          Ajustar Estoque
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Adjust Dialog */}
        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajustar Estoque — {selectedSupply?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Estoque atual: <span className="font-semibold text-foreground">{selectedSupply?.quantity} {selectedSupply ? (unitLabels[selectedSupply.unit] || selectedSupply.unit) : ""}</span>
              </p>
              <div>
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={adjustQty} onChange={(e) => setAdjustQty(+e.target.value)} />
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <Button onClick={() => handleAdjust("add")} className="flex-1 gap-1">
                    <Plus className="h-4 w-4" /> Entrada
                  </Button>
                )}
                <Button onClick={() => handleAdjust("remove")} variant="outline" className="flex-1 gap-1">
                  <Minus className="h-4 w-4" /> Saída / Uso
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
