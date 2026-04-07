import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisionLabel: string;
  onConfirm: (notes: string) => void;
}

export function MechanicNotesDialog({ open, onOpenChange, revisionLabel, onConfirm }: Props) {
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    onConfirm(notes.trim());
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Observação Obrigatória</DialogTitle>
          <p className="text-xs text-muted-foreground">{revisionLabel}</p>
        </DialogHeader>
        <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-xs text-warning font-medium">
            Nenhuma peça foi registrada nesta manutenção. Descreva o que foi realizado (ou não).
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mechanic-notes" className="text-xs">Descrição do serviço *</Label>
            <Textarea
              id="mechanic-notes"
              placeholder="Ex: Realizado apenas diagnóstico, sem necessidade de troca de peças..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              minLength={10}
              maxLength={500}
              rows={4}
            />
            <p className="text-[10px] text-muted-foreground text-right">{notes.length}/500</p>
          </div>
          <Button type="submit" disabled={notes.trim().length < 10} className="w-full gradient-primary text-primary-foreground">
            Confirmar e Concluir
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
