CREATE POLICY "Admins can update vehicle documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vehicle-documents' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'vehicle-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rental contracts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'rental-contracts' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'rental-contracts' AND public.has_role(auth.uid(), 'admin'));