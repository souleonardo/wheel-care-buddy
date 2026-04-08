import { useState } from "react";
import { useFleet, Vehicle } from "@/context/FleetContext";
import { AppLayout } from "@/components/AppLayout";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { EditRenterDialog } from "@/components/EditRenterDialog";
import { UploadCRLVButton } from "@/components/UploadCRLVButton";
import { VehicleDetailsDialog } from "@/components/VehicleDetailsDialog";
import { VehicleHistoryDialog } from "@/components/VehicleHistoryDialog";
import { Car, User, Calendar, Trash2, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const statusConfig = {
  available: { label: "Disponível", class: "bg-success/15 text-success" },
  rented: { label: "Alugado", class: "bg-primary/15 text-primary" },
  maintenance: { label: "Manutenção", class: "bg-warning/15 text-warning" },
};

function getCrlvStatus(expiryDate?: string): { label: string; icon: typeof ShieldCheck; colorClass: string } | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T00:00:00");
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "CRLV Vencido", icon: ShieldX, colorClass: "text-destructive bg-destructive/10" };
  }
  if (diffDays <= 30) {
    return { label: `CRLV vence em ${diffDays}d`, icon: ShieldAlert, colorClass: "text-warning bg-warning/10" };
  }
  return { label: "CRLV Válido", icon: ShieldCheck, colorClass: "text-success bg-success/10" };
}

function CrlvExpiryEditor({ vehicle, onSaved }: { vehicle: Vehicle; onSaved: () => void }) {
  const [date, setDate] = useState(vehicle.crlvExpiryDate || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    const { error } = await supabase
      .from("vehicles")
      .update({ crlv_expiry_date: date } as any)
      .eq("id", vehicle.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar validade");
      return;
    }
    toast.success("Validade do CRLV atualizada");
    onSaved();
  };

  return (
    <div className="space-y-2 p-1">
      <Label className="text-xs">Validade do CRLV</Label>
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="h-8 text-xs"
      />
      <Button size="sm" className="w-full h-7 text-xs" onClick={handleSave} disabled={saving || !date}>
        {saving ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}

export default function Vehicles() {
  const { vehicles, removeVehicle, refreshVehicles } = useFleet();

  return (
    <AppLayout title="Veículos">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-1">
            {(["available", "rented", "maintenance"] as const).map((status) => {
              const count = vehicles.filter((v) => v.status === status).length;
              const config = statusConfig[status];
              return (
                <div key={status} className={cn("flex-1 rounded-lg px-3 py-2 text-center", config.class)}>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] font-medium">{config.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <AddVehicleDialog />
        </div>

        <div className="space-y-3">
          {vehicles.map((vehicle) => {
            const config = statusConfig[vehicle.status];
            const crlvStatus = getCrlvStatus(vehicle.crlvExpiryDate);
            return (
              <div key={vehicle.id} className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{vehicle.model}</h3>
                    <p className="text-sm text-muted-foreground">{vehicle.plate} · {vehicle.year}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <UploadCRLVButton
                      vehicleId={vehicle.id}
                      vehiclePlate={vehicle.plate}
                      hasCrlv={!!vehicle.crlvUrl}
                      crlvUrl={vehicle.crlvUrl}
                      onUploaded={() => refreshVehicles()}
                    />
                    <VehicleDetailsDialog
                      vehicleId={vehicle.id}
                      vehiclePlate={vehicle.plate}
                      vehicleModel={vehicle.model}
                      onUpdated={refreshVehicles}
                    />
                    <VehicleHistoryDialog
                      vehicleId={vehicle.id}
                      vehiclePlate={vehicle.plate}
                      vehicleModel={vehicle.model}
                    />
                    <EditRenterDialog vehicle={vehicle} />
                    <span className={cn("text-[10px] font-medium px-2.5 py-1 rounded-full", config.class)}>
                      {config.label}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover veículo</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover o veículo <strong>{vehicle.model}</strong> ({vehicle.plate}) da frota? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => removeVehicle(vehicle.id)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5" />
                    <span>R$ {vehicle.weeklyRate}/sem</span>
                  </div>
                  {vehicle.renterName && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>{vehicle.renterName}</span>
                    </div>
                  )}
                  {vehicle.nextRevision && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(vehicle.nextRevision).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}

                  {/* CRLV Status */}
                  <Popover>
                    <PopoverTrigger asChild>
                      {crlvStatus ? (
                        <button className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", crlvStatus.colorClass)}>
                          <crlvStatus.icon className="h-3 w-3" />
                          {crlvStatus.label}
                        </button>
                      ) : (
                        <button className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground bg-muted/50">
                          <ShieldAlert className="h-3 w-3" />
                          Definir CRLV
                        </button>
                      )}
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" align="start">
                      <CrlvExpiryEditor vehicle={vehicle} onSaved={refreshVehicles} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
