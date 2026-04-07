
-- Allow mechanics to insert invoices when completing revisions
CREATE POLICY "Mecanicos can insert invoices"
ON public.invoices FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mecanico'::app_role));

-- Allow mechanics to insert invoice items
CREATE POLICY "Mecanicos can insert invoice items"
ON public.invoice_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mecanico'::app_role));

-- Allow mechanics to insert maintenance payments
CREATE POLICY "Mecanicos can insert maintenance payments"
ON public.payments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mecanico'::app_role) AND payment_type = 'maintenance');
