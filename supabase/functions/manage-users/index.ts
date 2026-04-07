import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAdminCaller(req: Request) {
  const authHeader = req.headers.get("Authorization");
  console.log("Auth header present:", !!authHeader, authHeader?.substring(0, 20));
  if (!authHeader) throw new Error("Não autorizado - sem header");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Configuração do servidor ausente");
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await callerClient.auth.getUser();
  console.log("getUser result:", user?.id, "error:", error?.message);
  if (error || !user) throw new Error("Não autorizado - usuário inválido");

  const { data: isAdmin } = await callerClient.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Apenas administradores");

  return user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await getAdminCaller(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!serviceKey) {
      return jsonResponse({ error: "Configuração do servidor ausente" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const action = body.action;

    if (action === "list") {
      const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;

      const users = data.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));

      return jsonResponse({ users });
    }

    if (action === "reset_password") {
      const { userId, newPassword } = body;
      if (!userId || !newPassword) {
        return jsonResponse({ error: "userId e newPassword são obrigatórios" }, 400);
      }
      if (newPassword.length < 6) {
        return jsonResponse({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
      }

      const { error } = await adminClient.auth.admin.updateUser(userId, {
        password: newPassword,
      });
      if (error) throw error;

      return jsonResponse({ message: "Senha atualizada com sucesso" });
    }

    return jsonResponse({ error: "Ação inválida" }, 400);
  } catch (err: any) {
    console.error("manage-users error:", err.message);
    return jsonResponse({ error: err.message }, 403);
  }
});
