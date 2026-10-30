/**
 * Probe Twilio account credentials and production voice webhook wiring.
 *
 * Usage:
 *   node scripts/probe-twilio-production.mjs
 *   node scripts/probe-twilio-production.mjs --voice-probe
 *
 * Loads .env.production.local from repo root. Does not print auth tokens.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import twilio from "twilio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env.production.local");
const voiceProbe = process.argv.includes("--voice-probe");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${filePath} not found`);
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function mask(value) {
  if (!value) return "(missing)";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

loadEnvFile(envPath);

const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");

if (!accountSid || !authToken) {
  console.error("FAIL: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.");
  process.exit(1);
}

const client = twilio(accountSid, authToken);
const report = {
  checked_at: new Date().toISOString(),
  app_url: appUrl || null,
  account_sid: mask(accountSid),
  account: null,
  numbers: [],
  voice_probe: null,
  issues: [],
};

try {
  report.account = await client.api.v2010.accounts(accountSid).fetch();
  console.log(`PASS: Twilio account authenticated (${report.account.friendlyName})`);
} catch (error) {
  report.issues.push(`Twilio authentication failed: ${error.message}`);
  console.error(`FAIL: Twilio authentication failed (${error.message})`);
  console.error(
    "Fix TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN locally and on the app host, then retry.",
  );
  process.exit(1);
}

const numbers = await client.incomingPhoneNumbers.list({ limit: 20 });
const expectedVoice = `${appUrl}/api/twilio/voice`;
const expectedSms = `${appUrl}/api/twilio/webhook`;

for (const number of numbers) {
  const entry = {
    phone: number.phoneNumber,
    voice_url: number.voiceUrl,
    voice_method: number.voiceMethod,
    sms_url: number.smsUrl,
    sms_method: number.smsMethod,
    voice_ok: number.voiceUrl === expectedVoice,
    sms_ok: number.smsUrl === expectedSms,
  };
  report.numbers.push(entry);

  if (entry.voice_ok && entry.sms_ok) {
    console.log(`PASS: ${number.phoneNumber} webhooks point at production routes.`);
  } else {
    console.log(`FAIL: ${number.phoneNumber} webhook mismatch.`);
    console.log(`      voice=${number.voiceUrl}`);
    console.log(`      sms=${number.smsUrl}`);
    report.issues.push(`${number.phoneNumber} webhook mismatch`);
  }
}

if (numbers.length === 0) {
  report.issues.push("No incoming phone numbers found on this Twilio account.");
  console.log("WARN: No incoming phone numbers found on this Twilio account.");
}

if (voiceProbe) {
  const target =
    report.numbers.find((entry) => entry.phone.includes("61485042397")) ||
    report.numbers[0];

  if (!target) {
    console.log("SKIP: Voice probe skipped because no Twilio numbers were found.");
  } else if (!appUrl) {
    console.log("SKIP: Voice probe skipped because NEXT_PUBLIC_APP_URL is missing.");
  } else {
    const callSid = `CA_probe_${Date.now()}`;
    const params = {
      AccountSid: accountSid,
      CallSid: callSid,
      From: "+61400000001",
      To: target.phone,
      CallStatus: "ringing",
      Direction: "inbound",
    };
    const voiceUrl = expectedVoice;
    const signature = twilio.getExpectedTwilioSignature(authToken, voiceUrl, params);
    const body = new URLSearchParams(params);
    const response = await fetch(voiceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Twilio-Signature": signature,
      },
      body,
    });
    const text = await response.text();
    report.voice_probe = {
      url: voiceUrl,
      to: target.phone,
      status: response.status,
      has_dial: text.includes("<Dial"),
      has_missed_call_action: text.includes("/api/twilio/missed-call"),
      body_preview: text.slice(0, 300),
    };

    if (response.status === 200 && report.voice_probe.has_dial) {
      console.log(`PASS: Production voice webhook returned Dial TwiML for ${target.phone}.`);
    } else {
      console.log(
        `FAIL: Production voice webhook probe returned HTTP ${response.status}.`,
      );
      report.issues.push(`Voice probe HTTP ${response.status}`);
    }
  }
}

const outputDir = path.join(repoRoot, "docs", "production-evidence");
fs.mkdirSync(outputDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(outputDir, `twilio-probe-${stamp}.json`);
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`INFO: Probe report saved to ${outputPath}`);

if (report.issues.length > 0) {
  process.exit(1);
}
