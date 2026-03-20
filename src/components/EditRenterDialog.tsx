import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFleet, Vehicle } from "@/context/FleetContext";
import { UserPen } from "lucide-react";

interface EditRenterDialogProps {
  vehicle: Vehicle;
}

export function EditRenterDialog({ vehicle }: EditRenterDialogProps) {
  const { updateVehicle } = useFleet();
  const [open, setOpen] = useState(false);
  const [renterName, setRenterName] = useState(vehicle.renterName || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renterName.trim();
    updateVehicle(vehicle.id, {
      renterName: trimmed || undefined,
      status: trimmed ? "rented" : "available",
    });
    setOpen(false);
  };

  const handleRemoveRenter = () => {
    updateVehicle(vehicle.id, {
      renterName: undefined,
      status: "available",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setRenterName(vehicle.renterName || ""); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <UserPen className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Locatário — {vehicle.plate}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="renterName">Nome do Locatário</Label>
            <Input
              id="renterName"
              placeholder="Nome completo (vazio = disponível)"
              value={renterName}
              onChange={(e) => setRenterName(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            {vehicle.renterName && (
              <Button type="button" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleRemoveRenter}>
                Remover Locatário
              </Button>
            )}
            <Button type="submit" className="flex-1 gradient-primary text-primary-foreground">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
