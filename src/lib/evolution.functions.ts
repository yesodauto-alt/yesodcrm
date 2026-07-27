import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => 
    z.object({ 
      number: z.string(), 
      text: z.string(),
      instance: z.string() 
    }).parse(data)
  )
  .handler(async ({ data }) => {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API não configurada no servidor.");
    }

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${data.instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: data.number,
        text: data.text
      })
    });

    return await response.json();
  });
