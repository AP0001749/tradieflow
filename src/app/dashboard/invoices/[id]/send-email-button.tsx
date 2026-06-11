"use client";

import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { sendInvoiceEmail } from "../actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SendEmailButtonProps {
  invoiceId: string;
}

export function SendEmailButton({ invoiceId }: SendEmailButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendEmail = async () => {
    setIsLoading(true);

    try {
      const result = await sendInvoiceEmail(invoiceId);

      if (result.success) {
        toast.success("Invoice email sent successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to send email");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSendEmail}
      disabled={isLoading}
      size="sm"
      variant="outline"
    >
      <Mail className="w-4 h-4 mr-2" />
      {isLoading ? "Sending..." : "Send Email"}
    </Button>
  );
}
