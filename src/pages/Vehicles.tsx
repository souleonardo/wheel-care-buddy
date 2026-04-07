import { useState } from "react";
import { useFleet } from "@/context/FleetContext";
import { MobileLayout } from "@/components/MobileLayout";
import { AddVehicleDialog } from "@/components/AddVehicleDialog";
import { EditRenterDialog } from "@/components/EditRenterDialog";
import { UploadCRLVButton } from "@/components/UploadCRLVButton";
import { VehicleHistoryDialog } from "@/components/VehicleHistoryDialog";
import { Car, User, Calendar, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const statusConfig = {
  available: { label: "Disponível", class: "bg-success/15 text-success" },
  rented: { label: "Alugado", class: "bg-primary/15 text-primary" },
  maintenance: { label: "Manutenção", class: "bg-warning/15 text-warning" },
};

export default function Vehicles() {
  const { vehicles, removeVehicle, refreshVehicles } = useFleet();

  return (
    <MobileLayout title="Veículos">
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
                      onUploaded={() => refreshVehicles()}
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
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
}
