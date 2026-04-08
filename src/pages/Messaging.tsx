import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
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
import { MessageSquare, Clock, Bell, AlertTriangle, Settings, Save, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
}

interface Config {
  id: string;
  sender_number: string;
  is_sandbox: boolean;
}

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
    if (tRes.data) setTemplates(tRes.data);
    if (cRes.data) setConfig(cRes.data);
    setLoading(false);
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
      // Save journeys
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

      // Save templates
      for (const t of templates) {
        const { error } = await supabase
          .from("whatsapp_templates")
          .update({
            template_name: t.template_name,
            template_body: t.template_body,
            is_active: t.is_active,
          })
          .eq("id", t.id);
        if (error) throw error;
      }

      // Save config
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
      <MobileLayout title="Mensageria">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Mensageria">
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

        <Tabs defaultValue="journeys">
          <TabsList className="w-full">
            <TabsTrigger value="journeys" className="flex-1">Jornadas</TabsTrigger>
            <TabsTrigger value="templates" className="flex-1">Templates</TabsTrigger>
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
              const meta = journey ? journeyLabels[journey.journey_type] : null;
              return (
                <Card key={template.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{meta?.label || template.template_name}</CardTitle>
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
                    <div>
                      <Label className="text-xs">Mensagem</Label>
                      <Textarea
                        value={template.template_body}
                        onChange={(e) => updateTemplate(template.id, "template_body", e.target.value)}
                        rows={4}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
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
    </MobileLayout>
  );
}
