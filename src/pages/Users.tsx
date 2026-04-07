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
import { Plus, UserPlus, Loader2, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";

type CreateRole = "locador" | "mecanico";
type AppRole = "admin" | "locador" | "mecanico";

interface UserWithRole {
  user_id: string;
  full_name: string;
  role: AppRole | null;
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
  });

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rErr) throw rErr;

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role as AppRole]));

      setUsers(
        (profiles ?? []).map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          role: roleMap.get(p.user_id) ?? null,
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

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Usuário ${form.fullName} criado como ${form.role === "locador" ? "Locador" : "Mecânico"}!`);
      setForm({ email: "", password: "", fullName: "", role: "locador" });
      setOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setLoading(false);
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
                  <CardContent className="flex items-center justify-between p-3">
                    <span className="text-sm font-medium truncate">{u.full_name}</span>
                    {badge && (
                      <Badge variant={badge.variant} className="shrink-0 ml-2">
                        {badge.label}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
