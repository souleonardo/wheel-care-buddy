
-- Add payment frequency and contract URL to vehicle_assignments
ALTER TABLE public.vehicle_assignments
ADD COLUMN payment_frequency text NOT NULL DEFAULT 'weekly',
ADD COLUMN contract_url text;

-- Create storage bucket for rental contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('rental-contracts', 'rental-contracts', false);

-- Storage policies for rental-contracts bucket
CREATE POLICY "Admins can manage rental contracts"
ON storage.objects FOR ALL
USING (bucket_id = 'rental-contracts' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'rental-contracts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Locadores can view own rental contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rental-contracts'
  AND public.has_role(auth.uid(), 'locador')
  AND EXISTS (
    SELECT 1 FROM public.vehicle_assignments va
    WHERE va.renter_id = auth.uid()
    AND va.is_active = true
    AND va.contract_url LIKE '%' || storage.filename(name)
  )
);
