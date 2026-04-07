
CREATE UNIQUE INDEX vehicle_assignments_one_active_per_vehicle ON public.vehicle_assignments (vehicle_id) WHERE is_active = true;
