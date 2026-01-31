'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
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
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      suburb: formData.get('suburb') as string,
      postcode: formData.get('postcode') as string,
      job_type: formData.get('job_type') as string,
      preferred_date: formData.get('preferred_date') as string,
      preferred_time_window: formData.get('preferred_time_window') as string,
      notes: formData.get('notes') as string,
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Request Received!</CardTitle>
            <CardDescription className="text-center">
              Thanks for your cleaning request. We'll get back to you within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
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
        <p className="hero-pill">Book Your Cleaning</p>
        <h1 className="text-4xl md:text-5xl">Get booked faster than ever before</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Capture jobs, confirm availability, and let TradieFlow automate the follow-up so
          you can keep cleaning instead of chasing leads.
        </p>
      </div>

      <Card className="glass-card w-full">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Request a Quote</CardTitle>
          <CardDescription>
            Tell us the essentials and we’ll email you a fast reply within 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-grid">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" name="name" required placeholder="John Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="0400 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_type">Cleaning Type *</Label>
                <Select id="job_type" name="job_type" required>
                  <option value="">Select type</option>
                  <option value="end_of_lease">End of Lease</option>
                  <option value="regular">Regular Cleaning</option>
                  <option value="deep_clean">Deep Clean</option>
                  <option value="spring_clean">Spring Clean</option>
                  <option value="once_off">Once-Off Clean</option>
                </Select>
              </div>
            </div>

            <div className="form-grid">
              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb *</Label>
                <Input id="suburb" name="suburb" required placeholder="Sydney" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input id="postcode" name="postcode" required placeholder="2000" />
              </div>
            </div>

            <div className="form-grid">
              <div className="space-y-2">
                <Label htmlFor="preferred_date">Preferred Date</Label>
                <Input id="preferred_date" name="preferred_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_time_window">Preferred Time</Label>
                <Select id="preferred_time_window" name="preferred_time_window">
                  <option value="">Select time</option>
                  <option value="morning">Morning (8am-12pm)</option>
                  <option value="afternoon">Afternoon (12pm-5pm)</option>
                  <option value="evening">Evening (5pm-8pm)</option>
                  <option value="flexible">Flexible</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Details</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Number of bedrooms, bathrooms, any special requirements..."
                rows={4}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" className="primary-btn w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Request Quote"}
            </Button>

            <p className="form-note text-center">
              By submitting this form, you agree to be contacted about your cleaning request.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
