import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://drdkov.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const assignmentId = String(body?.task_assignee_id || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assignmentId)) {
      return json({ error: "invalid_assignment_id" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: assignment, error: assignmentError } = await admin
      .from("task_assignees")
      .select("id,user_id")
      .eq("id", assignmentId)
      .maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!assignment) return json({ error: "assignment_not_found" }, 404);

    const { error: claimError } = await admin.from("push_delivery_log").insert({
      task_assignee_id: assignment.id,
      user_id: assignment.user_id,
      status: "processing",
    });
    if (claimError?.code === "23505") return json({ ok: true, duplicate: true });
    if (claimError) throw claimError;

    const [{ data: subscriptions }, { data: privateKey, error: keyError }] =
      await Promise.all([
        admin.from("push_subscriptions")
          .select("id,endpoint,p256dh,auth")
          .eq("user_id", assignment.user_id)
          .is("disabled_at", null),
        admin.rpc("get_push_vapid_private_key"),
      ]);
    if (keyError || !privateKey) throw keyError || new Error("VAPID key unavailable");

    if (!subscriptions?.length) {
      await admin.from("push_delivery_log").update({
        status: "no_subscriptions",
        completed_at: new Date().toISOString(),
      }).eq("task_assignee_id", assignment.id);
      return json({ ok: true, sent: 0, reason: "no_subscriptions" });
    }

    webpush.setVapidDetails(
      "https://drdkov.github.io/project-tracker-site/",
      "XHgwNGt-lAr2FfVJl3VeJ6StfS5j18oheuHA6bZIouhxDgSi2Owg0APEz0hwiw4UiFFQ_op1-avRrc4AjTzgynUdb_8",
      String(privateKey),
    );

    const payload = JSON.stringify({
      title: "Вам назначена новая задача",
      body: "Откройте Project Tracker, чтобы посмотреть подробности.",
      icon: "https://drdkov.github.io/project-tracker-site/assets/icon-192.png?v=20260715-push-v1",
      badge: "https://drdkov.github.io/project-tracker-site/favicon-32.png?v=20260715-push-v1",
      url: "https://drdkov.github.io/project-tracker-site/index.html#tasks",
    });

    let sent = 0;
    const errors: string[] = [];
    await Promise.all(subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, payload, { TTL: 86400, urgency: "high" });
        sent += 1;
      } catch (error: any) {
        const status = Number(error?.statusCode || error?.status || 0);
        errors.push(status ? "HTTP " + status : String(error?.message || error));
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").update({
            disabled_at: new Date().toISOString(),
          }).eq("id", sub.id);
        }
      }
    }));

    await admin.from("push_delivery_log").update({
      status: sent > 0 ? "sent" : "failed",
      sent_count: sent,
      last_error: errors.length ? errors.slice(0, 3).join("; ").slice(0, 1000) : null,
      completed_at: new Date().toISOString(),
    }).eq("task_assignee_id", assignment.id);

    return json({ ok: true, sent, failed: errors.length });
  } catch (error: any) {
    console.error("send-assignment-push", error);
    return json({ error: "push_failed" }, 500);
  }
});