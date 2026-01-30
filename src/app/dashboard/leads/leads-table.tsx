'use client';

import { useState } from 'react';
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
}

export default function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setProcessingId(leadId);
    try {
      await updateLeadStatus(leadId, newStatus);
      router.refresh();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConvert = async (leadId: string) => {
    setProcessingId(leadId);
    try {
      const jobId = await convertLeadToJob(leadId);
      router.push(`/dashboard/jobs/${jobId}`);
    } catch (error) {
      console.error('Failed to convert:', error);
      alert('Failed to convert lead to job');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-purple-100 text-purple-800';
      case 'booked': return 'bg-green-100 text-green-800';
      case 'won': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-gray-100 text-gray-800';
      case 'stale': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="bg-white rounded-lg border p-12 text-center">
        <p className="text-gray-600">No leads yet. Share your booking page to start receiving leads!</p>
        <p className="text-sm text-gray-500 mt-2">
          Your booking URL: <span className="font-mono">/book</span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
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
              <TableCell className="text-sm text-gray-600">
                {formatDate(lead.created_at)}
              </TableCell>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell className="text-sm">
                <div>{lead.email}</div>
                <div className="text-gray-600">{lead.phone}</div>
              </TableCell>
              <TableCell className="text-sm">
                {lead.suburb} {lead.postcode}
              </TableCell>
              <TableCell className="text-sm">
                {lead.job_type?.replace('_', ' ')}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {lead.next_followup_at ? (
                  <>
                    {formatDate(lead.next_followup_at)}
                    <span className="text-xs block text-gray-500">
                      Step {lead.followup_step}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400">—</span>
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
                    Mark Booked
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
