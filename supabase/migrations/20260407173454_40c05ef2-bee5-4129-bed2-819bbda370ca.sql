
-- Drop the broken policy
DROP POLICY IF EXISTS "Locadores can view assigned vehicle documents" ON storage.objects;

-- Create fixed policy: match on folder name (vehicle_id) instead of filename
CREATE POLICY "Locadores can view assigned vehicle documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'vehicle-documents'
  AND has_role(auth.uid(), 'locador'::app_role)
  AND EXISTS (
    SELECT 1
    FROM vehicle_assignments va
    WHERE va.renter_id = auth.uid()
      AND va.is_active = true
      AND (storage.foldername(name))[1] = va.vehicle_id::text
  )
);
