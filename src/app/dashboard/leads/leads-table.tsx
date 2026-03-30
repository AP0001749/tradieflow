'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateLeadStatus, convertLeadToJob } from './actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  suburb: string;
  postcode: string;
  job_type: string;
  status: string;
  preferred_date: string | null;
  preferred_time_window: string | null;
  notes: string | null;
  created_at: string;
  next_followup_at: string | null;
  followup_step: number;
}

interface LeadsTableProps {
  leads: Lead[];
  bookingUrlSlug?: string | null;
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'booked':
      return 'demo booked';
    default:
      return status;
  }
}

export default function LeadsTable({ leads, bookingUrlSlug }: LeadsTableProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || '';
  const onboardingFormUrl = bookingUrlSlug
    ? `${appOrigin.replace(/\/+$/, '')}/book/${bookingUrlSlug}`
    : '/dashboard/settings';

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setProcessingId(leadId);
    setErrorMessage(null);
    try {
      await updateLeadStatus(leadId, newStatus);
      router.refresh();
    } catch (error) {
      console.error('Failed to update status:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update lead status'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleConvert = async (leadId: string) => {
    setProcessingId(leadId);
    setErrorMessage(null);
    try {
      const jobId = await convertLeadToJob(leadId);
      router.push(`/dashboard/jobs/${jobId}`);
    } catch (error) {
      console.error('Failed to convert:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to convert lead to job'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'border-transparent bg-sky-500/15 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200';
      case 'contacted':
        return 'border-transparent bg-amber-500/15 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200';
      case 'booked':
        return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200';
      case 'won':
        return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200';
      case 'lost':
        return 'border-transparent bg-muted text-muted-foreground';
      case 'stale':
        return 'border-transparent bg-orange-500/15 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200';
      default:
        return 'border-transparent bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-12 text-center shadow-sm">
        <p className="text-muted-foreground">No leads yet. Share your onboarding form to start receiving setup requests.</p>
        <p className="text-sm text-muted-foreground/80 mt-2">
          {bookingUrlSlug ? (
            <>
              Your onboarding form URL:{' '}
              <span className="font-mono break-all">{onboardingFormUrl}</span>
            </>
          ) : (
            <>
              Set your booking link in{' '}
              <Link href={onboardingFormUrl} className="font-medium underline">
                Settings
              </Link>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-sm">
      {errorMessage ? (
        <div className="border-b border-border/60 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{errorMessage}</p>
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Job Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Next Follow-up</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(lead.created_at)}
              </TableCell>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell className="text-sm">
                <div>{lead.email}</div>
                <div className="text-muted-foreground">{lead.phone}</div>
              </TableCell>
              <TableCell className="text-sm">
                {lead.suburb} {lead.postcode}
              </TableCell>
              <TableCell className="text-sm">
                {lead.job_type?.replaceAll('_', ' ')}
              </TableCell>
              <TableCell>
                <Badge className={cn(getStatusColor(lead.status), "capitalize")}>
                  {getStatusLabel(lead.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {lead.next_followup_at ? (
                  <>
                    {formatDate(lead.next_followup_at)}
                    <span className="text-xs block text-muted-foreground/80">
                      Step {lead.followup_step}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground/70">--</span>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                {lead.status === 'new' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processingId === lead.id}
                    onClick={() => handleStatusChange(lead.id, 'contacted')}
                  >
                    Mark Contacted
                  </Button>
                )}
                {(lead.status === 'new' || lead.status === 'contacted') && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processingId === lead.id}
                    onClick={() => handleStatusChange(lead.id, 'booked')}
                  >
                    Mark Demo Booked
                  </Button>
                )}
                {lead.status === 'booked' && (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={processingId === lead.id}
                    onClick={() => handleConvert(lead.id)}
                  >
                    Convert to Job
                  </Button>
                )}
                {(lead.status === 'new' || lead.status === 'contacted') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={processingId === lead.id}
                    onClick={() => handleStatusChange(lead.id, 'lost')}
                  >
                    Mark Lost
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
