
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL,
  revision_id uuid NOT NULL REFERENCES public.revisions(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  due_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  supply_name text NOT NULL,
  quantity integer NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  unit_cost numeric NOT NULL DEFAULT 0,
  is_billable boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Locadores can view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = renter_id);
CREATE POLICY "Mecanicos can view invoices" ON public.invoices FOR SELECT USING (has_role(auth.uid(), 'mecanico'));

-- Invoice items policies
CREATE POLICY "Admins can manage invoice items" ON public.invoice_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_items.invoice_id AND has_role(auth.uid(), 'admin')));
CREATE POLICY "Locadores can view own invoice items" ON public.invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_items.invoice_id AND auth.uid() = renter_id));
CREATE POLICY "Mecanicos can view invoice items" ON public.invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_items.invoice_id AND has_role(auth.uid(), 'mecanico')));

-- Timestamps trigger
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
