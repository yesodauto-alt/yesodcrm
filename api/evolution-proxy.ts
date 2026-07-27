import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configura CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, apikey");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
  const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

  if (!EVOLUTION_URL) {
    return res.status(500).json({ error: "EVOLUTION_API_URL não configurada" });
  }

  const { action, instanceName } = req.query;

  try {
    let fetchUrl = "";
    let fetchMethod = "GET";
    let fetchBody: any = undefined;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (EVOLUTION_KEY) {
      headers["apikey"] = EVOLUTION_KEY;
    }

    // Remove barra final se existir
    const baseUrl = EVOLUTION_URL.replace(/\/$/, "");

    switch (action) {
      case "create":
        fetchUrl = `${baseUrl}/instance/create`;
        fetchMethod = "POST";
        fetchBody = {
          instanceName: instanceName || "yesod-crm",
          token: EVOLUTION_KEY || "",
          qrcode: true,
        };
        break;

      case "connect":
        fetchUrl = `${baseUrl}/instance/connect/${instanceName}`;
        fetchMethod = "POST";
        break;

      case "status":
        fetchUrl = `${baseUrl}/instance/connectionState/${instanceName}`;
        break;

      case "logout":
        fetchUrl = `${baseUrl}/instance/logout/${instanceName}`;
        fetchMethod = "DELETE";
        break;

      default:
        return res.status(400).json({ error: "Ação inválida" });
    }

    const response = await fetch(fetchUrl, {
      method: fetchMethod,
      headers,
      body: fetchBody ? JSON.stringify(fetchBody) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Evolution API Error:", error);
    return res.status(500).json({
      error: "Erro ao conectar com Evolution API",
      details: error.message,
    });
  }
}
