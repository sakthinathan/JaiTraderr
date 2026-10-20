import { formatINR, formatLocalDate } from "./formatters";

export interface WhatsAppOrderDetails {
  customer_name?: string;
  customer_mobile?: string;
  job_card_number: string;
  grand_total: number;
  advance_paid: number;
  balance_due: number;
  shelf_location?: string | null;
  status: string;
}

export interface WhatsAppWorkflowDetails {
  customer_name?: string;
  customer_mobile?: string;
  job_card_number: string;
  balance_due: number;
  shelf_location?: string | null;
  status: string;
  expected_delivery_date?: string;
}

export function formatWhatsAppMobile(mobile: string | undefined | null): string {
  const cleanMobile = (mobile || "").replace(/\D/g, "");
  if (!cleanMobile) return "";
  return cleanMobile.startsWith("91") ? cleanMobile : `91${cleanMobile}`;
}

export function buildReceiptWhatsAppUrl(order: WhatsAppOrderDetails): string {
  const name = order.customer_name || "Customer";
  const num = order.job_card_number;
  const total = formatINR(order.grand_total);
  const advance = formatINR(order.advance_paid);
  const balance = formatINR(order.balance_due);
  const shelf = order.shelf_location || "N/A";

  let text = `*JaiTraderr Laundry Billing Receipt*\n\n`;
  text += `Dear *${name}*,\n`;
  text += `Here is your summary for Order *${num}*:\n\n`;
  text += `• Total Billed: ${total}\n`;
  text += `• Advance Paid: ${advance}\n`;
  text += `• Balance Due: ${balance}\n`;
  if (order.status === "READY_FOR_DELIVERY") {
    text += `• Status: *Ready for Pickup*\n`;
    text += `• Shelf Location: *${shelf}*\n`;
  } else {
    text += `• Status: *${order.status}*\n`;
  }
  text += `\nThank you for choosing JaiTraderr! For questions, call us directly.`;

  const formattedMobile = formatWhatsAppMobile(order.customer_mobile);
  return `https://wa.me/${formattedMobile}?text=${encodeURIComponent(text)}`;
}

export function buildWorkflowWhatsAppUrl(order: WhatsAppWorkflowDetails): string {
  const name = order.customer_name || "Customer";
  const num = order.job_card_number;
  const balance = formatINR(order.balance_due);
  const shelf = order.shelf_location || "N/A";

  let text = `*JaiTraderr Laundry Order Update*\n\n`;
  text += `Dear *${name}*,\n`;
  text += `Your order *${num}* is currently in *${order.status}* stage.\n`;
  if (order.status === "READY_FOR_DELIVERY") {
    text += `\nYour clothes are *READY FOR PICKUP*! 🧺\n`;
    text += `• Shelf Location: *${shelf}*\n`;
    text += `• Balance Due: ${balance}\n`;
  } else if (order.status === "DELIVERED") {
    text += `\nYour clothes have been *DELIVERED*. Thank you!\n`;
  } else {
    text += `\nWe are actively working on it. Expected completion date: ${formatLocalDate(order.expected_delivery_date)}\n`;
  }
  text += `\nThank you for choosing JaiTraderr!`;

  const formattedMobile = formatWhatsAppMobile(order.customer_mobile);
  return `https://wa.me/${formattedMobile}?text=${encodeURIComponent(text)}`;
}
