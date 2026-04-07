import { useEffect, useState } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Download, Loader2, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VehicleDoc {
  id: string;
  plate: string;
  model: string;
  year: number;
  crlv_url: string | null;
}

export default function Documents() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchVehicles = async () => {
      // Locador can only see vehicles assigned to them (via RLS)
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate, model, year, crlv_url");

      if (error) {
        console.error(error);
        toast.error("Erro ao carregar veículos.");
      }
      setVehicles((data as any as VehicleDoc[]) || []);
      setLoading(false);
    };
    fetchVehicles();
  }, [user]);

  const handleDownload = async (vehicle: VehicleDoc) => {
    if (!vehicle.crlv_url) return;
    setDownloading(vehicle.id);
    try {
      const { data, error } = await supabase.storage
        .from("vehicle-documents")
        .download(vehicle.crlv_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CRLV_${vehicle.plate}.${vehicle.crlv_url.split(".").pop()}`;
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
    <MobileLayout title="Documentos">
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
              <div key={vehicle.id} className="bg-card rounded-xl border border-border/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{vehicle.model}</h3>
                    <p className="text-xs text-muted-foreground">{vehicle.plate} · {vehicle.year}</p>
                  </div>
                  {vehicle.crlv_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleDownload(vehicle)}
                      disabled={downloading === vehicle.id}
                    >
                      {downloading === vehicle.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      CRLV
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Sem documento
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
