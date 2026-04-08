import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MessageSquare, Clock, Bell, AlertTriangle, Settings, Save, Eye, History,
  RefreshCw, CheckCheck, Check, Send, XCircle, Loader2, Upload, FileCheck,
  Trash2, AlertCircle, ShieldCheck,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Journey {
  id: string;
  journey_type: string;
  is_active: boolean;
  retry_interval_days: number;
  max_retries: number;
  send_hour: number;
}

interface Template {
  id: string;
  journey_id: string;
  template_name: string;
  template_body: string;
  is_active: boolean;
  meta_status: string;
  meta_template_sid: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  category: string;
  language: string;
}

interface Config {
  id: string;
  sender_number: string;
  is_sandbox: boolean;
}

interface MessageLog {
  id: string;
  renter_id: string;
  journey_type: string;
  phone: string;
  message_body: string;
  twilio_sid: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
  status_updated_at: string;
  renter_name?: string;
}

const statusConfig: Record<string, { label: string; icon: typeof Check; color: string }> = {
  queued: { label: "Na fila", icon: Clock, color: "text-muted-foreground" },
  sent: { label: "Enviada", icon: Send, color: "text-blue-500" },
  delivered: { label: "Entregue", icon: Check, color: "text-green-500" },
  read: { label: "Lida", icon: CheckCheck, color: "text-green-600" },
  failed: { label: "Falhou", icon: XCircle, color: "text-destructive" },
  undelivered: { label: "Não entregue", icon: XCircle, color: "text-orange-500" },
};

const metaStatusConfig: Record<string, { label: string; icon: typeof Check; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", icon: AlertCircle, variant: "secondary" },
  pending: { label: "Em análise", icon: Clock, variant: "outline" },
  approved: { label: "Aprovado", icon: ShieldCheck, variant: "default" },
  rejected: { label: "Rejeitado", icon: XCircle, variant: "destructive" },
  failed: { label: "Falha", icon: XCircle, variant: "destructive" },
};

const journeyLabels: Record<string, { label: string; description: string; icon: typeof Bell }> = {
  reminder_d1: {
    label: "Lembrete D-1",
    description: "Enviado 1 dia antes do vencimento da fatura",
    icon: Bell,
  },
  due_date: {
    label: "Dia do Vencimento",
    description: "Enviado no dia do vencimento da fatura",
    icon: Clock,
  },
  overdue: {
    label: "Fatura Vencida",
    description: "Reiterações para faturas em atraso",
    icon: AlertTriangle,
  },
};

const variablesList = [
  { var: "{nome}", desc: "Nome do locatário" },
  { var: "{valor}", desc: "Valor da fatura" },
  { var: "{vencimento}", desc: "Data de vencimento" },
  { var: "{placa}", desc: "Placa do veículo" },
];

export default function Messaging() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBody, setPreviewBody] = useState("");
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [jRes, tRes, cRes] = await Promise.all([
      supabase.from("whatsapp_journeys").select("*").order("journey_type"),
      supabase.from("whatsapp_templates").select("*"),
      supabase.from("whatsapp_config").select("*").limit(1).single(),
    ]);
    if (jRes.data) setJourneys(jRes.data);
    if (tRes.data) setTemplates(tRes.data as unknown as Template[]);
    if (cRes.data) setConfig(cRes.data);
    setLoading(false);
  }

  async function fetchLogs() {
    setLogsLoading(true);
    let query = supabase
      .from("whatsapp_message_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(100);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    if (data) {
      const renterIds = [...new Set(data.map((l) => l.renter_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", renterIds);

      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);
      setLogs(data.map((l) => ({ ...l, renter_name: nameMap.get(l.renter_id) || "Desconhecido" })));
    }
    setLogsLoading(false);
  }

  function updateJourney(id: string, field: keyof Journey, value: unknown) {
    setJourneys((prev) =>
      prev.map((j) => (j.id === id ? { ...j, [field]: value } : j))
    );
  }

  function updateTemplate(id: string, field: keyof Template, value: unknown) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  }

  async function saveAll() {
    setSaving(true);
    try {
      for (const j of journeys) {
        const { error } = await supabase
          .from("whatsapp_journeys")
          .update({
            is_active: j.is_active,
            retry_interval_days: j.retry_interval_days,
            max_retries: j.max_retries,
            send_hour: j.send_hour,
          })
          .eq("id", j.id);
        if (error) throw error;
      }

      for (const t of templates) {
        const { error } = await supabase
          .from("whatsapp_templates")
          .update({
            template_name: t.template_name,
            template_body: t.template_body,
            is_active: t.is_active,
            category: t.category,
            language: t.language,
          } as any)
          .eq("id", t.id);
        if (error) throw error;
      }

      if (config) {
        const { error } = await supabase
          .from("whatsapp_config")
          .update({
            sender_number: config.sender_number,
            is_sandbox: config.is_sandbox,
          })
          .eq("id", config.id);
        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitToMeta(templateId: string) {
    setSubmitting(templateId);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates", {
        body: { action: "submit", templateId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Template submetido para aprovação da Meta!");
      await fetchAll();
    } catch (e: any) {
      toast.error("Erro ao submeter: " + e.message);
    } finally {
      setSubmitting(null);
    }
  }

  async function checkMetaStatus(templateId: string) {
    setSubmitting(templateId);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates", {
        body: { action: "check_status", templateId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Status: ${data.status}`);
      await fetchAll();
    } catch (e: any) {
      toast.error("Erro ao verificar: " + e.message);
    } finally {
      setSubmitting(null);
    }
  }

  async function resetTemplate(templateId: string) {
    setSubmitting(templateId);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates", {
        body: { action: "delete", templateId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Template resetado para rascunho");
      await fetchAll();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSubmitting(null);
    }
  }

  function showPreview(body: string) {
    const preview = body
      .replace("{nome}", "João Silva")
      .replace("{valor}", "450,00")
      .replace("{vencimento}", "15/04/2026")
      .replace("{placa}", "ABC-1D23");
    setPreviewBody(preview);
    setPreviewOpen(true);
  }

  if (loading) {
    return (
      <AppLayout title="Mensageria">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mensageria">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              WhatsApp
            </h2>
            <p className="text-sm text-muted-foreground">Configure jornadas e templates de cobrança</p>
          </div>
          <Button onClick={saveAll} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <Tabs defaultValue="journeys" onValueChange={(v) => { if (v === "history") fetchLogs(); }}>
          <TabsList className="w-full">
            <TabsTrigger value="journeys" className="flex-1">Jornadas</TabsTrigger>
            <TabsTrigger value="templates" className="flex-1">Templates</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
            <TabsTrigger value="config" className="flex-1">Config</TabsTrigger>
          </TabsList>

          {/* JORNADAS */}
          <TabsContent value="journeys" className="space-y-3 mt-3">
            {journeys.map((journey) => {
              const meta = journeyLabels[journey.journey_type];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <Card key={journey.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">{meta.label}</CardTitle>
                      </div>
                      <Switch
                        checked={journey.is_active}
                        onCheckedChange={(v) => updateJourney(journey.id, "is_active", v)}
                      />
                    </div>
                    <CardDescription className="text-xs">{meta.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Horário de envio</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={journey.send_hour}
                          onChange={(e) => updateJourney(journey.id, "send_hour", parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-xs text-muted-foreground">h (0-23)</span>
                      </div>
                    </div>
                    {journey.journey_type === "overdue" && (
                      <>
                        <div>
                          <Label className="text-xs">Intervalo entre reiterações (dias)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={journey.retry_interval_days}
                            onChange={(e) => updateJourney(journey.id, "retry_interval_days", parseInt(e.target.value) || 1)}
                            className="w-20 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Máximo de reiterações</Label>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={journey.max_retries}
                            onChange={(e) => updateJourney(journey.id, "max_retries", parseInt(e.target.value) || 1)}
                            className="w-20 mt-1"
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* TEMPLATES */}
          <TabsContent value="templates" className="space-y-3 mt-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-2">Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-1.5">
                  {variablesList.map((v) => (
                    <Badge key={v.var} variant="secondary" className="text-xs font-mono">
                      {v.var} <span className="font-sans ml-1 opacity-70">= {v.desc}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {templates.map((template) => {
              const journey = journeys.find((j) => j.id === template.journey_id);
              const journeyMeta = journey ? journeyLabels[journey.journey_type] : null;
              const metaSt = metaStatusConfig[template.meta_status] || metaStatusConfig.draft;
              const MetaIcon = metaSt.icon;
              const isSubmitting = submitting === template.id;

              return (
                <Card key={template.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{journeyMeta?.label || template.template_name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={metaSt.variant} className="text-[10px] gap-1">
                            <MetaIcon className="h-3 w-3" />
                            {metaSt.label}
                          </Badge>
                          {template.submitted_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(template.submitted_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => showPreview(template.template_body)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={(v) => updateTemplate(template.id, "is_active", v)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Nome do template</Label>
                      <Input
                        value={template.template_name}
                        onChange={(e) => updateTemplate(template.id, "template_name", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Categoria</Label>
                        <Select
                          value={template.category}
                          onValueChange={(v) => updateTemplate(template.id, "category", v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="utility">Utilidade</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="authentication">Autenticação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Idioma</Label>
                        <Select
                          value={template.language}
                          onValueChange={(v) => updateTemplate(template.id, "language", v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt_BR">Português (BR)</SelectItem>
                            <SelectItem value="en_US">English (US)</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Mensagem</Label>
                      <Textarea
                        value={template.template_body}
                        onChange={(e) => updateTemplate(template.id, "template_body", e.target.value)}
                        rows={4}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>

                    {template.rejection_reason && (
                      <div className="bg-destructive/10 text-destructive text-xs rounded-md p-2.5 flex gap-2">
                        <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{template.rejection_reason}</span>
                      </div>
                    )}

                    {/* Meta actions */}
                    <div className="flex gap-2 pt-1">
                      {(template.meta_status === "draft" || template.meta_status === "rejected" || template.meta_status === "failed") && (
                        <Button
                          size="sm"
                          onClick={() => submitToMeta(template.id)}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 mr-1" />
                          )}
                          Submeter à Meta
                        </Button>
                      )}
                      {(template.meta_status === "pending") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => checkMetaStatus(template.id)}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <FileCheck className="h-3.5 w-3.5 mr-1" />
                          )}
                          Verificar Status
                        </Button>
                      )}
                      {template.meta_template_sid && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resetTemplate(template.id)}
                          disabled={isSubmitting}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {template.meta_template_sid && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        SID: {template.meta_template_sid}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* CONFIG */}
          <TabsContent value="config" className="space-y-3 mt-3">
            {config && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    Configurações Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Número Remetente (Twilio)</Label>
                    <Input
                      value={config.sender_number}
                      onChange={(e) => setConfig({ ...config, sender_number: e.target.value })}
                      placeholder="whatsapp:+14155238886"
                      className="mt-1"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Para sandbox: whatsapp:+14155238886
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs">Modo Sandbox</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Ativar para testes com número pessoal
                      </p>
                    </div>
                    <Switch
                      checked={config.is_sandbox}
                      onCheckedChange={(v) => setConfig({ ...config, is_sandbox: v })}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* HISTÓRICO */}
          <TabsContent value="history" className="space-y-3 mt-3">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="queued">Na fila</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="read">Lida</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                  <SelectItem value="undelivered">Não entregue</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
                <RefreshCw className={`h-4 w-4 ${logsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {logsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem encontrada</p>
                </CardContent>
              </Card>
            ) : (
              logs.map((log) => {
                const st = statusConfig[log.status] || statusConfig.queued;
                const StatusIcon = st.icon;
                const journeyMeta = journeyLabels[log.journey_type];
                return (
                  <Card key={log.id}>
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{log.renter_name}</span>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`h-3.5 w-3.5 ${st.color}`} />
                          <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {journeyMeta && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {journeyMeta.label}
                          </Badge>
                        )}
                        <span>{log.phone}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{log.message_body}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Enviado: {format(new Date(log.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        {log.status_updated_at !== log.sent_at && (
                          <span>Atualizado: {format(new Date(log.status_updated_at), "HH:mm")}</span>
                        )}
                      </div>
                      {log.error_message && (
                        <p className="text-[10px] text-destructive bg-destructive/10 rounded p-1.5">{log.error_message}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Preview da Mensagem</DialogTitle>
          </DialogHeader>
          <div className="bg-[hsl(var(--muted))] rounded-lg p-4">
            <div className="bg-[hsl(var(--card))] rounded-lg p-3 shadow-sm max-w-[280px] ml-auto">
              <p className="text-sm whitespace-pre-wrap">{previewBody}</p>
              <p className="text-[10px] text-muted-foreground text-right mt-1">09:00</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
