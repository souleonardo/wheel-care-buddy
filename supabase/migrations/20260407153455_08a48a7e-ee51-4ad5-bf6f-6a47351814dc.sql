-- Add mileage tracking to vehicles
ALTER TABLE public.vehicles
ADD COLUMN current_mileage integer DEFAULT 0,
ADD COLUMN next_oil_change_km integer,
ADD COLUMN last_oil_change_date date;

-- Add mileage info to revisions
ALTER TABLE public.revisions
ADD COLUMN mileage_at_service integer,
ADD COLUMN next_oil_change_km integer;