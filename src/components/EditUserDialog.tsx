import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

type AppRole = "admin" | "locador" | "mecanico";

interface UserData {
  user_id: string;
  full_name: string;
  role: AppRole | null;
  email?: string;
  cpf?: string | null;
  cnh_number?: string | null;
  cnh_expiry_date?: string | null;
  phone?: string | null;
}

interface EditUserDialogProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditUserDialog({ user, open, onOpenChange, onSaved }: EditUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    cpf: "",
    cnhNumber: "",
    cnhExpiryDate: "",
    phone: "",
    role: "" as AppRole,
  });

  useEffect(() => {
    if (user && open) {
      setForm({
        fullName: user.full_name ?? "",
        email: user.email ?? "",
        cpf: user.cpf ?? "",
        cnhNumber: user.cnh_number ?? "",
        cnhExpiryDate: user.cnh_expiry_date ?? "",
        phone: user.phone ?? "",
        role: user.role ?? "locador",
      });
    }
  }, [user, open]);

  const handleSave = async () => {
    if (!user || !form.fullName.trim()) return;

    setLoading(true);
    try {
      // 1. Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: form.fullName.trim(),
          cpf: form.cpf.trim() || null,
          cnh_number: form.cnhNumber.trim() || null,
          cnh_expiry_date: form.cnhExpiryDate || null,
          phone: form.phone.trim() || null,
        })
        .eq("user_id", user.user_id);

      if (profileError) throw profileError;

      // 2. Update role if changed
      if (form.role && form.role !== user.role) {
        if (user.role) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .update({ role: form.role })
            .eq("user_id", user.user_id);
          if (roleError) throw roleError;
        } else {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: user.user_id, role: form.role });
          if (roleError) throw roleError;
        }
      }

      // 3. Update email if changed (via edge function)
      if (form.email.trim() && form.email.trim() !== user.email) {
        const { data, error } = await supabase.functions.invoke("manage-users", {
          body: {
            action: "update_email",
            userId: user.user_id,
            newEmail: form.email.trim(),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      toast.success("Dados do usuário atualizados!");
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar usuário");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Usuário
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Perfil de acesso</Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="locador">Locatário</SelectItem>
                <SelectItem value="mecanico">Mecânico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>CPF</Label>
            <Input
              value={form.cpf}
              onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Validade da CNH</Label>
            <Input
              type="date"
              value={form.cnhExpiryDate}
              onChange={(e) => setForm((f) => ({ ...f, cnhExpiryDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Número da CNH</Label>
            <Input
              value={form.cnhNumber}
              onChange={(e) => setForm((f) => ({ ...f, cnhNumber: e.target.value }))}
              placeholder="Número do registro"
              maxLength={20}
            />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+5511999999999"
              maxLength={20}
            />
          </div>
          <Button
            className="w-full gradient-primary text-primary-foreground"
            disabled={loading || !form.fullName.trim()}
            onClick={handleSave}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
