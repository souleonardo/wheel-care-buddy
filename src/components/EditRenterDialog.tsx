import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

interface LocadorOption {
  userId: string;
  fullName: string;
}

const frequencyLabels: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

export function EditRenterDialog({ vehicle }: EditRenterDialogProps) {
  const { updateVehicle, refreshVehicles } = useFleet();
  const [open, setOpen] = useState(false);
  const [selectedRenterId, setSelectedRenterId] = useState("");
  const [locadores, setLocadores] = useState<LocadorOption[]>([]);
  const [frequency, setFrequency] = useState("weekly");
  const [uploading, setUploading] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [paymentStartDate, setPaymentStartDate] = useState<Date | undefined>(undefined);
  const [loadingLocadores, setLoadingLocadores] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchLocadores = async () => {
    setLoadingLocadores(true);
    try {
      // Get all users with locador role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "locador");

      if (roles && roles.length > 0) {
        const userIds = roles.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        if (profiles) {
          setLocadores(
            profiles.map((p) => ({ userId: p.user_id, fullName: p.full_name }))
              .sort((a, b) => a.fullName.localeCompare(b.fullName))
          );
        }
      } else {
        setLocadores([]);
      }
    } catch (err) {
      console.error("Error fetching locadores:", err);
    }
    setLoadingLocadores(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRenterId) {
      toast.error("Selecione um locatário cadastrado");
      return;
    }

    if (!paymentStartDate) {
      toast.error("Selecione a data de início do pagamento");
      return;
    }

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

    try {
      // Deactivate any existing active assignment for this vehicle
      await supabase
        .from("vehicle_assignments")
        .update({ is_active: false, released_at: new Date().toISOString() })
        .eq("vehicle_id", vehicle.id)
        .eq("is_active", true);

      // Create new assignment
      const { error } = await supabase.from("vehicle_assignments").insert({
        vehicle_id: vehicle.id,
        renter_id: selectedRenterId,
        payment_frequency: frequency,
        payment_start_date: format(paymentStartDate, "yyyy-MM-dd"),
        ...(contractUrl ? { contract_url: contractUrl } : {}),
      });

      if (error) throw error;

      // Update vehicle status
      const renter = locadores.find((l) => l.userId === selectedRenterId);
      updateVehicle(vehicle.id, {
        renterName: renter?.fullName,
        status: "rented",
      });

      toast.success("Locatário atribuído com sucesso!");
      setOpen(false);
      refreshVehicles();
    } catch (err: any) {
      toast.error("Erro ao atribuir locatário: " + err.message);
    }
  };

  const handleRemoveRenter = async () => {
    try {
      // Deactivate assignment
      await supabase
        .from("vehicle_assignments")
        .update({ is_active: false, released_at: new Date().toISOString() })
        .eq("vehicle_id", vehicle.id)
        .eq("is_active", true);

      updateVehicle(vehicle.id, {
        renterName: undefined,
        status: "available",
      });

      toast.success("Locatário removido");
      setOpen(false);
      refreshVehicles();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v) {
      setContractFile(null);
      setSelectedRenterId("");
      await fetchLocadores();

      // Load current assignment
      try {
        const { data } = await supabase
          .from("vehicle_assignments")
          .select("renter_id, payment_frequency, contract_url, payment_start_date")
          .eq("vehicle_id", vehicle.id)
          .eq("is_active", true)
          .limit(1);

        if (data && data.length > 0) {
          setSelectedRenterId(data[0].renter_id);
          setFrequency(data[0].payment_frequency || "weekly");
          const startDate = data[0].payment_start_date;
          setPaymentStartDate(startDate ? new Date(startDate + "T00:00:00") : undefined);
        } else {
          setFrequency("weekly");
          setPaymentStartDate(undefined);
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
            <Label>Locatário</Label>
            {loadingLocadores ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : locadores.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum locatário cadastrado. Cadastre um usuário com perfil "Locador" primeiro.
              </p>
            ) : (
              <Select value={selectedRenterId} onValueChange={setSelectedRenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um locatário..." />
                </SelectTrigger>
                <SelectContent>
                  {locadores.map((l) => (
                    <SelectItem key={l.userId} value={l.userId}>
                      {l.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <Label>Data de Início do Pagamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentStartDate
                    ? format(paymentStartDate, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentStartDate}
                  onSelect={setPaymentStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
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
            <Button
              type="submit"
              className="flex-1 gradient-primary text-primary-foreground"
              disabled={uploading || !selectedRenterId || locadores.length === 0}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
