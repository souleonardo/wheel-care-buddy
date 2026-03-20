
-- Allow authenticated users to insert their own role during signup
CREATE POLICY "Users can insert own role" ON public.user_roles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

CREATE POLICY "Users can upload own receipts" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));
