import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFleet, Vehicle } from "@/context/FleetContext";
import { supabase } from "@/integrations/supabase/client";
import { UserPen, Upload, Loader2, FileCheck, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditRenterDialogProps {
  vehicle: Vehicle;
}

const frequencyLabels: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

export function EditRenterDialog({ vehicle }: EditRenterDialogProps) {
  const { updateVehicle } = useFleet();
  const [open, setOpen] = useState(false);
  const [renterName, setRenterName] = useState(vehicle.renterName || "");
  const [frequency, setFrequency] = useState("weekly");
  const [uploading, setUploading] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renterName.trim();

    // Upload contract if selected
    let contractUrl: string | undefined;
    if (contractFile) {
      setUploading(true);
      try {
        const ext = contractFile.name.split(".").pop();
        const path = `${vehicle.id}/contrato_${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("rental-contracts")
          .upload(path, contractFile, { upsert: true });
        if (error) throw error;
        contractUrl = path;
        toast.success("Contrato enviado com sucesso!");
      } catch (err: any) {
        toast.error("Erro ao enviar contrato: " + err.message);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    updateVehicle(vehicle.id, {
      renterName: trimmed || undefined,
      status: trimmed ? "rented" : "available",
    });

    // Update vehicle_assignments in Supabase with frequency and contract
    // This is a best-effort update for the assignment record
    if (trimmed) {
      try {
        // Find the active assignment for this vehicle
        const { data: assignments } = await supabase
          .from("vehicle_assignments")
          .select("id")
          .eq("vehicle_id", vehicle.id)
          .eq("is_active", true)
          .limit(1);

        if (assignments && assignments.length > 0) {
          await supabase
            .from("vehicle_assignments")
            .update({
              payment_frequency: frequency,
              ...(contractUrl ? { contract_url: contractUrl } : {}),
            })
            .eq("id", assignments[0].id);
        }
      } catch (err) {
        console.error("Error updating assignment:", err);
      }
    }

    setOpen(false);
  };

  const handleRemoveRenter = () => {
    updateVehicle(vehicle.id, {
      renterName: undefined,
      status: "available",
    });
    setOpen(false);
  };

  const handleOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v) {
      setRenterName(vehicle.renterName || "");
      setContractFile(null);
      // Load current assignment frequency
      try {
        const { data } = await supabase
          .from("vehicle_assignments")
          .select("payment_frequency, contract_url")
          .eq("vehicle_id", vehicle.id)
          .eq("is_active", true)
          .limit(1);
        if (data && data.length > 0) {
          setFrequency((data[0] as any).payment_frequency || "weekly");
        } else {
          setFrequency("weekly");
        }
      } catch {
        setFrequency("weekly");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

          <div className="space-y-1.5">
            <Label>Frequência de Pagamento</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quinzenal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Contrato de Locação</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setContractFile(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileRef.current?.click()}
            >
              {contractFile ? (
                <>
                  <FileCheck className="h-4 w-4 text-success" />
                  {contractFile.name.length > 30
                    ? contractFile.name.slice(0, 27) + "..."
                    : contractFile.name}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Anexar contrato (PDF/imagem)
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            {vehicle.renterName && (
              <Button type="button" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleRemoveRenter}>
                Remover Locatário
              </Button>
            )}
            <Button type="submit" className="flex-1 gradient-primary text-primary-foreground" disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
