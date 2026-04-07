
CREATE TABLE public.supplies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage supplies" ON public.supplies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mecanicos can view supplies" ON public.supplies FOR SELECT
  USING (public.has_role(auth.uid(), 'mecanico'));

CREATE TRIGGER update_supplies_updated_at
  BEFORE UPDATE ON public.supplies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.supply_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES public.revisions(id) ON DELETE SET NULL,
  quantity_used INTEGER NOT NULL,
  used_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supply_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage supply usage" ON public.supply_usage FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mecanicos can view supply usage" ON public.supply_usage FOR SELECT
  USING (public.has_role(auth.uid(), 'mecanico'));

CREATE POLICY "Mecanicos can insert supply usage" ON public.supply_usage FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'mecanico') AND auth.uid() = used_by);

CREATE OR REPLACE FUNCTION public.deduct_supply_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.supplies
  SET quantity = quantity - NEW.quantity_used
  WHERE id = NEW.supply_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deduct_stock_on_usage
  AFTER INSERT ON public.supply_usage
  FOR EACH ROW EXECUTE FUNCTION public.deduct_supply_stock();
