import "server-only";

import twilio from "twilio";

function getPhoneDigits(value: string | null | undefined) {
  return (value || "").replace(/\D+/g, "");
}

function phoneNumbersMatch(left: string | null | undefined, right: string | null | undefined) {
  const leftDigits = getPhoneDigits(left);
  const rightDigits = getPhoneDigits(right);

  if (!leftDigits || !rightDigits) {
    return false;
  }

  return leftDigits === rightDigits || leftDigits.endsWith(rightDigits.slice(-9));
}

export async function assertTwilioNumberOwnedByAccount(phoneNumber: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!accountSid || !authToken) {
    throw new Error("Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN before assigning a number.");
  }

  const client = twilio(accountSid, authToken);
  const numbers = await client.incomingPhoneNumbers.list({ limit: 100 });
  const owned = numbers.some((entry) => phoneNumbersMatch(entry.phoneNumber, phoneNumber));

  if (!owned) {
    throw new Error(
      "That Twilio number is not owned by the configured Twilio account. Provision the number in Twilio, then save it here."
    );
  }
}
