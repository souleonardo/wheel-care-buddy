
-- Allow mechanics to delete their own supply_usage records
CREATE POLICY "Mecanicos can delete own supply usage"
ON public.supply_usage
FOR DELETE
USING (has_role(auth.uid(), 'mecanico') AND auth.uid() = used_by);

-- Trigger to restore stock when a supply_usage record is deleted
CREATE OR REPLACE FUNCTION public.restore_supply_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.supplies
  SET quantity = quantity + OLD.quantity_used
  WHERE id = OLD.supply_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_supply_usage_delete
BEFORE DELETE ON public.supply_usage
FOR EACH ROW
EXECUTE FUNCTION public.restore_supply_stock();
