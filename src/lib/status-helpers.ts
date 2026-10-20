export type OrderStatus = "RECEIVED" | "WASHING" | "IRONING" | "READY_FOR_DELIVERY" | "DELIVERED";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: "Received / Draft",
  WASHING: "Washing Stage",
  IRONING: "Ironing Stage",
  READY_FOR_DELIVERY: "Ready for Pickup",
  DELIVERED: "Completed / Delivered",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  RECEIVED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  WASHING: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  IRONING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  READY_FOR_DELIVERY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DELIVERED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as OrderStatus] || "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as OrderStatus] || status;
}
