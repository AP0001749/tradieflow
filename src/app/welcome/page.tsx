"use client";

import { useEffect, useState } from "react";
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
    }

    fetchUserData();
  }, []);

  useEffect(() => {
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
      if (userData) {
        await trackSignUpConversion(userData, handleRedirect);
      } else {
        // Fallback: track without enhanced data if user data isn't available
        await trackSignUpConversion(undefined, handleRedirect);
      }
    }

    fireConversion();

    // Safety fallback: Force redirect after 5 seconds if callback fails
    // (e.g., ad-blocker, network timeout, or gtag script error)
    const safetyTimer = setTimeout(handleRedirect, 5000);

    return () => clearTimeout(safetyTimer);
  }, [router, userData]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12 overflow-hidden">
      {/* Premium Gradient Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,_var(--tw-gradient-stops))] from-emerald-300/40 via-background to-background dark:from-emerald-900/40 dark:via-background animate-in fade-in duration-1000" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-green-300/30 via-transparent to-transparent dark:from-green-900/30 animate-in fade-in duration-1000" style={{ animationDelay: '200ms' }} />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 dark:bg-emerald-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-green-500/20 dark:bg-green-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '4s' }} />

      <Card className="w-full max-w-md border-border/40 bg-card/60 backdrop-blur-2xl text-card-foreground shadow-2xl shadow-black/10 dark:shadow-black/30 relative z-10 animate-in fade-in zoom-in duration-700">
        <CardHeader className="space-y-2 text-center pb-6 pt-8">
          <div className="flex justify-center mb-4 animate-in zoom-in duration-500" style={{ animationDelay: '100ms' }}>
            <div className="relative">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 shadow-xl shadow-emerald-500/20 backdrop-blur-sm">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 dark:text-emerald-400" />
              </div>
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
            <span className="bg-gradient-to-br from-emerald-500 to-green-600 bg-clip-text text-transparent">
              Welcome to TradieFlow!
            </span>
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
                  Manage Clients & Jobs
                </p>
                <p className="text-xs text-muted-foreground">
                  Track jobs, create invoices, and grow your business
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '500ms' }}>
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/30 dark:shadow-emerald-500/20"
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
