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
  status: "scheduled" | "in_progress" | "completed";
  notes?: string;
  mechanicNotes?: string;
}

const initialVehicles: Vehicle[] = [
  { id: "1", plate: "ABC-1234", model: "Toyota Corolla", year: 2022, status: "rented", renterName: "Carlos Silva", weeklyRate: 800, nextRevision: "2026-04-01" },
  { id: "2", plate: "DEF-5678", model: "Honda Civic", year: 2023, status: "rented", renterName: "Maria Santos", weeklyRate: 850, nextRevision: "2026-03-25" },
  { id: "3", plate: "GHI-9012", model: "Volkswagen Gol", year: 2021, status: "available", weeklyRate: 600, nextRevision: "2026-04-15" },
  { id: "4", plate: "JKL-3456", model: "Fiat Argo", year: 2023, status: "maintenance", weeklyRate: 650, nextRevision: "2026-03-20" },
  { id: "5", plate: "MNO-7890", model: "Chevrolet Onix", year: 2022, status: "rented", renterName: "João Oliveira", weeklyRate: 700, nextRevision: "2026-05-01" },
  { id: "6", plate: "PQR-1122", model: "Hyundai HB20", year: 2024, status: "available", weeklyRate: 750, nextRevision: "2026-06-10" },
];

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
}

const FleetContext = createContext<FleetContextType | null>(null);

export function FleetProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(true);

  // Fetch revisions from database
  const fetchRevisions = useCallback(async () => {
    const { data, error } = await supabase
      .from("revisions")
      .select("id, vehicle_id, type, scheduled_date, status, notes, mechanic_notes, vehicle:vehicles(plate, model)")
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
        status: r.status as Revision["status"],
        notes: r.notes ?? undefined,
        mechanicNotes: r.mechanic_notes ?? undefined,
      }));
      setRevisions(mapped);
    }
    setRevisionsLoading(false);
  }, []);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const addVehicle = useCallback((v: Omit<Vehicle, "id">) => {
    setVehicles((prev) => [...prev, { ...v, id: crypto.randomUUID() }]);
  }, []);

  const removeVehicle = useCallback((id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const updateVehicle = useCallback((id: string, updates: Partial<Omit<Vehicle, "id">>) => {
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
      status: r.status,
      notes: r.notes || null,
      requested_by: userId || null,
    });

    if (error) {
      console.error("Error adding revision:", error);
      return;
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
    // Update locally first for instant UI feedback
    setRevisions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );

    // Persist to database
    const { error } = await supabase
      .from("revisions")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating revision status:", error);
      // Revert on error
      await fetchRevisions();
    }
  }, [fetchRevisions]);

  return (
    <FleetContext.Provider value={{
      vehicles, payments, revisions, revisionsLoading,
      addVehicle, removeVehicle, updateVehicle, addRevision,
      markPaymentPaid, updateRevisionStatus, refreshRevisions: fetchRevisions,
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
