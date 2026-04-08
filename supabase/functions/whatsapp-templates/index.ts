import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

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

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await adminClient.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: hasAdmin } = await adminClient.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!hasAdmin) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { action, templateId } = await req.json();

    if (action === "submit") {
      return await submitTemplate(adminClient, templateId, LOVABLE_API_KEY, TWILIO_API_KEY);
    } else if (action === "check_status") {
      return await checkStatus(adminClient, templateId, LOVABLE_API_KEY, TWILIO_API_KEY);
    } else if (action === "delete") {
      return await deleteTemplate(adminClient, templateId, LOVABLE_API_KEY, TWILIO_API_KEY);
    } else if (action === "list_remote") {
      return await listRemoteTemplates(LOVABLE_API_KEY, TWILIO_API_KEY);
    } else {
      return new Response(
        JSON.stringify({ error: "Ação inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("Template API error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function submitTemplate(
  adminClient: any,
  templateId: string,
  lovableKey: string,
  twilioKey: string,
) {
  // Fetch template from DB
  const { data: template, error } = await adminClient
    .from("whatsapp_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error || !template) {
    return jsonResponse({ error: "Template não encontrado" }, 404);
  }

  // Create content via Twilio Content API
  // The gateway prepends /2010-04-01/Accounts/{AccountSid}
  // But Content API is at content.twilio.com/v1/Content — different base
  // We'll use the messaging service templates endpoint instead
  // For WhatsApp templates, Twilio uses /v1/Content which goes through content.twilio.com
  // Since gateway only proxies api.twilio.com, we construct the content body
  // and use the Messaging endpoint to create a content template

  const contentBody = {
    friendly_name: template.template_name,
    language: template.language || "pt_BR",
    types: {
      "twilio/text": {
        body: template.template_body,
      },
    },
    variables: buildVariables(template.template_body),
  };

  // Try Content API through gateway (path: content/v1/Content)
  const response = await fetch(`${GATEWAY_URL}/Content`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(contentBody),
  });

  const result = await response.json();

  if (!response.ok) {
    // Update template status
    await adminClient
      .from("whatsapp_templates")
      .update({
        meta_status: "failed",
        rejection_reason: JSON.stringify(result),
      })
      .eq("id", templateId);

    return jsonResponse(
      { error: "Erro ao submeter template", details: result },
      response.status
    );
  }

  // Update template with SID and status
  await adminClient
    .from("whatsapp_templates")
    .update({
      meta_template_sid: result.sid,
      meta_status: "pending",
      submitted_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", templateId);

  // Submit for WhatsApp approval
  if (result.sid) {
    const approvalRes = await fetch(
      `${GATEWAY_URL}/Content/${result.sid}/ApprovalRequests/whatsapp`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": twilioKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: template.template_name,
          category: template.category || "UTILITY",
        }),
      }
    );

    const approvalResult = await approvalRes.json();
    if (!approvalRes.ok) {
      await adminClient
        .from("whatsapp_templates")
        .update({
          meta_status: "pending",
          rejection_reason: `Criado (SID: ${result.sid}) mas falha na submissão para aprovação: ${JSON.stringify(approvalResult)}`,
        })
        .eq("id", templateId);
    }
  }

  return jsonResponse({
    success: true,
    sid: result.sid,
    message: "Template submetido para aprovação da Meta",
  });
}

async function checkStatus(
  adminClient: any,
  templateId: string,
  lovableKey: string,
  twilioKey: string,
) {
  const { data: template } = await adminClient
    .from("whatsapp_templates")
    .select("meta_template_sid")
    .eq("id", templateId)
    .single();

  if (!template?.meta_template_sid) {
    return jsonResponse({ error: "Template não submetido ainda" }, 400);
  }

  const response = await fetch(
    `${GATEWAY_URL}/Content/${template.meta_template_sid}/ApprovalRequests`,
    {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return jsonResponse({ error: "Erro ao consultar status", details: result }, response.status);
  }

  // Map Twilio status to our status
  const whatsappStatus = result.whatsapp?.status?.toLowerCase() || "pending";
  let metaStatus = "pending";
  let rejectionReason = null;

  if (whatsappStatus === "approved") {
    metaStatus = "approved";
  } else if (whatsappStatus === "rejected") {
    metaStatus = "rejected";
    rejectionReason = result.whatsapp?.rejection_reason || "Motivo não informado";
  }

  await adminClient
    .from("whatsapp_templates")
    .update({
      meta_status: metaStatus,
      rejection_reason: rejectionReason,
    })
    .eq("id", templateId);

  return jsonResponse({
    status: metaStatus,
    details: result,
  });
}

async function deleteTemplate(
  adminClient: any,
  templateId: string,
  lovableKey: string,
  twilioKey: string,
) {
  const { data: template } = await adminClient
    .from("whatsapp_templates")
    .select("meta_template_sid")
    .eq("id", templateId)
    .single();

  if (template?.meta_template_sid) {
    await fetch(`${GATEWAY_URL}/Content/${template.meta_template_sid}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
      },
    });
  }

  await adminClient
    .from("whatsapp_templates")
    .update({
      meta_status: "draft",
      meta_template_sid: null,
      submitted_at: null,
      rejection_reason: null,
    })
    .eq("id", templateId);

  return jsonResponse({ success: true });
}

async function listRemoteTemplates(lovableKey: string, twilioKey: string) {
  const response = await fetch(`${GATEWAY_URL}/Content`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
    },
  });

  const result = await response.json();
  if (!response.ok) {
    return jsonResponse({ error: "Erro ao listar templates remotos", details: result }, response.status);
  }

  return jsonResponse({ templates: result.contents || [] });
}

function buildVariables(body: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const matches = body.match(/\{(\w+)\}/g) || [];
  matches.forEach((match, i) => {
    vars[String(i + 1)] = match.replace(/[{}]/g, "");
  });
  return vars;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    },
  });
}
