CREATE TABLE public.billable_service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billable_service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage billable types"
ON public.billable_service_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Mecanicos can view billable types"
ON public.billable_service_types
FOR SELECT
USING (has_role(auth.uid(), 'mecanico'::app_role));

-- Seed with default billable types
INSERT INTO public.billable_service_types (service_type) VALUES
  ('Troca de pneus'),
  ('Troca de pastilhas de freio'),
  ('Revisão completa'),
  ('Revisão elétrica'),
  ('Troca de correia'),
  ('Suspensão');