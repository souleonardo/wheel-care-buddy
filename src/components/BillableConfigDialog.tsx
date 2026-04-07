import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const allServiceTypes = [
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

interface Props {
  onUpdated?: () => void;
}

export function BillableConfigDialog({ onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [billable, setBillable] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) fetchBillable();
  }, [open]);

  const fetchBillable = async () => {
    const { data } = await supabase
      .from("billable_service_types")
      .select("service_type");
    if (data) {
      setBillable(new Set(data.map((d: any) => d.service_type)));
    }
  };

  const toggle = async (type: string) => {
    setLoading(true);
    if (billable.has(type)) {
      // Remove
      await supabase
        .from("billable_service_types")
        .delete()
        .eq("service_type", type);
      setBillable((prev) => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
      toast.success(`"${type}" não será mais cobrado`);
    } else {
      // Add
      const { error } = await supabase
        .from("billable_service_types")
        .insert({ service_type: type });
      if (error) {
        toast.error("Erro: " + error.message);
      } else {
        setBillable((prev) => new Set(prev).add(type));
        toast.success(`"${type}" agora gera cobrança`);
      }
    }
    setLoading(false);
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Tipos Cobráveis
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Configurar Cobranças</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Ative os tipos de serviço que geram fatura para o locador ao finalizar a revisão.
          </p>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {allServiceTypes.map((type) => (
            <div
              key={type}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-foreground">{type}</span>
              <Switch
                checked={billable.has(type)}
                onCheckedChange={() => toggle(type)}
                disabled={loading}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
