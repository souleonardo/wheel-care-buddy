-- Add payment_type column to differentiate rental vs maintenance payments
ALTER TABLE public.payments
ADD COLUMN payment_type text NOT NULL DEFAULT 'rental';

-- Add revision_id to link maintenance payments to their revision
ALTER TABLE public.payments
ADD COLUMN revision_id uuid REFERENCES public.revisions(id) ON DELETE SET NULL;

-- Index for quick lookup
CREATE INDEX idx_payments_payment_type ON public.payments(payment_type);
CREATE INDEX idx_payments_revision_id ON public.payments(revision_id);