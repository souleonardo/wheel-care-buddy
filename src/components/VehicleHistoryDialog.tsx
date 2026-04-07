import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { History, Users, Wrench, Loader2, FileDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface VehicleHistoryDialogProps {
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
}

interface AssignmentHistory {
  id: string;
  renterName: string;
  assignedAt: string;
  releasedAt: string | null;
  isActive: boolean;
  frequency: string;
  contractUrl: string | null;
}

interface RevisionHistory {
  id: string;
  type: string;
  scheduledDate: string;
  status: string;
  notes: string | null;
  mechanicNotes: string | null;
  mileageAtService: number | null;
}

const frequencyLabels: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const statusLabels: Record<string, { label: string; class: string }> = {
  scheduled: { label: "Agendada", class: "bg-primary/15 text-primary" },
  in_progress: { label: "Em andamento", class: "bg-warning/15 text-warning" },
  completed: { label: "Concluída", class: "bg-success/15 text-success" },
  pending_approval: { label: "Pendente", class: "bg-muted text-muted-foreground" },
};

export function VehicleHistoryDialog({ vehicleId, vehiclePlate, vehicleModel }: VehicleHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentHistory[]>([]);
  const [revisions, setRevisions] = useState<RevisionHistory[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const fetchAll = async () => {
      const [assignRes, revRes] = await Promise.all([
        supabase
          .from("vehicle_assignments")
          .select("id, renter_id, assigned_at, released_at, is_active, payment_frequency, contract_url")
          .eq("vehicle_id", vehicleId)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("revisions")
          .select("id, type, scheduled_date, status, notes, mechanic_notes, mileage_at_service")
          .eq("vehicle_id", vehicleId)
          .order("scheduled_date", { ascending: false }),
      ]);

      // Map assignments — get renter names from profiles
      if (assignRes.data && assignRes.data.length > 0) {
        const renterIds = [...new Set(assignRes.data.map((a: any) => a.renter_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", renterIds);

        const nameMap = new Map<string, string>();
        profiles?.forEach((p: any) => nameMap.set(p.user_id, p.full_name));

        setAssignments(
          assignRes.data.map((a: any) => ({
            id: a.id,
            renterName: nameMap.get(a.renter_id) || "Desconhecido",
            assignedAt: a.assigned_at,
            releasedAt: a.released_at,
            isActive: a.is_active,
            frequency: a.payment_frequency,
            contractUrl: a.contract_url,
          }))
        );
      } else {
        setAssignments([]);
      }

      if (revRes.data) {
        setRevisions(
          revRes.data.map((r: any) => ({
            id: r.id,
            type: r.type,
            scheduledDate: r.scheduled_date,
            status: r.status,
            notes: r.notes,
            mechanicNotes: r.mechanic_notes,
            mileageAtService: r.mileage_at_service,
          }))
        );
      } else {
        setRevisions([]);
      }

      setLoading(false);
    };

    fetchAll();
  }, [open, vehicleId]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico — {vehicleModel} ({vehiclePlate})</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="renters" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="renters" className="flex-1 gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Locatários ({assignments.length})
              </TabsTrigger>
              <TabsTrigger value="revisions" className="flex-1 gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Manutenções ({revisions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="renters" className="overflow-y-auto flex-1 mt-2">
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum locatário registrado.</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div key={a.id} className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-foreground">{a.renterName}</span>
                        {a.isActive ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">Ativo</span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Encerrado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Início: {formatDate(a.assignedAt)}</span>
                        {a.releasedAt && <span>Fim: {formatDate(a.releasedAt)}</span>}
                        <span>{frequencyLabels[a.frequency] || a.frequency}</span>
                      </div>
                      {a.contractUrl && (
                        <button
                          onClick={async () => {
                            const { data } = await supabase.storage
                              .from("rental-contracts")
                              .createSignedUrl(a.contractUrl!, 300);
                            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                          }}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-1"
                        >
                          <FileDown className="h-3 w-3" />
                          Baixar contrato
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="revisions" className="overflow-y-auto flex-1 mt-2">
              {revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma manutenção registrada.</p>
              ) : (
                <div className="space-y-2">
                  {revisions.map((r) => {
                    const st = statusLabels[r.status] || { label: r.status, class: "bg-muted text-muted-foreground" };
                    return (
                      <div key={r.id} className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-foreground">{r.type}</span>
                          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", st.class)}>{st.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatDate(r.scheduledDate)}</span>
                          {r.mileageAtService && <span>{r.mileageAtService.toLocaleString("pt-BR")} km</span>}
                        </div>
                        {r.mechanicNotes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{r.mechanicNotes}"</p>
                        )}
                        {r.notes && !r.mechanicNotes && (
                          <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
