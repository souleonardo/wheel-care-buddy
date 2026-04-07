CREATE TABLE public.traffic_violations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  violation_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_date date,
  auto_number text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage traffic violations"
  ON public.traffic_violations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Locadores can view own traffic violations"
  ON public.traffic_violations FOR SELECT
  USING (auth.uid() = renter_id);

CREATE TRIGGER update_traffic_violations_updated_at
  BEFORE UPDATE ON public.traffic_violations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();