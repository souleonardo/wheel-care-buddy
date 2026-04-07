import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Supply {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
}

interface UsageItem {
  supplyId: string;
  supplyName: string;
  unit: string;
  quantityUsed: number;
  maxQuantity: number;
}

interface AddedItem {
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
}

interface AddSupplyUsageDialogProps {
  revisionId: string;
  revisionLabel: string;
  onUsageAdded?: (items: AddedItem[]) => void;
}

export function AddSupplyUsageDialog({ revisionId, revisionLabel, onUsageAdded }: AddSupplyUsageDialogProps) {
  const [open, setOpen] = useState(false);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [items, setItems] = useState<UsageItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (open) {
      fetchSupplies();
    }
  }, [open]);

  const fetchSupplies = async () => {
    const { data } = await supabase
      .from("supplies")
      .select("id, name, quantity, unit")
      .gt("quantity", 0)
      .order("name");
    if (data) setSupplies(data);
  };

  const addItem = () => {
    const supply = supplies.find((s) => s.id === selectedSupply);
    if (!supply) return;
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }
    // Check if already added
    const existing = items.find((i) => i.supplyId === selectedSupply);
    const alreadyUsed = existing ? existing.quantityUsed : 0;
    if (qty + alreadyUsed > supply.quantity) {
      toast.error(`Estoque insuficiente. Disponível: ${supply.quantity - alreadyUsed} ${supply.unit}`);
      return;
    }

    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.supplyId === selectedSupply
            ? { ...i, quantityUsed: i.quantityUsed + qty }
            : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          supplyId: supply.id,
          supplyName: supply.name,
          unit: supply.unit,
          quantityUsed: qty,
          maxQuantity: supply.quantity,
        },
      ]);
    }
    setSelectedSupply("");
    setQuantity("");
  };

  const removeItem = (supplyId: string) => {
    setItems((prev) => prev.filter((i) => i.supplyId !== supplyId));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Adicione ao menos um item");
      return;
    }
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      toast.error("Usuário não autenticado");
      setLoading(false);
      return;
    }

    // Check if revisionId is a valid UUID before passing it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validRevisionId = uuidRegex.test(revisionId) ? revisionId : null;

    const rows = items.map((item) => ({
      supply_id: item.supplyId,
      revision_id: validRevisionId,
      quantity_used: item.quantityUsed,
      used_by: userId,
      notes: notes || null,
    }));

    const { error } = await supabase.from("supply_usage").insert(rows);
    if (error) {
      toast.error("Erro ao registrar itens: " + error.message);
      setLoading(false);
      return;
    }

    toast.success("Itens registrados com sucesso!");
    const addedItems = items.map((item) => ({
      name: item.supplyName,
      unit: item.unit,
      quantity: item.quantityUsed,
      unitCost: supplies.find((s) => s.id === item.supplyId)?.unit_cost ?? 0,
    }));
    setItems([]);
    setNotes("");
    setOpen(false);
    setLoading(false);
    onUsageAdded?.(addedItems);
  };

  const availableSupplies = supplies.filter(
    (s) => !items.find((i) => i.supplyId === s.id)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-accent/50 text-accent-foreground hover:bg-accent/70 transition-colors flex items-center gap-1">
          <Package className="h-3 w-3" />
          Registrar Peças
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Peças Utilizadas</DialogTitle>
          <p className="text-xs text-muted-foreground">{revisionLabel}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add item row */}
          <div className="space-y-2">
            <Label className="text-xs">Adicionar Item do Estoque</Label>
            <div className="flex gap-2">
              <Select value={selectedSupply} onValueChange={setSelectedSupply}>
                <SelectTrigger className="flex-1 h-9 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSupplies.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} ({s.quantity} {s.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Qtd"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-20 h-9 text-xs"
                min={1}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addItem}
                disabled={!selectedSupply || !quantity}
                className="h-9 px-2"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Itens Adicionados</Label>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div
                    key={item.supplyId}
                    className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
                  >
                    <div className="text-xs">
                      <span className="font-medium text-foreground">{item.supplyName}</span>
                      <span className="text-muted-foreground ml-2">
                        {item.quantityUsed} {item.unit}
                      </span>
                    </div>
                    <button
                      onClick={() => removeItem(item.supplyId)}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="usage-notes" className="text-xs">Observações</Label>
            <Textarea
              id="usage-notes"
              placeholder="Detalhes sobre a substituição..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              rows={2}
              className="text-xs"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className="w-full gradient-primary text-primary-foreground"
          >
            {loading ? "Salvando..." : "Confirmar Registro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
