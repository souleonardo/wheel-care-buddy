import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFleet } from "@/context/FleetContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const ALL_TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00",
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
    scheduledTime: "",
    notes: "",
  });
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);

  const fetchBookedSlots = useCallback(async (date: string) => {
    if (!date) {
      setBookedSlots([]);
      return;
    }
    setLoadingSlots(true);
    const { data } = await supabase
      .from("revisions")
      .select("scheduled_time")
      .eq("scheduled_date", date)
      .not("status", "in", '("completed","rejected")')
      .not("scheduled_time", "is", null);

    setBookedSlots((data ?? []).map((r: any) => r.scheduled_time as string));
    setLoadingSlots(false);
  }, []);

  useEffect(() => {
    if (form.scheduledDate) {
      fetchBookedSlots(form.scheduledDate);
      setForm((f) => ({ ...f, scheduledTime: "" }));
    }
  }, [form.scheduledDate, fetchBookedSlots]);

  const availableSlots = ALL_TIME_SLOTS.filter((slot) => !bookedSlots.includes(slot));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId || !form.type || !form.scheduledDate || !form.scheduledTime || !selectedVehicle) return;

    addRevision({
      vehicleId: form.vehicleId,
      vehiclePlate: selectedVehicle.plate,
      vehicleModel: selectedVehicle.model,
      type: form.type,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      status: isLocatario ? "pending_approval" : "scheduled",
      notes: form.notes || undefined,
    });

    toast.success(isLocatario ? "Solicitação de revisão enviada para aprovação!" : "Revisão agendada!");
    setForm({ vehicleId: "", type: "", scheduledDate: "", scheduledTime: "", notes: "" });
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
            <Input
              id="scheduledDate"
              type="date"
              value={form.scheduledDate}
              onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          {/* Time slot selection */}
          {form.scheduledDate && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Horário
              </Label>
              {loadingSlots ? (
                <p className="text-xs text-muted-foreground py-2">Carregando horários...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-destructive py-2">Todos os horários estão ocupados nesta data. Escolha outra data.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {ALL_TIME_SLOTS.map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    const isSelected = form.scheduledTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setForm((f) => ({ ...f, scheduledTime: slot }))}
                        className={cn(
                          "text-xs py-1.5 px-1 rounded-lg border transition-all font-medium",
                          isBooked
                            ? "bg-muted/50 text-muted-foreground/40 border-border/30 cursor-not-allowed line-through"
                            : isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-card text-foreground border-border/50 hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" placeholder="Observações adicionais..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} maxLength={200} rows={2} />
          </div>
          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground"
            disabled={!form.scheduledTime}
          >
            {isLocatario ? "Solicitar Revisão" : "Agendar Revisão"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
