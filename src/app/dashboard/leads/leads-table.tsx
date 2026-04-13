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
import { LeadResponseActions } from '@/components/dashboard/lead-response-actions';
import { updateLeadStatus, convertLeadToJob } from './actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  formatLeadResponseDueAt,
  getLeadResponseSlaClassName,
  getLeadResponseSlaLabel,
  getLeadResponseSlaState,
  getLeadUrgencyBadgeClassName,
  getLeadUrgencyLabel,
  isLeadResponseOverdue,
} from '@/lib/lead-triage';

interface LatestMissedCallTextback {
  status: string;
  sent_at: string | null;
  updated_at: string | null;
  last_error: string | null;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  suburb: string | null;
  postcode: string | null;
  job_type: string | null;
  lead_urgency: string;
  response_due_at: string | null;
  triage_safety_risk: boolean;
  triage_problem: string | null;
  triage_site_risk: string | null;
  status: string;
  preferred_date: string | null;
  preferred_time_window: string | null;
  notes: string | null;
  created_at: string | null;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  followup_step: number | null;
  first_responded_at: string | null;
  sms_do_not_contact: boolean;
  sms_last_inbound_at: string | null;
  sms_last_inbound_intent: string | null;
  source: string | null;
  latest_missed_call_textback?: LatestMissedCallTextback | null;
}

interface LeadsTableProps {
  leads: Lead[];
  bookingUrlSlug?: string | null;
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'booked':
      return 'audit booked';
    default:
      return status;
  }
}

function getSourceLabel(source: string | null) {
  switch (source) {
    case 'missed_call_text_back':
      return 'Missed call';
    case 'booking_form':
      return 'Public form';
    default:
      return source?.replaceAll('_', ' ') || 'Lead';
  }
}

function getSmsIntentLabel(intent: string | null) {
  switch (intent) {
    case 'opt_out':
      return 'Opted out';
    case 'pricing':
      return 'Pricing reply';
    case 'interested':
      return 'Interested';
    case 'question':
      return 'Question';
    case 'wrong_number':
      return 'Wrong number';
    case 'other':
      return 'SMS reply';
    default:
      return null;
  }
}

function getTextbackStatusLabel(status: string) {
  switch (status) {
    case 'sent':
      return 'Text-back sent';
    case 'failed':
      return 'Text-back failed';
    case 'suppressed':
      return 'Text-back suppressed';
    case 'processing':
      return 'Text-back sending';
    default:
      return 'Text-back queued';
  }
}

function getTextbackStatusColor(status: string) {
  switch (status) {
    case 'sent':
      return 'text-emerald-700 dark:text-emerald-200';
    case 'failed':
      return 'text-destructive';
    case 'suppressed':
      return 'text-rose-700 dark:text-rose-200';
    case 'processing':
      return 'text-amber-700 dark:text-amber-200';
    default:
      return 'text-muted-foreground';
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return '--';
    }

    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderChannelDetail = (lead: Lead) => {
    if (lead.sms_do_not_contact) {
      return (
        <Badge className="border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200">
          SMS opted out
        </Badge>
      );
    }

    if (lead.sms_last_inbound_at) {
      return (
        <span className="text-xs text-muted-foreground">
          {getSmsIntentLabel(lead.sms_last_inbound_intent) || 'SMS reply'} {formatDate(lead.sms_last_inbound_at)}
        </span>
      );
    }

    if (lead.latest_missed_call_textback) {
      const textback = lead.latest_missed_call_textback;
      const statusDate = textback.sent_at || textback.updated_at;
      const showStatusDate = textback.status === 'sent' && statusDate;

      return (
        <span
          className={cn('text-xs', getTextbackStatusColor(textback.status))}
          title={textback.last_error || undefined}
        >
          {getTextbackStatusLabel(textback.status)}
          {showStatusDate ? ` ${formatDate(statusDate)}` : null}
        </span>
      );
    }

    if (lead.source === 'missed_call_text_back') {
      return <span className="text-xs text-muted-foreground">Text-back queued</span>;
    }

    return <span className="text-xs text-muted-foreground/70">Email follow-up</span>;
  };

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-12 text-center shadow-sm">
        <p className="text-muted-foreground">No leads yet. Share your public dispatch-audit link to start receiving missed-call and quote requests.</p>
        <p className="text-sm text-muted-foreground/80 mt-2">
          {bookingUrlSlug ? (
            <>
              Your public lead intake URL:{' '}
              <span className="font-mono break-all">{onboardingFormUrl}</span>
            </>
          ) : (
            <>
              Set your public lead link in{' '}
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
            <TableHead>Urgency</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Next Follow-up</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              {/*
                Keep SLA outcome per row so the open queue and post-response
                performance state are both visible without opening the lead.
              */}
              {(() => {
                const slaState = getLeadResponseSlaState({
                  firstRespondedAt: lead.first_responded_at,
                  lastContactedAt: lead.last_contacted_at,
                  responseDueAt: lead.response_due_at,
                  status: lead.status,
                });

                return (
                  <>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(lead.created_at)}
              </TableCell>
              <TableCell className="font-medium">
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="transition-colors hover:text-foreground hover:underline"
                >
                  {lead.name}
                </Link>
              </TableCell>
              <TableCell className="text-sm">
                <div>{lead.email || <span className="text-muted-foreground/70">No email</span>}</div>
                <div className="text-muted-foreground">{lead.phone || 'No phone'}</div>
              </TableCell>
              <TableCell className="text-sm">
                {lead.suburb} {lead.postcode}
              </TableCell>
              <TableCell className="text-sm">
                {lead.job_type?.replaceAll('_', ' ') || '--'}
                {lead.triage_problem ? (
                  <span className="mt-1 block max-w-[220px] truncate text-xs text-muted-foreground">
                    {lead.triage_problem}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-sm">
                <div className="flex flex-col items-start gap-1">
                  <Badge className={getLeadUrgencyBadgeClassName(lead.lead_urgency)}>
                    {getLeadUrgencyLabel(lead.lead_urgency)}
                  </Badge>
                  {lead.triage_safety_risk ? (
                    <Badge className="border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200">
                      Safety risk
                    </Badge>
                  ) : null}
                  <span
                    className={cn(
                      'text-xs',
                      isLeadResponseOverdue(lead.response_due_at, lead.status)
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                    )}
                  >
                    SLA {formatLeadResponseDueAt(lead.response_due_at)}
                  </span>
                  <Badge className={getLeadResponseSlaClassName(slaState)}>
                    {getLeadResponseSlaLabel(slaState)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <div className="flex flex-col items-start gap-1">
                  <Badge variant="outline" className="capitalize">
                    {getSourceLabel(lead.source)}
                  </Badge>
                  {renderChannelDetail(lead)}
                </div>
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
              <TableCell>
                <div className="flex flex-wrap justify-end gap-2">
                <LeadResponseActions lead={lead} align="end" />
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
                    Mark Audit Booked
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
                </div>
              </TableCell>
                  </>
                );
              })()}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
