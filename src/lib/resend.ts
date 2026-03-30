import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export function getResendSenderEmail() {
  const senderEmail =
    process.env.RESEND_SENDER_EMAIL || process.env.RESEND_FROM_EMAIL;

  if (!senderEmail) {
    throw new Error(
      "RESEND_SENDER_EMAIL or RESEND_FROM_EMAIL environment variable is not set"
    );
  }

  return senderEmail;
}
