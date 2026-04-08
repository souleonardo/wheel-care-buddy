
-- Add phone column to profiles
ALTER TABLE public.profiles ADD COLUMN phone text;

-- Create journey type enum
CREATE TYPE public.whatsapp_journey_type AS ENUM ('reminder_d1', 'due_date', 'overdue');

-- Create whatsapp_journeys table
CREATE TABLE public.whatsapp_journeys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_type whatsapp_journey_type NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT false,
  retry_interval_days integer NOT NULL DEFAULT 3,
  max_retries integer NOT NULL DEFAULT 5,
  send_hour integer NOT NULL DEFAULT 9,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage journeys" ON public.whatsapp_journeys FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_whatsapp_journeys_updated_at BEFORE UPDATE ON public.whatsapp_journeys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default journeys
INSERT INTO public.whatsapp_journeys (journey_type, is_active, retry_interval_days, max_retries, send_hour) VALUES
  ('reminder_d1', false, 0, 0, 9),
  ('due_date', false, 0, 0, 9),
  ('overdue', false, 3, 5, 9);

-- Create whatsapp_templates table
CREATE TABLE public.whatsapp_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES public.whatsapp_journeys(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  template_body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates" ON public.whatsapp_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.whatsapp_templates (journey_id, template_name, template_body)
SELECT id, 'Lembrete D-1', 'Olá {nome}, lembramos que sua fatura no valor de R$ {valor} referente ao veículo {placa} vence amanhã ({vencimento}). Evite juros e efetue o pagamento via PIX.'
FROM public.whatsapp_journeys WHERE journey_type = 'reminder_d1';

INSERT INTO public.whatsapp_templates (journey_id, template_name, template_body)
SELECT id, 'Dia do Vencimento', 'Olá {nome}, sua fatura no valor de R$ {valor} referente ao veículo {placa} vence hoje ({vencimento}). Realize o pagamento via PIX para evitar pendências.'
FROM public.whatsapp_journeys WHERE journey_type = 'due_date';

INSERT INTO public.whatsapp_templates (journey_id, template_name, template_body)
SELECT id, 'Fatura Vencida', 'Olá {nome}, identificamos que sua fatura no valor de R$ {valor} referente ao veículo {placa} está vencida desde {vencimento}. Regularize sua situação o quanto antes.'
FROM public.whatsapp_journeys WHERE journey_type = 'overdue';

-- Create whatsapp_config table (singleton)
CREATE TABLE public.whatsapp_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_number text NOT NULL DEFAULT '',
  is_sandbox boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage config" ON public.whatsapp_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default config
INSERT INTO public.whatsapp_config (sender_number, is_sandbox) VALUES ('', true);
