"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackSignUpConversion } from "@/utils/gtag";
import { createClient } from "@/lib/supabase/client";
import type { EnhancedConversionData } from "@/utils/enhanced-conversions";

export default function WelcomePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<EnhancedConversionData | undefined>();
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const conversionFired = useRef(false);

  useEffect(() => {
    // Fetch user data for enhanced conversions
    async function fetchUserData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Prepare enhanced conversion data from available user info
        const enhancedData: EnhancedConversionData = {
          email: user.email,
        };

        // Extract name from user_metadata if available (from Google OAuth or signup form)
        if (user.user_metadata?.full_name) {
          const nameParts = user.user_metadata.full_name.split(' ');
          enhancedData.first_name = nameParts[0];
          if (nameParts.length > 1) {
            enhancedData.last_name = nameParts.slice(1).join(' ');
          }
        } else if (user.user_metadata?.name) {
          const nameParts = user.user_metadata.name.split(' ');
          enhancedData.first_name = nameParts[0];
          if (nameParts.length > 1) {
            enhancedData.last_name = nameParts.slice(1).join(' ');
          }
        }

        // Add phone if available
        if (user.phone) {
          enhancedData.phone_number = user.phone;
        }

        setUserData(enhancedData);
      }
      setUserDataLoaded(true);
    }

    fetchUserData();
  }, []);

  useEffect(() => {
    // Wait for user data fetch to complete before firing conversion
    if (!userDataLoaded) return;
    // Only fire conversion once (ref persists across re-renders)
    if (conversionFired.current) return;
    conversionFired.current = true;

    let redirected = false;

    const handleRedirect = () => {
      if (!redirected) {
        redirected = true;
        router.push("/dashboard");
      }
    };

    // Track Google Ads sign-up conversion with enhanced conversions
    // Must be async to properly hash user data before sending
    async function fireConversion() {
      await trackSignUpConversion(userData, handleRedirect);
    }

    fireConversion();

    // Safety fallback: Force redirect after 5 seconds if callback fails
    // (e.g., ad-blocker, network timeout, or gtag script error)
    const safetyTimer = setTimeout(handleRedirect, 5000);

    return () => clearTimeout(safetyTimer);
  }, [router, userData, userDataLoaded]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-background to-background dark:from-emerald-950/30 dark:via-background" />

      <Card className="w-full max-w-md border-border bg-card text-card-foreground shadow-lg relative z-10">
        <CardHeader className="space-y-2 text-center pb-6 pt-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="p-4 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to TradieFlow!
          </h1>
          
          <p className="text-muted-foreground text-base pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
            Your account has been created successfully
          </p>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-8">
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '400ms' }}>
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Briefcase className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Manage Customers, Jobs, and Lead Recovery
                </p>
                <p className="text-xs text-muted-foreground">
                  Track urgent jobs, send invoices, and keep high-value leads in play
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '500ms' }}>
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              Get Started
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Redirecting automatically...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
