import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import {
  AgentTicket,
  HelpdeskStats,
  SlaPolicy,
  Ticket,
  TicketCategory,
  TicketEvent,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from './helpdesk.types';

export interface NewTicket {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

export interface AgentTicketFilters {
  status: TicketStatus | null;
  priority: TicketPriority | null;
  assignee: string | null;
  q: string;
  page: number;
}

@Injectable({ providedIn: 'root' })
export class HelpdeskApi {
  private readonly http = inject(HttpClient);
  private readonly mine = `${API_URL}/helpdesk/tickets`;
  private readonly admin = `${API_URL}/admin/helpdesk`;

  // Customer
  listMyTickets(page: number): Promise<Page<Ticket>> {
    return firstValueFrom(
      this.http.get<Page<Ticket>>(this.mine, { params: new HttpParams().set('page', page) }),
    );
  }
  createTicket(value: NewTicket): Promise<Ticket> {
    return firstValueFrom(this.http.post<Ticket>(this.mine, { ...value, channel: 'WEB' }));
  }
  getTicket(id: string): Promise<Ticket> {
    return firstValueFrom(this.http.get<Ticket>(`${this.mine}/${id}`));
  }
  listMessages(id: string): Promise<TicketMessage[]> {
    return firstValueFrom(this.http.get<TicketMessage[]>(`${this.mine}/${id}/messages`));
  }
  reply(id: string, body: string): Promise<TicketMessage> {
    return firstValueFrom(this.http.post<TicketMessage>(`${this.mine}/${id}/messages`, { body }));
  }
  closeTicket(id: string): Promise<Ticket> {
    return firstValueFrom(this.http.post<Ticket>(`${this.mine}/${id}/close`, null));
  }
  reopenTicket(id: string): Promise<Ticket> {
    return firstValueFrom(this.http.post<Ticket>(`${this.mine}/${id}/reopen`, null));
  }

  // Agent
  stats(): Promise<HelpdeskStats> {
    return firstValueFrom(this.http.get<HelpdeskStats>(`${this.admin}/stats`));
  }
  searchTickets(f: AgentTicketFilters): Promise<Page<AgentTicket>> {
    let params = new HttpParams().set('page', f.page).set('size', 20);
    if (f.status) params = params.set('status', f.status);
    if (f.priority) params = params.set('priority', f.priority);
    if (f.assignee) params = params.set('assignee', f.assignee);
    if (f.q.trim()) params = params.set('q', f.q.trim());
    return firstValueFrom(this.http.get<Page<AgentTicket>>(`${this.admin}/tickets`, { params }));
  }
  getAgentTicket(id: string): Promise<AgentTicket> {
    return firstValueFrom(this.http.get<AgentTicket>(`${this.admin}/tickets/${id}`));
  }
  listAgentMessages(id: string): Promise<TicketMessage[]> {
    return firstValueFrom(this.http.get<TicketMessage[]>(`${this.admin}/tickets/${id}/messages`));
  }
  listEvents(id: string): Promise<TicketEvent[]> {
    return firstValueFrom(this.http.get<TicketEvent[]>(`${this.admin}/tickets/${id}/events`));
  }
  pick(id: string): Promise<AgentTicket> {
    return firstValueFrom(this.http.post<AgentTicket>(`${this.admin}/tickets/${id}/pick`, null));
  }
  release(id: string): Promise<AgentTicket> {
    return firstValueFrom(this.http.post<AgentTicket>(`${this.admin}/tickets/${id}/release`, null));
  }
  agentReply(
    id: string,
    body: string,
    internal: boolean,
    status: TicketStatus | null,
  ): Promise<TicketMessage> {
    return firstValueFrom(
      this.http.post<TicketMessage>(`${this.admin}/tickets/${id}/messages`, {
        body,
        internal,
        status,
      }),
    );
  }
  changeStatus(id: string, status: TicketStatus): Promise<AgentTicket> {
    return firstValueFrom(
      this.http.patch<AgentTicket>(`${this.admin}/tickets/${id}/status`, { status }),
    );
  }
  updateTicket(
    id: string,
    change: { priority?: TicketPriority; category?: TicketCategory },
  ): Promise<AgentTicket> {
    return firstValueFrom(this.http.patch<AgentTicket>(`${this.admin}/tickets/${id}`, change));
  }
  escalate(id: string, reason: string): Promise<AgentTicket> {
    return firstValueFrom(
      this.http.post<AgentTicket>(`${this.admin}/tickets/${id}/escalate`, { reason }),
    );
  }
  listSlaPolicies(): Promise<SlaPolicy[]> {
    return firstValueFrom(this.http.get<SlaPolicy[]>(`${this.admin}/sla-policies`));
  }
  updateSlaPolicy(policy: SlaPolicy): Promise<SlaPolicy> {
    return firstValueFrom(
      this.http.put<SlaPolicy>(`${this.admin}/sla-policies/${policy.priority}`, policy),
    );
  }
}
