import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadData {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const leadData: LeadData = await req.json();
    console.log("Received lead data:", leadData);

    // Validate required fields
    if (!leadData.name || !leadData.email) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Nome e email são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadData.email)) {
      console.error("Invalid email format:", leadData.email);
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Store lead in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabase.from("leads").insert({
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone || null,
      message: leadData.message || null,
    });

    if (dbError) {
      console.error("Database error:", dbError);
      // Continue to send email even if DB fails
    } else {
      console.log("Lead saved to database successfully");
    }

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Racun Portfolio <onboarding@resend.dev>",
      to: ["racunagencia@gmail.com"],
      subject: `Novo Lead: ${leadData.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #C9A87C; border-bottom: 2px solid #C9A87C; padding-bottom: 10px;">
            🎉 Novo Lead Capturado!
          </h1>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Informações do Contato:</h2>
            
            <p><strong>Nome:</strong> ${leadData.name}</p>
            <p><strong>Email:</strong> <a href="mailto:${leadData.email}">${leadData.email}</a></p>
            ${leadData.phone ? `<p><strong>Telefone:</strong> <a href="tel:${leadData.phone}">${leadData.phone}</a></p>` : ""}
            ${leadData.message ? `<p><strong>Mensagem:</strong></p><p style="background-color: #fff; padding: 15px; border-left: 3px solid #C9A87C;">${leadData.message}</p>` : ""}
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Lead capturado através do portfólio Racun em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Lead enviado com sucesso!" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-lead-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
