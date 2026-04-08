import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

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
  template_body: string;
  is_active: boolean;
}

interface WhatsAppConfig {
  sender_number: string;
  is_sandbox: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch config
    const { data: configData } = await adminClient
      .from("whatsapp_config")
      .select("*")
      .limit(1)
      .single();

    if (!configData?.sender_number) {
      return new Response(
        JSON.stringify({ error: "Número remetente não configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const config: WhatsAppConfig = configData;

    // Fetch active journeys
    const { data: journeys } = await adminClient
      .from("whatsapp_journeys")
      .select("*")
      .eq("is_active", true);

    if (!journeys || journeys.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma jornada ativa", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch active templates
    const { data: templates } = await adminClient
      .from("whatsapp_templates")
      .select("*")
      .eq("is_active", true);

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum template ativo", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

    let totalSent = 0;
    const errors: string[] = [];

    for (const journey of journeys as Journey[]) {
      const template = (templates as Template[]).find(
        (t) => t.journey_id === journey.id
      );
      if (!template) continue;

      let invoicesToProcess: any[] = [];

      if (journey.journey_type === "reminder_d1") {
        // Invoices due tomorrow
        const { data } = await adminClient
          .from("payments")
          .select("id, renter_id, vehicle_id, amount, due_date, status")
          .eq("status", "pending")
          .eq("due_date", tomorrowStr);
        invoicesToProcess = data || [];

        // Also check traffic violations due tomorrow
        const { data: violations } = await adminClient
          .from("traffic_violations")
          .select("id, renter_id, vehicle_id, amount, due_date, status")
          .eq("status", "pending")
          .eq("due_date", tomorrowStr);
        if (violations) invoicesToProcess.push(...violations);

      } else if (journey.journey_type === "due_date") {
        // Invoices due today
        const { data } = await adminClient
          .from("payments")
          .select("id, renter_id, vehicle_id, amount, due_date, status")
          .eq("status", "pending")
          .eq("due_date", todayStr);
        invoicesToProcess = data || [];

        const { data: violations } = await adminClient
          .from("traffic_violations")
          .select("id, renter_id, vehicle_id, amount, due_date, status")
          .eq("status", "pending")
          .eq("due_date", todayStr);
        if (violations) invoicesToProcess.push(...violations);

      } else if (journey.journey_type === "overdue") {
        // Overdue invoices
        const { data } = await adminClient
          .from("payments")
          .select("id, renter_id, vehicle_id, amount, due_date, status")
          .eq("status", "pending")
          .lt("due_date", todayStr);
        invoicesToProcess = data || [];

        const { data: violations } = await adminClient
          .from("traffic_violations")
          .select("id, renter_id, vehicle_id, amount, due_date, status")
          .eq("status", "pending")
          .lt("due_date", todayStr);
        if (violations) invoicesToProcess.push(...violations);

        // Filter by retry interval: only send if days overdue is multiple of retry_interval_days
        if (journey.retry_interval_days > 0) {
          invoicesToProcess = invoicesToProcess.filter((inv) => {
            const dueDate = new Date(inv.due_date);
            const daysOverdue = Math.floor(
              (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            return (
              daysOverdue > 0 &&
              daysOverdue % journey.retry_interval_days === 0 &&
              (journey.max_retries === 0 ||
                daysOverdue / journey.retry_interval_days <= journey.max_retries)
            );
          });
        }
      }

      // Group by renter to avoid duplicate messages
      const renterMap = new Map<string, typeof invoicesToProcess>();
      for (const inv of invoicesToProcess) {
        const existing = renterMap.get(inv.renter_id) || [];
        existing.push(inv);
        renterMap.set(inv.renter_id, existing);
      }

      for (const [renterId, invoices] of renterMap) {
        try {
          // Fetch renter profile
          const { data: profile } = await adminClient
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", renterId)
            .single();

          if (!profile?.phone) {
            errors.push(`Renter ${renterId}: sem número de WhatsApp`);
            continue;
          }

          // Get vehicle info for first invoice
          const { data: vehicle } = await adminClient
            .from("vehicles")
            .select("plate")
            .eq("id", invoices[0].vehicle_id)
            .single();

          const totalAmount = invoices.reduce(
            (sum: number, inv: any) => sum + Number(inv.amount),
            0
          );
          const dueDateFormatted = formatDate(invoices[0].due_date);

          // Replace template variables
          const messageBody = template.template_body
            .replace("{nome}", profile.full_name)
            .replace("{valor}", totalAmount.toFixed(2).replace(".", ","))
            .replace("{vencimento}", dueDateFormatted)
            .replace("{placa}", vehicle?.plate || "N/A");

          // Build status callback URL
          const statusCallbackUrl = `${supabaseUrl}/functions/v1/whatsapp-status-webhook`;

          // Send via Twilio gateway
          const toNumber = `whatsapp:${profile.phone}`;
          const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": TWILIO_API_KEY,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: toNumber,
              From: config.sender_number,
              Body: messageBody,
              StatusCallback: statusCallbackUrl,
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            // Log failed message
            await adminClient.from("whatsapp_message_logs").insert({
              renter_id: renterId,
              journey_type: journey.journey_type,
              phone: profile.phone,
              message_body: messageBody,
              status: "failed",
              error_message: JSON.stringify(result),
            });
            errors.push(
              `Twilio error for ${profile.full_name}: ${JSON.stringify(result)}`
            );
          } else {
            // Log successful message
            await adminClient.from("whatsapp_message_logs").insert({
              renter_id: renterId,
              journey_type: journey.journey_type,
              phone: profile.phone,
              message_body: messageBody,
              twilio_sid: result.sid,
              status: result.status || "queued",
            });
            totalSent++;
            console.log(
              `Message sent to ${profile.full_name} (${toNumber}): SID ${result.sid}`
            );
          }
        } catch (e: any) {
          errors.push(`Error sending to renter ${renterId}: ${e.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processamento concluído`,
        sent: totalSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("WhatsApp billing error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}
