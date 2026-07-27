type VercelRequest = any;
type VercelResponse = any;

// Validação de ações permitidas
const ALLOWED_ACTIONS = ["create", "connect", "status", "logout"] as const;
type AllowedAction = typeof ALLOWED_ACTIONS[number];

// Rate limiting simples (em produção, usar Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests: number = 10, windowSeconds: number = 60): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowSeconds * 1000 });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

function isValidInstanceName(name: string): boolean {
  // Aceita apenas alphanuméricos, underscore e hífen
  return /^[a-zA-Z0-9_-]{1,50}$/.test(name);
}

function isValidAction(action: string): action is AllowedAction {
  return ALLOWED_ACTIONS.includes(action as AllowedAction);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configura CORS restritivo
  const origin = req.headers.origin;
  const allowedOrigins = [
    process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean);

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
  const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    return res.status(500).json({ error: "Configuração de Evolution API incompleta" });
  }

  const { action, instanceName } = req.query;
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  // Rate limiting por IP
  if (!checkRateLimit(clientIp, 20, 60)) {
    return res.status(429).json({ error: "Muitas requisições. Tente novamente em 1 minuto." });
  }

  // Validação de entrada
  if (!action || !isValidAction(action)) {
    return res.status(400).json({ error: "Ação inválida ou não fornecida" });
  }

  if (!instanceName || !isValidInstanceName(instanceName)) {
    return res.status(400).json({ error: "Nome de instância inválido" });
  }

  try {
    let fetchUrl = "";
    let fetchMethod = "GET";
    let fetchBody: any = undefined;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_KEY,
    };

    // Remove barra final se existir
    const baseUrl = EVOLUTION_URL.replace(/\/$/, "");

    switch (action) {
      case "create":
        fetchUrl = `${baseUrl}/instance/create`;
        fetchMethod = "POST";
        fetchBody = {
          instanceName,
          token: EVOLUTION_KEY,
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
        return res.status(400).json({ error: "Ação não suportada" });
    }

    // Log da requisição (sem expor dados sensíveis)
    console.log(`[Evolution API] ${fetchMethod} ${action} - Instance: ${instanceName}`);

    const response = await fetch(fetchUrl, {
      method: fetchMethod,
      headers,
      body: fetchBody ? JSON.stringify(fetchBody) : undefined,
      timeout: 30000, // 30 segundos
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Evolution API Error] Status: ${response.status}`, data);
      return res.status(response.status).json({
        error: "Erro na Evolution API",
        message: data.message || data.error || "Erro desconhecido",
      });
    }

    // Sanitiza a resposta antes de enviar
    const sanitizedData = {
      ...data,
      // Garante que o QR Code está no formato esperado
      qrcode: data.qrcode || data.base64 || null,
      base64: data.base64 || data.qrcode || null,
    };

    return res.status(200).json(sanitizedData);
  } catch (error: any) {
    console.error("[Evolution API Fatal Error]", error.message);
    return res.status(500).json({
      error: "Erro ao conectar com Evolution API",
      message: "Verifique a configuração da API Evolution e tente novamente.",
    });
  }
}
