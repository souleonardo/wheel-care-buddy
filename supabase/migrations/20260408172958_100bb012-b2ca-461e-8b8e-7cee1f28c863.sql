
CREATE TABLE public.whatsapp_message_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  renter_id uuid NOT NULL,
  journey_type text NOT NULL,
  phone text NOT NULL,
  message_body text NOT NULL,
  twilio_sid text,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  status_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage message logs" ON public.whatsapp_message_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_whatsapp_logs_status ON public.whatsapp_message_logs (status);
CREATE INDEX idx_whatsapp_logs_renter ON public.whatsapp_message_logs (renter_id);
CREATE INDEX idx_whatsapp_logs_twilio_sid ON public.whatsapp_message_logs (twilio_sid);
