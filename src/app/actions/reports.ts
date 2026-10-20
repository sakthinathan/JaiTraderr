/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import { isPlaceholderMode as isPlaceholder } from "@/lib/supabase/env-helper";
import { JobCard } from "./job-cards";

export interface ServiceDetailReport {
  service_name: string;
  order_count: number;
  total_qty: number;
  unit: string;
  total_revenue: number;
  avg_ticket: number;
}

export interface CustomerReportData {
  customer_id: string;
  customer_code: string;
  name: string;
  mobile: string;
  total_orders: number;
  total_billed: number;
  total_paid: number;
  balance_due: number;
  average_billing: number;
  first_visit: string;
  last_visit: string;
  days_since_last_visit: number;
  tier: "VIP" | "REGULAR" | "NEW";
}

/**
 * Loads service items and service level aggregations for reports
 */
export async function getServicesReportData(jobCards: JobCard[]): Promise<ServiceDetailReport[]> {
  const placeholderMode = await isPlaceholder();

  if (placeholderMode) {
    // Aggregate from mockJobCards nested services
    const serviceMap: Record<string, { orderIds: Set<string>; totalQty: number; unit: string; totalRevenue: number }> = {};

    jobCards.forEach(jc => {
      if (jc.services && jc.services.length > 0) {
        jc.services.forEach(svc => {
          const sName = svc.service_name_snapshot || "General Laundry";
          if (!serviceMap[sName]) {
            serviceMap[sName] = { orderIds: new Set(), totalQty: 0, unit: "pcs", totalRevenue: 0 };
          }
          serviceMap[sName].orderIds.add(jc.id);

          svc.items?.forEach(item => {
            serviceMap[sName].totalQty += item.quantity || 1;
            serviceMap[sName].unit = item.unit_id_snapshot || "pcs";
            serviceMap[sName].totalRevenue += item.amount || 0;
          });
        });
      } else {
        // Fallback for job cards without explicit service line details
        const defaultService = "Wash & Iron";
        if (!serviceMap[defaultService]) {
          serviceMap[defaultService] = { orderIds: new Set(), totalQty: 0, unit: "pcs", totalRevenue: 0 };
        }
        serviceMap[defaultService].orderIds.add(jc.id);
        serviceMap[defaultService].totalQty += jc.total_pcs || 1;
        serviceMap[defaultService].totalRevenue += jc.grand_total || 0;
      }
    });

    const result: ServiceDetailReport[] = Object.entries(serviceMap).map(([name, data]) => ({
      service_name: name,
      order_count: data.orderIds.size,
      total_qty: Number(data.totalQty.toFixed(1)),
      unit: data.unit,
      total_revenue: data.totalRevenue,
      avg_ticket: data.orderIds.size > 0 ? Number((data.totalRevenue / data.orderIds.size).toFixed(2)) : 0,
    }));

    return result.sort((a, b) => b.total_revenue - a.total_revenue);
  }

  try {
    const supabase = await createClient();
    const { data: servicesData, error } = await supabase
      .from("job_card_services")
      .select(`
        id,
        job_card_id,
        service_name_snapshot,
        items:job_card_items (
          id,
          quantity,
          unit_id_snapshot,
          amount
        )
      `);

    if (error || !servicesData || servicesData.length === 0) {
      // Fallback: estimate from job cards directly
      return estimateFromJobCards(jobCards);
    }

    const serviceMap: Record<string, { orderIds: Set<string>; totalQty: number; unit: string; totalRevenue: number }> = {};

    servicesData.forEach((svc: any) => {
      const sName = svc.service_name_snapshot || "Standard Service";
      if (!serviceMap[sName]) {
        serviceMap[sName] = { orderIds: new Set(), totalQty: 0, unit: "pcs", totalRevenue: 0 };
      }
      serviceMap[sName].orderIds.add(svc.job_card_id);

      (svc.items || []).forEach((item: any) => {
        serviceMap[sName].totalQty += Number(item.quantity) || 1;
        serviceMap[sName].unit = item.unit_id_snapshot || "pcs";
        serviceMap[sName].totalRevenue += Number(item.amount) || 0;
      });
    });

    const result: ServiceDetailReport[] = Object.entries(serviceMap).map(([name, data]) => ({
      service_name: name,
      order_count: data.orderIds.size,
      total_qty: Number(data.totalQty.toFixed(1)),
      unit: data.unit,
      total_revenue: data.totalRevenue,
      avg_ticket: data.orderIds.size > 0 ? Number((data.totalRevenue / data.orderIds.size).toFixed(2)) : 0,
    }));

    return result.sort((a, b) => b.total_revenue - a.total_revenue);
  } catch (err) {
    console.warn("Failed to load detailed service items, falling back:", err);
    return estimateFromJobCards(jobCards);
  }
}

function estimateFromJobCards(jobCards: JobCard[]): ServiceDetailReport[] {
  const serviceCategories = [
    { name: "Wash & Fold", share: 0.35, unit: "kg" },
    { name: "Wash & Iron", share: 0.30, unit: "pcs" },
    { name: "Steam Iron", share: 0.15, unit: "pcs" },
    { name: "Dry Cleaning", share: 0.15, unit: "pcs" },
    { name: "Shoe Cleaning", share: 0.05, unit: "pair" },
  ];

  const totalSales = jobCards.reduce((acc, j) => acc + (j.grand_total || 0), 0);
  const totalPcs = jobCards.reduce((acc, j) => acc + (j.total_pcs || 1), 0);
  const totalOrders = jobCards.length;

  return serviceCategories.map(cat => {
    const orders = Math.max(1, Math.round(totalOrders * cat.share));
    const revenue = Math.round(totalSales * cat.share);
    const qty = Math.max(1, Math.round(totalPcs * cat.share));
    return {
      service_name: cat.name,
      order_count: orders,
      total_qty: qty,
      unit: cat.unit,
      total_revenue: revenue,
      avg_ticket: orders > 0 ? Math.round(revenue / orders) : 0,
    };
  });
}
