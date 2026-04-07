
-- Add new columns to vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS chassis TEXT,
  ADD COLUMN IF NOT EXISTS renavam TEXT,
  ADD COLUMN IF NOT EXISTS entry_date DATE;

-- Create vehicle_debts table
CREATE TABLE public.vehicle_debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'api')),
  external_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vehicle debts"
ON public.vehicle_debts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Locadores can view assigned vehicle debts"
ON public.vehicle_debts FOR SELECT
USING (
  has_role(auth.uid(), 'locador'::app_role)
  AND EXISTS (
    SELECT 1 FROM vehicle_assignments va
    WHERE va.vehicle_id = vehicle_debts.vehicle_id
      AND va.renter_id = auth.uid()
      AND va.is_active = true
  )
);

CREATE POLICY "Mecanicos can view vehicle debts"
ON public.vehicle_debts FOR SELECT
USING (has_role(auth.uid(), 'mecanico'::app_role));

CREATE TRIGGER update_vehicle_debts_updated_at
BEFORE UPDATE ON public.vehicle_debts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
