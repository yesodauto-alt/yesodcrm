INSERT INTO public.channels (
  name,
  whatsapp_number,
  connection_type,
  status,
  active,
  instance_name,
  units,
  description,
  created_at,
  updated_at,
  last_sync_at
)
SELECT
  'WhatsApp Yesod',
  NULL,
  'evolution',
  'offline',
  TRUE,
  'yesodcrm',
  ARRAY['Yesod']::text[],
  'Canal principal conectado à instância Evolution yesodcrm.',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.channels
  WHERE instance_name = 'yesodcrm'
     OR name = 'WhatsApp Yesod'
);