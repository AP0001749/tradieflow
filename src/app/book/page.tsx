'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BookPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const businessName = (formData.get('business_name') as string) || '';
    const yourName = (formData.get('your_name') as string) || '';
    const mobile = (formData.get('mobile') as string) || '';
    const email = (formData.get('email') as string) || '';
    const serviceArea = (formData.get('service_area') as string) || '';
    const serviceType = (formData.get('service_type') as string) || '';
    const abn = (formData.get('abn') as string) || '';
    const notes = (formData.get('notes') as string) || '';

    if (!yourName || !email || !mobile || !serviceArea || !serviceType) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    const data = {
      business_name: businessName,
      your_name: yourName,
      mobile,
      email,
      service_area: serviceArea,
      service_type: serviceType,
      abn,
      notes,
    };

    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      setIsSuccess(true);

      // Fire Google Ads conversion if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
          send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL',
          value: 1.0,
          currency: 'AUD',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="glass-card max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Request Received!</CardTitle>
            <CardDescription className="text-center">
              Thanks for your cleaning request. We'll get back to you within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Check your email for a confirmation message.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-8">
      <div className="text-center space-y-3">
        <p className="hero-pill">TradieFlow for cleaners</p>
        <h1 className="tf-display text-4xl md:text-5xl">Get more cleaning jobs - without chasing leads</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Capture new enquiries, confirm availability, and let TradieFlow follow up automatically -
          so your cleaning business can focus on the work, not the admin. Local launch for Melbourne cleaning businesses.
        </p>
        <p className="text-sm text-muted-foreground">Set up in minutes. No lock-in. Built specifically for independent cleaners and small teams.</p>
      </div>

      <Card className="glass-card w-full">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Get early access for your cleaning business</CardTitle>
          <CardDescription>
            Tell us a few details and we'll set you up with TradieFlow for your Melbourne cleaning business.
          </CardDescription>
          <p className="text-xs text-muted-foreground">This is for cleaning businesses only (not customers requesting a clean).</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-grid">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business name *</Label>
                <Input id="business_name" name="business_name" required placeholder="e.g. Bright Clean Co" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="your_name">Your name *</Label>
                <Input id="your_name" name="your_name" required placeholder="e.g. John Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile *</Label>
                <Input id="mobile" name="mobile" required placeholder="04xx xxx xxx" />
              </div>
            </div>

            <div className="form-grid">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required placeholder="you@yourbusiness.com.au" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_area">Suburb / service area *</Label>
                <Input
                  id="service_area"
                  name="service_area"
                  required
                  placeholder="e.g. Tarneit, Point Cook, Werribee"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abn">ABN (optional)</Label>
                <Input id="abn" name="abn" placeholder="11 digits" />
                <p className="text-xs text-muted-foreground">
                  Include your ABN so we can prefill your first invoice without chasing paperwork.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_type">Cleaning service type *</Label>
                <Select id="service_type" name="service_type" required>
                  <option value="">Select service</option>
                  <option value="residential">Residential cleaning</option>
                  <option value="end_of_lease">End of lease / bond cleaning</option>
                  <option value="commercial">Commercial / office cleaning</option>
                  <option value="airbnb">Airbnb / short-stay</option>
                  <option value="mixed">Mixed services</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Anything we should know? (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Small teams, current tools, or what you want automated"
                rows={4}
              />
            </div>

            {error && (
              <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="primary-btn w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Get access"}
            </Button>

            <p className="form-note text-center">
              We'll contact you to help activate your TradieFlow workspace.<br />
              By submitting this form, you agree to be contacted about setting up TradieFlow for your cleaning business.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
