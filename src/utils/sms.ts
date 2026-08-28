import crypto from "crypto";

/**
 * Sends a WhatsApp OTP to a Supervisor.
 * Uses WhatsApp Business Cloud API in production, and falls back to logging/alerts in development.
 */
export async function sendSupervisorOtp(
  supervisorPhone: string,
  otpCode: string,
  jobCardNumber: string
): Promise<boolean> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const isProd = process.env.NODE_ENV === "production";
  
  if (!isProd || !token || !phoneId) {
    console.log(`[DEVELOPMENT DRY-RUN OTP DISPATCH]`);
    console.log(`Recipient: ${supervisorPhone}`);
    console.log(`Message: OTP code is ${otpCode} to unlock job card ${jobCardNumber}`);
    return true;
  }

  try {
    // Standard Meta WhatsApp Cloud API request
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: supervisorPhone,
        type: "template",
        template: {
          name: "supervisor_approval_otp", // Needs to be approved in your Meta App Dashboard
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: jobCardNumber },
                { type: "text", text: otpCode },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                { type: "text", text: otpCode } // For copy-paste button if configured
              ]
            }
          ],
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("WhatsApp API returned error:", data);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp OTP:", error);
    return false;
  }
}

/**
 * Helper to generate a SHA-256 hash of a string.
 */
export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}
