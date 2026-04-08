ALTER TABLE public.whatsapp_templates
  ADD COLUMN meta_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN meta_template_sid text,
  ADD COLUMN rejection_reason text,
  ADD COLUMN submitted_at timestamp with time zone,
  ADD COLUMN category text NOT NULL DEFAULT 'utility',
  ADD COLUMN language text NOT NULL DEFAULT 'pt_BR';