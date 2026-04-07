
-- Add CRLV document URL column to vehicles
ALTER TABLE public.vehicles ADD COLUMN crlv_url text;

-- Create storage bucket for vehicle documents
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-documents', 'vehicle-documents', false);

-- Storage policies: Admins can upload/manage documents
CREATE POLICY "Admins can upload vehicle documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-documents' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can view vehicle documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-documents' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete vehicle documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-documents' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Locadores can view documents of their assigned vehicles
CREATE POLICY "Locadores can view assigned vehicle documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-documents' AND
  public.has_role(auth.uid(), 'locador'::public.app_role) AND
  EXISTS (
    SELECT 1 FROM public.vehicle_assignments va
    JOIN public.vehicles v ON v.id = va.vehicle_id
    WHERE va.renter_id = auth.uid()
    AND va.is_active = true
    AND storage.filename(name) LIKE v.id::text || '%'
  )
);
