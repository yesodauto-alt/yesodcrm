UPDATE public.channels
SET status = 'online',
    instance_name = 'yesodcrm',
    last_sync_at = NOW(),
    updated_at = NOW()
WHERE instance_name = 'yesodcrm'
   OR name = 'WhatsApp Yesod';