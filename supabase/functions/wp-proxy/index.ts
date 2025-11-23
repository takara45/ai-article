import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

type Payload = {
  title: string;
  contentHtml: string;
  status: "draft" | "publish";
  excerpt?: string;
  credentials?: {
    url?: string;
    username?: string;
    appPassword?: string;
  };
  test?: boolean;
};

const WP_URL = Deno.env.get("WORDPRESS_URL") ?? "";
const WP_USERNAME = Deno.env.get("WORDPRESS_USERNAME") ?? "";
const WP_APP_PASSWORD = Deno.env.get("WORDPRESS_APP_PASSWORD") ?? "";
const PROXY_KEY = Deno.env.get("WP_PROXY_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-wp-proxy-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body: Payload = await req.json();
    const clientKey = req.headers.get("x-wp-proxy-key") ?? "";

    if (PROXY_KEY && clientKey !== PROXY_KEY) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const url = body.credentials?.url || WP_URL;
    const username = body.credentials?.username || WP_USERNAME;
    const appPassword = body.credentials?.appPassword || WP_APP_PASSWORD;

    if (!url || !username || !appPassword) {
      return new Response("Missing WordPress credentials", { status: 400, headers: corsHeaders });
    }

    const base = url.replace(/\/+$/, "");
    const endpoint = body.test
      ? `${base}/wp-json/wp/v2/users/me`
      : `${base}/wp-json/wp/v2/posts`;
    const auth = btoa(`${username}:${appPassword}`);

    const wpRes = await fetch(endpoint, {
      method: body.test ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: body.test
        ? undefined
        : JSON.stringify({
            title: body.title,
            content: body.contentHtml,
            status: body.status,
            excerpt: body.excerpt,
          }),
    });

    if (!wpRes.ok) {
      const text = await wpRes.text();
      return new Response(`WordPress error (${wpRes.status}): ${text}`, { status: 502, headers: corsHeaders });
    }

    const json = await wpRes.json();
    return new Response(
      JSON.stringify(
        body.test
          ? { ok: true, user: json }
          : { id: json.id, link: json.link }
      ),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(`Unexpected error: ${err?.message ?? err}`, { status: 500, headers: corsHeaders });
  }
});
