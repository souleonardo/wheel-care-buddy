import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wrench } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisionLabel: string;
  onConfirm: (data: { amount: number; description: string }) => void;
  onSkip: () => void;
}

export function LaborChargeDialog({ open, onOpenChange, revisionLabel, onConfirm, onSkip }: Props) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Mão de obra");
  const [confirmSkip, setConfirmSkip] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    onConfirm({ amount: val, description: description.trim() || "Mão de obra" });
    setAmount("");
    setDescription("Mão de obra");
    onOpenChange(false);
  };

  const handleSkip = () => {
    setAmount("");
    setDescription("Mão de obra");
    onSkip();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            Lançar Mão de Obra
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{revisionLabel}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="labor-amount" className="text-xs">Valor (R$) *</Label>
            <Input
              id="labor-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="labor-desc" className="text-xs">Descrição</Label>
            <Textarea
              id="labor-desc"
              placeholder="Ex: Mão de obra mecânica geral"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleSkip} className="flex-1 text-xs">
              Sem mão de obra
            </Button>
            <Button
              type="submit"
              disabled={!amount || parseFloat(amount.replace(",", ".")) <= 0}
              className="flex-1 gradient-primary text-primary-foreground text-xs"
            >
              Lançar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
