import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Download, Loader2, Car, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VehicleDoc {
  id: string;
  plate: string;
  model: string;
  year: number;
  crlv_url: string | null;
  contract_url: string | null;
}

const frequencyLabels: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

export default function Documents() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchVehicles = async () => {
      // Get vehicles via RLS
      const { data: vehicleData, error: vErr } = await supabase
        .from("vehicles")
        .select("id, plate, model, year, crlv_url");

      if (vErr) {
        console.error(vErr);
        toast.error("Erro ao carregar veículos.");
        setLoading(false);
        return;
      }

      // Get assignments for contract URLs
      const { data: assignments } = await supabase
        .from("vehicle_assignments")
        .select("vehicle_id, contract_url, payment_frequency")
        .eq("renter_id", user.id)
        .eq("is_active", true);

      const assignmentMap = new Map(
        (assignments || []).map((a: any) => [a.vehicle_id, a])
      );

      const docs: VehicleDoc[] = (vehicleData || []).map((v: any) => {
        const assignment = assignmentMap.get(v.id);
        return {
          ...v,
          contract_url: assignment?.contract_url || null,
          payment_frequency: assignment?.payment_frequency || null,
        };
      });

      setVehicles(docs);
      setLoading(false);
    };
    fetchVehicles();
  }, [user]);

  const handleDownload = async (
    bucket: string,
    path: string,
    filename: string,
    itemId: string
  ) => {
    setDownloading(itemId);
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao baixar documento: " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AppLayout title="Documentos">
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Documentos dos veículos atribuídos a você.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Car className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum veículo atribuído.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{vehicle.model}</h3>
                    <p className="text-xs text-muted-foreground">{vehicle.plate} · {vehicle.year}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* CRLV */}
                  {vehicle.crlv_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() =>
                        handleDownload(
                          "vehicle-documents",
                          vehicle.crlv_url!,
                          `CRLV_${vehicle.plate}.${vehicle.crlv_url!.split(".").pop()}`,
                          `crlv-${vehicle.id}`
                        )
                      }
                      disabled={downloading === `crlv-${vehicle.id}`}
                    >
                      {downloading === `crlv-${vehicle.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      CRLV
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 px-2 py-1 bg-muted rounded-lg">
                      <FileText className="h-3.5 w-3.5" />
                      CRLV não disponível
                    </span>
                  )}

                  {/* Contrato */}
                  {vehicle.contract_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() =>
                        handleDownload(
                          "rental-contracts",
                          vehicle.contract_url!,
                          `Contrato_${vehicle.plate}.${vehicle.contract_url!.split(".").pop()}`,
                          `contract-${vehicle.id}`
                        )
                      }
                      disabled={downloading === `contract-${vehicle.id}`}
                    >
                      {downloading === `contract-${vehicle.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ScrollText className="h-3.5 w-3.5" />
                      )}
                      Contrato
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 px-2 py-1 bg-muted rounded-lg">
                      <ScrollText className="h-3.5 w-3.5" />
                      Contrato não disponível
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
