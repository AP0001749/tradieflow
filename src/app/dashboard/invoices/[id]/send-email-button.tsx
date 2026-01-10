"use client";

import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { sendInvoiceEmail } from "../actions";
import { useState } from "react";

interface SendEmailButtonProps {
  invoiceId: string;
}

export function SendEmailButton({ invoiceId }: SendEmailButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSendEmail = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await sendInvoiceEmail(invoiceId);

      if (result.success) {
        setMessage({ type: "success", text: "Invoice email sent successfully!" });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send email" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleSendEmail}
        disabled={isLoading}
        size="sm"
        variant="outline"
      >
        <Mail className="w-4 h-4 mr-2" />
        {isLoading ? "Sending..." : "Send Email"}
      </Button>
      
      {message && (
        <div
          className={`text-xs px-3 py-2 rounded-md ${
            message.type === "success" 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
