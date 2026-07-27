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

    if (!url || !key) {
      console.error("Evolution API não configurada no ambiente.");
      throw new Error("Evolution API não configurada.");
    }

    try {
      // Limpa o número para garantir que tenha apenas dígitos
      const cleanNumber = data.number.replace(/\D/g, '');
      
      const response = await fetch(`${url}/message/sendText/${data.instance}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'apikey': key 
        },
        body: JSON.stringify({ 
          number: cleanNumber, 
          text: data.text,
          delay: 1200, // Adiciona um pequeno delay para evitar bloqueios
          linkPreview: false
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Erro na Evolution API:", result);
        throw new Error(result.message || `Erro ${response.status} ao enviar mensagem.`);
      }

      return result;
    } catch (error) {
      console.error("Falha ao enviar mensagem WhatsApp:", error);
      throw error;
    }
  });
