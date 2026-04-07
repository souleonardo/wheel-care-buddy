
CREATE TABLE public.labor_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.revisions(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT 'Mão de obra',
  status TEXT NOT NULL DEFAULT 'pending',
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.labor_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage labor charges"
ON public.labor_charges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Mecanicos can insert own labor charges"
ON public.labor_charges FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mecanico'::app_role) AND auth.uid() = mechanic_id);

CREATE POLICY "Mecanicos can view own labor charges"
ON public.labor_charges FOR SELECT
USING (has_role(auth.uid(), 'mecanico'::app_role) AND auth.uid() = mechanic_id);

CREATE TRIGGER update_labor_charges_updated_at
BEFORE UPDATE ON public.labor_charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
