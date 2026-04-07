import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  year: number;
  status: "available" | "rented" | "maintenance";
  renterName?: string;
  weeklyRate: number;
  nextRevision?: string;
  crlvUrl?: string;
  crlvExpiryDate?: string;
}

export interface Payment {
  id: string;
  vehicleId: string;
  renterName: string;
  vehiclePlate: string;
  amount: number;
  dueDate: string;
  status: "paid" | "pending" | "overdue";
  paidDate?: string;
  paymentType?: "rental" | "maintenance";
}

export interface Revision {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  type: string;
  scheduledDate: string;
  scheduledTime?: string;
  status: "pending_approval" | "scheduled" | "in_progress" | "completed" | "rejected";
  notes?: string;
  mechanicNotes?: string;
}

const initialPayments: Payment[] = [
  { id: "1", vehicleId: "1", renterName: "Carlos Silva", vehiclePlate: "ABC-1234", amount: 800, dueDate: "2026-03-17", status: "paid", paidDate: "2026-03-17" },
  { id: "2", vehicleId: "2", renterName: "Maria Santos", vehiclePlate: "DEF-5678", amount: 850, dueDate: "2026-03-17", status: "overdue" },
  { id: "3", vehicleId: "5", renterName: "João Oliveira", vehiclePlate: "MNO-7890", amount: 700, dueDate: "2026-03-24", status: "pending" },
  { id: "4", vehicleId: "1", renterName: "Carlos Silva", vehiclePlate: "ABC-1234", amount: 800, dueDate: "2026-03-24", status: "pending" },
  { id: "5", vehicleId: "2", renterName: "Maria Santos", vehiclePlate: "DEF-5678", amount: 850, dueDate: "2026-03-24", status: "pending" },
  { id: "6", vehicleId: "1", renterName: "Carlos Silva", vehiclePlate: "ABC-1234", amount: 800, dueDate: "2026-03-10", status: "paid", paidDate: "2026-03-10" },
];

interface FleetContextType {
  vehicles: Vehicle[];
  vehiclesLoading: boolean;
  payments: Payment[];
  revisions: Revision[];
  revisionsLoading: boolean;
  addVehicle: (v: Omit<Vehicle, "id">) => void;
  removeVehicle: (id: string) => void;
  updateVehicle: (id: string, updates: Partial<Omit<Vehicle, "id">>) => void;
  addRevision: (r: Omit<Revision, "id">) => void;
  markPaymentPaid: (id: string) => void;
  updateRevisionStatus: (id: string, status: Revision["status"]) => void;
  refreshRevisions: () => Promise<void>;
  refreshVehicles: () => Promise<void>;
}

const FleetContext = createContext<FleetContextType | null>(null);

export function FleetProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(true);

  // Fetch vehicles from database
  const fetchVehicles = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("model");

    if (error) {
      console.error("Error fetching vehicles:", error);
      setVehiclesLoading(false);
      return;
    }

    if (data) {
      // Fetch active assignments with renter names
      const vehicleIds = data.map((v) => v.id);
      let renterMap: Record<string, string> = {};

      if (vehicleIds.length > 0) {
        const { data: assignments } = await supabase
          .from("vehicle_assignments")
          .select("vehicle_id, renter_id")
          .in("vehicle_id", vehicleIds)
          .eq("is_active", true);

        if (assignments && assignments.length > 0) {
          const renterIds = [...new Set(assignments.map((a) => a.renter_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", renterIds);

          const profileMap = Object.fromEntries(
            (profiles ?? []).map((p) => [p.user_id, p.full_name])
          );

          assignments.forEach((a) => {
            renterMap[a.vehicle_id] = profileMap[a.renter_id] ?? "";
          });
        }
      }

      const mapped: Vehicle[] = data.map((v) => ({
        id: v.id,
        plate: v.plate,
        model: v.model,
        year: v.year,
        status: v.status as Vehicle["status"],
        weeklyRate: Number(v.weekly_rate),
        nextRevision: v.next_revision ?? undefined,
        crlvUrl: v.crlv_url ?? undefined,
        crlvExpiryDate: (v as any).crlv_expiry_date ?? undefined,
        renterName: renterMap[v.id] || undefined,
      }));
      setVehicles(mapped);
    }
    setVehiclesLoading(false);
  }, []);

  // Fetch revisions from database
  const fetchRevisions = useCallback(async () => {
    const { data, error } = await supabase
      .from("revisions")
      .select("id, vehicle_id, type, scheduled_date, scheduled_time, status, notes, mechanic_notes, vehicle:vehicles(plate, model)")
      .order("scheduled_date", { ascending: false });

    if (error) {
      console.error("Error fetching revisions:", error);
      setRevisionsLoading(false);
      return;
    }

    if (data) {
      const mapped: Revision[] = (data as any[]).map((r) => ({
        id: r.id,
        vehicleId: r.vehicle_id,
        vehiclePlate: r.vehicle?.plate ?? "",
        vehicleModel: r.vehicle?.model ?? "",
        type: r.type,
        scheduledDate: r.scheduled_date,
        scheduledTime: r.scheduled_time ?? undefined,
        status: r.status as Revision["status"],
        notes: r.notes ?? undefined,
        mechanicNotes: r.mechanic_notes ?? undefined,
      }));
      setRevisions(mapped);
    }
    setRevisionsLoading(false);
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchRevisions();
  }, [fetchVehicles, fetchRevisions]);

  const addVehicle = useCallback(async (v: Omit<Vehicle, "id">) => {
    const { error } = await supabase.from("vehicles").insert({
      plate: v.plate,
      model: v.model,
      year: v.year,
      status: v.status,
      weekly_rate: v.weeklyRate,
      next_revision: v.nextRevision || null,
    });

    if (error) {
      console.error("Error adding vehicle:", error);
      return;
    }

    await fetchVehicles();
  }, [fetchVehicles]);

  const removeVehicle = useCallback(async (id: string) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) {
      console.error("Error removing vehicle:", error);
      return;
    }
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const updateVehicle = useCallback(async (id: string, updates: Partial<Omit<Vehicle, "id">>) => {
    const dbUpdates: {
      plate?: string; model?: string; year?: number; status?: string;
      weekly_rate?: number; next_revision?: string | null; crlv_url?: string | null;
    } = {};
    if (updates.plate !== undefined) dbUpdates.plate = updates.plate;
    if (updates.model !== undefined) dbUpdates.model = updates.model;
    if (updates.year !== undefined) dbUpdates.year = updates.year;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.weeklyRate !== undefined) dbUpdates.weekly_rate = updates.weeklyRate;
    if (updates.nextRevision !== undefined) dbUpdates.next_revision = updates.nextRevision;
    if (updates.crlvUrl !== undefined) dbUpdates.crlv_url = updates.crlvUrl;

    const { error } = await supabase.from("vehicles").update(dbUpdates).eq("id", id);
    if (error) {
      console.error("Error updating vehicle:", error);
      return;
    }

    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  }, []);

  const addRevision = useCallback(async (r: Omit<Revision, "id">) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { error } = await supabase.from("revisions").insert({
      vehicle_id: r.vehicleId,
      type: r.type,
      scheduled_date: r.scheduledDate,
      scheduled_time: r.scheduledTime || null,
      status: r.status,
      notes: r.notes || null,
      requested_by: userId || null,
    } as any);

    if (error) {
      console.error("Error adding revision:", error);
      return;
    }

    // Sync vehicle status to maintenance when a revision is created
    if (r.status === "scheduled" || r.status === "in_progress") {
      await supabase.from("vehicles").update({ status: "maintenance" }).eq("id", r.vehicleId);
      setVehicles((prev) => prev.map((v) => v.id === r.vehicleId ? { ...v, status: "maintenance" } : v));
    }

    await fetchRevisions();
  }, [fetchRevisions]);

  const markPaymentPaid = useCallback((id: string) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "paid" as const, paidDate: new Date().toISOString().split("T")[0] } : p
      )
    );
  }, []);

  const updateRevisionStatus = useCallback(async (id: string, status: Revision["status"]) => {
    // Find the revision to get vehicleId
    const revision = revisions.find((r) => r.id === id);

    setRevisions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );

    const { error } = await supabase
      .from("revisions")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating revision status:", error);
      await fetchRevisions();
      return;
    }

    // Sync vehicle status based on revision status
    if (revision) {
      if (status === "completed") {
        // Check if vehicle has other active revisions
        const { data: activeRevs } = await supabase
          .from("revisions")
          .select("id")
          .eq("vehicle_id", revision.vehicleId)
          .neq("id", id)
          .in("status", ["scheduled", "in_progress"])
          .limit(1);

        if (!activeRevs || activeRevs.length === 0) {
          // No other active revisions — check if vehicle has an active renter
          const { data: assignments } = await supabase
            .from("vehicle_assignments")
            .select("id")
            .eq("vehicle_id", revision.vehicleId)
            .eq("is_active", true)
            .limit(1);

          const newStatus = assignments && assignments.length > 0 ? "rented" : "available";
          await supabase.from("vehicles").update({ status: newStatus }).eq("id", revision.vehicleId);
          setVehicles((prev) => prev.map((v) => v.id === revision.vehicleId ? { ...v, status: newStatus as Vehicle["status"] } : v));
        }
      } else if (status === "in_progress") {
        await supabase.from("vehicles").update({ status: "maintenance" }).eq("id", revision.vehicleId);
        setVehicles((prev) => prev.map((v) => v.id === revision.vehicleId ? { ...v, status: "maintenance" } : v));
      }
    }
  }, [fetchRevisions, revisions]);

  return (
    <FleetContext.Provider value={{
      vehicles, vehiclesLoading, payments, revisions, revisionsLoading,
      addVehicle, removeVehicle, updateVehicle, addRevision,
      markPaymentPaid, updateRevisionStatus,
      refreshRevisions: fetchRevisions, refreshVehicles: fetchVehicles,
    }}>
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used within FleetProvider");
  return ctx;
}
