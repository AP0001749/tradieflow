import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InvoiceEmailProps {
  businessName: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  invoiceUrl: string;
}

export function InvoiceEmail({
  businessName = "TradieFlow",
  clientName = "Valued Client",
  invoiceNumber = "INV-001",
  amount = "$1,000.00",
  dueDate = "January 15, 2026",
  invoiceUrl = "#",
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Service invoice {invoiceNumber} from {businessName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Service invoice from {businessName}</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={paragraph}>Hi {clientName},</Text>
            
            <Text style={paragraph}>
              Your invoice for site work completed is ready. Review the amount due and payment timing below.
            </Text>

            <Text style={paragraph}>
              This may cover a site assessment, call-out fee, repair, or install stage, depending on the work completed.
            </Text>

            <Section style={invoiceDetails}>
              <Text style={detailText}>
                <strong>Job / Invoice Number:</strong> {invoiceNumber}
              </Text>
              <Text style={detailText}>
                <strong>Amount Due:</strong> {amount}
              </Text>
              <Text style={detailText}>
                <strong>Due Date:</strong> {dueDate}
              </Text>
            </Section>

            {/* Call to Action */}
            <Section style={buttonContainer}>
              <Button style={button} href={invoiceUrl}>
                Review Invoice
              </Button>
            </Section>

            <Text style={paragraph}>
              Thanks for choosing {businessName}.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Powered by TradieFlow
            </Text>
            <Text style={footerTextSmall}>
              This is an automated email. Please do not reply to this message.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default InvoiceEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 40px",
  backgroundColor: "#1f2937",
  borderRadius: "8px 8px 0 0",
};

const h1 = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
  padding: "0",
};

const content = {
  padding: "0 40px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#374151",
};

const invoiceDetails = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const detailText = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
  margin: "4px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#1f2937",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 40px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  padding: "0 40px",
};

const footerText = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "8px 0",
};

const footerTextSmall = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "4px 0",
};
