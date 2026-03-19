export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  year: number;
  status: "available" | "rented" | "maintenance";
  renterName?: string;
  weeklyRate: number;
  nextRevision?: string;
  imageUrl?: string;
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
}

export const vehicles: Vehicle[] = [
  { id: "1", plate: "ABC-1234", model: "Toyota Corolla", year: 2022, status: "rented", renterName: "Carlos Silva", weeklyRate: 800, nextRevision: "2026-04-01" },
  { id: "2", plate: "DEF-5678", model: "Honda Civic", year: 2023, status: "rented", renterName: "Maria Santos", weeklyRate: 850, nextRevision: "2026-03-25" },
  { id: "3", plate: "GHI-9012", model: "Volkswagen Gol", year: 2021, status: "available", weeklyRate: 600, nextRevision: "2026-04-15" },
  { id: "4", plate: "JKL-3456", model: "Fiat Argo", year: 2023, status: "maintenance", weeklyRate: 650, nextRevision: "2026-03-20" },
  { id: "5", plate: "MNO-7890", model: "Chevrolet Onix", year: 2022, status: "rented", renterName: "João Oliveira", weeklyRate: 700, nextRevision: "2026-05-01" },
  { id: "6", plate: "PQR-1122", model: "Hyundai HB20", year: 2024, status: "available", weeklyRate: 750, nextRevision: "2026-06-10" },
];

export const payments: Payment[] = [
  { id: "1", vehicleId: "1", renterName: "Carlos Silva", vehiclePlate: "ABC-1234", amount: 800, dueDate: "2026-03-17", status: "paid", paidDate: "2026-03-17" },
  { id: "2", vehicleId: "2", renterName: "Maria Santos", vehiclePlate: "DEF-5678", amount: 850, dueDate: "2026-03-17", status: "overdue" },
  { id: "3", vehicleId: "5", renterName: "João Oliveira", vehiclePlate: "MNO-7890", amount: 700, dueDate: "2026-03-24", status: "pending" },
  { id: "4", vehicleId: "1", renterName: "Carlos Silva", vehiclePlate: "ABC-1234", amount: 800, dueDate: "2026-03-24", status: "pending" },
  { id: "5", vehicleId: "2", renterName: "Maria Santos", vehiclePlate: "DEF-5678", amount: 850, dueDate: "2026-03-24", status: "pending" },
  { id: "6", vehicleId: "1", renterName: "Carlos Silva", vehiclePlate: "ABC-1234", amount: 800, dueDate: "2026-03-10", status: "paid", paidDate: "2026-03-10" },
];

export const revisions: Revision[] = [
  { id: "1", vehicleId: "4", vehiclePlate: "JKL-3456", vehicleModel: "Fiat Argo", type: "Troca de óleo", scheduledDate: "2026-03-20", status: "in_progress", notes: "Óleo sintético 5W30" },
  { id: "2", vehicleId: "2", vehiclePlate: "DEF-5678", vehicleModel: "Honda Civic", type: "Revisão completa", scheduledDate: "2026-03-25", status: "scheduled" },
  { id: "3", vehicleId: "1", vehiclePlate: "ABC-1234", vehicleModel: "Toyota Corolla", type: "Alinhamento e balanceamento", scheduledDate: "2026-04-01", status: "scheduled" },
  { id: "4", vehicleId: "3", vehiclePlate: "GHI-9012", vehicleModel: "Volkswagen Gol", type: "Troca de pastilhas de freio", scheduledDate: "2026-04-15", status: "scheduled" },
];
