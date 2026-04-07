import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFleet } from "@/context/FleetContext";
import { useAuth } from "@/hooks/useAuth";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const serviceTypes = [
  "Troca de óleo",
  "Revisão completa",
  "Alinhamento e balanceamento",
  "Troca de pastilhas de freio",
  "Troca de pneus",
  "Revisão elétrica",
  "Troca de correia",
  "Suspensão",
  "Outro",
];

export function AddRevisionDialog() {
  const { vehicles, addRevision } = useFleet();
  const { role } = useAuth();
  const isLocatario = role === "locador";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    vehicleId: "",
    type: "",
    scheduledDate: "",
    notes: "",
  });

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId || !form.type || !form.scheduledDate || !selectedVehicle) return;

    addRevision({
      vehicleId: form.vehicleId,
      vehiclePlate: selectedVehicle.plate,
      vehicleModel: selectedVehicle.model,
      type: form.type,
      scheduledDate: form.scheduledDate,
      status: isLocatario ? "pending_approval" : "scheduled",
      notes: form.notes || undefined,
    });

    toast.success(isLocatario ? "Solicitação de revisão enviada para aprovação!" : "Revisão agendada!");
    setForm({ vehicleId: "", type: "", scheduledDate: "", notes: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5">
          <Plus className="h-4 w-4" />
          Agendar Revisão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isLocatario ? "Solicitar Revisão" : "Agendar Revisão"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Veículo</Label>
            <Select value={form.vehicleId} onValueChange={(v) => setForm((f) => ({ ...f, vehicleId: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.model} — {v.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de Serviço</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
              <SelectContent>
                {serviceTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheduledDate">Data Agendada</Label>
            <Input id="scheduledDate" type="date" value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" placeholder="Observações adicionais..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} maxLength={200} rows={2} />
          </div>
          <Button type="submit" className="w-full gradient-primary text-primary-foreground">{isLocatario ? "Solicitar Revisão" : "Agendar Revisão"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
