import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFleet } from "@/context/FleetContext";
import { Plus } from "lucide-react";
import type { Vehicle } from "@/context/FleetContext";

export function AddVehicleDialog() {
  const { addVehicle } = useFleet();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    plate: "",
    model: "",
    year: new Date().getFullYear().toString(),
    weeklyRate: "",
    status: "available" as Vehicle["status"],
    renterName: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plate || !form.model || !form.weeklyRate) return;

    addVehicle({
      plate: form.plate.toUpperCase(),
      model: form.model,
      year: parseInt(form.year),
      weeklyRate: parseFloat(form.weeklyRate),
      status: form.status,
      renterName: form.status === "rented" ? form.renterName : undefined,
    });

    setForm({ plate: "", model: "", year: new Date().getFullYear().toString(), weeklyRate: "", status: "available", renterName: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Veículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plate">Placa</Label>
              <Input id="plate" placeholder="ABC-1234" value={form.plate} onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))} required maxLength={8} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Ano</Label>
              <Input id="year" type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} required min={2000} max={2030} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">Modelo</Label>
            <Input id="model" placeholder="Toyota Corolla" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} required maxLength={50} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="weeklyRate">Valor Semanal (R$)</Label>
              <Input id="weeklyRate" type="number" placeholder="800" value={form.weeklyRate} onChange={(e) => setForm((f) => ({ ...f, weeklyRate: e.target.value }))} required min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Vehicle["status"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="rented">Alugado</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.status === "rented" && (
            <div className="space-y-1.5">
              <Label htmlFor="renterName">Nome do Locatário</Label>
              <Input id="renterName" placeholder="Nome completo" value={form.renterName} onChange={(e) => setForm((f) => ({ ...f, renterName: e.target.value }))} maxLength={100} />
            </div>
          )}
          <Button type="submit" className="w-full gradient-primary text-primary-foreground">Cadastrar Veículo</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
