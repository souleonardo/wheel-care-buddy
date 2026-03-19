import { MobileLayout } from "@/components/MobileLayout";
import { vehicles } from "@/data/mockData";
import { Car, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  available: { label: "Disponível", class: "bg-success/15 text-success" },
  rented: { label: "Alugado", class: "bg-primary/15 text-primary" },
  maintenance: { label: "Manutenção", class: "bg-warning/15 text-warning" },
};

export default function Vehicles() {
  return (
    <MobileLayout title="Veículos">
      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="flex gap-2">
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

        {/* Vehicle List */}
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
                  <span className={cn("text-[10px] font-medium px-2.5 py-1 rounded-full", config.class)}>
                    {config.label}
                  </span>
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
