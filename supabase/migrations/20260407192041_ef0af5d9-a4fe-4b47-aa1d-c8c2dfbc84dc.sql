ALTER TABLE public.supplies
  ADD COLUMN is_billable boolean NOT NULL DEFAULT false,
  ADD COLUMN is_labor_billable boolean NOT NULL DEFAULT false;