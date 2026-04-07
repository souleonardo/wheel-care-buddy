import { useState, useEffect, useCallback } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Plus, UserPlus, Loader2, Users as UsersIcon, KeyRound, Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type CreateRole = "locador" | "mecanico";
type AppRole = "admin" | "locador" | "mecanico";

interface UserWithRole {
  user_id: string;
  full_name: string;
  role: AppRole | null;
  email?: string;
  lastSignIn?: string | null;
  cpf?: string | null;
  cnh_number?: string | null;
}

const roleBadge: Record<AppRole, { label: string; variant: "default" | "secondary" | "outline" }> = {
  admin: { label: "Administrador", variant: "default" },
  locador: { label: "Locador", variant: "secondary" },
  mecanico: { label: "Mecânico", variant: "outline" },
};

export default function Users() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "locador" as CreateRole,
    cpf: "",
    cnhNumber: "",
    cnhExpiryDate: "",
  });

  // Reset password state
  const [resetDialogUser, setResetDialogUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      // Fetch profiles and roles
      const [profilesRes, rolesRes, authUsersRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, cpf, cnh_number").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.functions.invoke("manage-users", { body: { action: "list" } }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const roleMap = new Map(rolesRes.data?.map((r) => [r.user_id, r.role as AppRole]));

      // Map auth users for email/last sign in
      const authMap = new Map<string, { email: string; lastSignIn: string | null }>();
      if (authUsersRes.data?.users) {
        for (const u of authUsersRes.data.users) {
          authMap.set(u.id, { email: u.email, lastSignIn: u.last_sign_in_at });
        }
      }

      setUsers(
        (profilesRes.data ?? []).map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          role: roleMap.get(p.user_id) ?? null,
          email: authMap.get(p.user_id)?.email,
          lastSignIn: authMap.get(p.user_id)?.lastSignIn,
          cpf: p.cpf,
          cnh_number: p.cnh_number,
        }))
      );
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.fullName) return;

    if (form.role === "locador") {
      if (!form.cpf.trim()) {
        toast.error("CPF é obrigatório para locadores");
        return;
      }
      if (!form.cnhExpiryDate) {
        toast.error("Validade da CNH é obrigatória para locadores");
        return;
      }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          ...(form.role === "locador" ? {
            cpf: form.cpf.trim(),
            cnhNumber: form.cnhNumber.trim() || undefined,
            cnhExpiryDate: form.cnhExpiryDate || undefined,
          } : {}),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Usuário ${form.fullName} criado como ${form.role === "locador" ? "Locador" : "Mecânico"}!`);
      setForm({ email: "", password: "", fullName: "", role: "locador", cpf: "", cnhNumber: "", cnhExpiryDate: "" });
      setOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetDialogUser || !newPassword) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "reset_password",
          userId: resetDialogUser.user_id,
          newPassword,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Senha de ${resetDialogUser.full_name} atualizada!`);
      setResetDialogUser(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao resetar senha");
    } finally {
      setResetting(false);
    }
  };

  const formatLastSignIn = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Nunca";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <MobileLayout title="Usuários">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5">
                <Plus className="h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Criar Usuário
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Nome do usuário"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@email.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="text"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Perfil de acesso</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as CreateRole }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="locador">Locador</SelectItem>
                      <SelectItem value="mecanico">Mecânico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.role === "locador" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                        maxLength={14}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cnhExpiry">Validade da CNH *</Label>
                      <Input
                        id="cnhExpiry"
                        type="date"
                        value={form.cnhExpiryDate}
                        onChange={(e) => setForm((f) => ({ ...f, cnhExpiryDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cnhNumber">Número da CNH (opcional)</Label>
                      <Input
                        id="cnhNumber"
                        placeholder="Número do registro"
                        value={form.cnhNumber}
                        onChange={(e) => setForm((f) => ({ ...f, cnhNumber: e.target.value }))}
                        maxLength={20}
                      />
                    </div>
                  </>
                )}
                <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar Usuário
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <UsersIcon className="h-10 w-10" />
            <p className="text-sm">Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const badge = u.role ? roleBadge[u.role] : null;
              return (
                <Card key={u.user_id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{u.full_name}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {badge && (
                          <Badge variant={badge.variant}>
                            {badge.label}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setResetDialogUser(u);
                            setNewPassword("");
                          }}
                          title="Resetar senha"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {u.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </div>
                      )}
                      {u.cpf && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium shrink-0">CPF:</span>
                          <span>{u.cpf}</span>
                        </div>
                      )}
                      {u.cnh_number && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium shrink-0">CNH:</span>
                          <span>{u.cnh_number}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>Último acesso: {formatLastSignIn(u.lastSignIn)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetDialogUser} onOpenChange={(v) => { if (!v) setResetDialogUser(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Resetar Senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Definir nova senha para <strong>{resetDialogUser?.full_name}</strong>
              {resetDialogUser?.email && (
                <span className="block text-xs mt-0.5">{resetDialogUser.email}</span>
              )}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="text"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                autoFocus
              />
            </div>
            <Button
              className="w-full gradient-primary text-primary-foreground"
              disabled={resetting || newPassword.length < 6}
              onClick={handleResetPassword}
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Atualizar Senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
