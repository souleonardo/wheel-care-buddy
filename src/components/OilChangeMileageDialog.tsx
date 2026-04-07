import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const kmRangeOptions = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];

interface OilChangeMileageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleModel: string;
  vehiclePlate: string;
  revisionId: string;
  onConfirm: () => void;
}

export function OilChangeMileageDialog({
  open,
  onOpenChange,
  vehicleId,
  vehicleModel,
  vehiclePlate,
  revisionId,
  onConfirm,
}: OilChangeMileageDialogProps) {
  const [currentKm, setCurrentKm] = useState("");
  const [selectedRange, setSelectedRange] = useState("");
  const [loading, setLoading] = useState(false);

  const nextOilChangeKm = useMemo(() => {
    const km = Number(currentKm);
    const range = Number(selectedRange);
    if (km > 0 && range > 0) return km + range;
    return 0;
  }, [currentKm, selectedRange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const km = Number(currentKm);

    if (!km || km <= 0) {
      toast.error("Informe a quilometragem atual");
      return;
    }
    if (!nextOilChangeKm) {
      toast.error("Selecione o intervalo da próxima troca");
      return;
    }

    setLoading(true);

    // Update vehicle mileage
    await supabase
      .from("vehicles")
      .update({
        current_mileage: km,
        next_oil_change_km: nextOilChangeKm,
        last_oil_change_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", vehicleId);

    // Update revision with mileage info
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(revisionId)) {
      await supabase
        .from("revisions")
        .update({
          mileage_at_service: km,
          next_oil_change_km: nextOilChangeKm,
        })
        .eq("id", revisionId);
    }

    toast.success("Quilometragem registrada!");
    setLoading(false);
    setCurrentKm("");
    setSelectedRange("");
    onOpenChange(false);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Registro de Troca de Óleo</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {vehicleModel} — {vehiclePlate}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentKm" className="text-xs">Quilometragem Atual (km)</Label>
            <Input
              id="currentKm"
              type="number"
              placeholder="Ex: 45000"
              value={currentKm}
              onChange={(e) => setCurrentKm(e.target.value)}
              min={1}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Intervalo até a Próxima Troca</Label>
            <Select value={selectedRange} onValueChange={setSelectedRange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o intervalo..." />
              </SelectTrigger>
              <SelectContent>
                {kmRangeOptions.map((km) => (
                  <SelectItem key={km} value={String(km)} className="text-xs">
                    +{km.toLocaleString("pt-BR")} km
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentKm && nextOilChangeKm > 0 && (
              <div className="bg-muted/50 rounded-lg px-3 py-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  Próxima troca em: <span className="font-bold text-foreground">{nextOilChangeKm.toLocaleString("pt-BR")} km</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  (atual {Number(currentKm).toLocaleString("pt-BR")} + {Number(selectedRange).toLocaleString("pt-BR")} km)
                </p>
              </div>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
            {loading ? "Salvando..." : "Confirmar e Concluir"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
