// Service types that automatically generate a charge to the renter (locador)
// Types NOT in this list are considered included in the rental contract
export const billableServiceTypes = [
  "Troca de pneus",
  "Troca de pastilhas de freio",
  "Revisão completa",
  "Revisão elétrica",
  "Troca de correia",
  "Suspensão",
];

// Types considered part of routine maintenance (not billed)
export const nonBillableServiceTypes = [
  "Troca de óleo",
  "Alinhamento e balanceamento",
];

export function isServiceBillable(serviceType: string): boolean {
  return billableServiceTypes.includes(serviceType);
}
