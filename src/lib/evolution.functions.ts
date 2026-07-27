import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => 
    z.object({ 
      number: z.string(), 
      text: z.string(),
      instance: z.string() 
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const url = process.env.EVOLUTION_API_URL;
    const key = process.env.EVOLUTION_API_KEY;

    if (!url || !key) throw new Error("Evolution API não configurada.");

    const response = await fetch(`${url}/message/sendText/${data.instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key },
      body: JSON.stringify({ number: data.number, text: data.text })
    });

    return await response.json();
  });
