ALTER TABLE public.traffic_violations
  ADD COLUMN document_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('violation-documents', 'violation-documents', false);

CREATE POLICY "Admins can manage violation docs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'violation-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Locadores can view own violation docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'violation-documents' AND auth.uid()::text = (storage.foldername(name))[1]);