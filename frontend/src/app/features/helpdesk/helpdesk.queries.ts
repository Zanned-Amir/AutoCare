import { inject } from '@angular/core';
import {
  QueryClient,
  injectMutation,
  injectQuery,
  keepPreviousData,
} from '@tanstack/angular-query-experimental';

import { AgentTicketFilters, HelpdeskApi, NewTicket } from './helpdesk.api';
import { SlaPolicy, TicketCategory, TicketPriority, TicketStatus } from './helpdesk.types';

export const helpdeskKeys = {
  all: ['helpdesk'] as const,
  mine: (page: number) => [...helpdeskKeys.all, 'mine', page] as const,
  ticket: (id: string) => [...helpdeskKeys.all, 'ticket', id] as const,
  agent: (f: AgentTicketFilters) => [...helpdeskKeys.all, 'agent', f] as const,
  agentTicket: (id: string) => [...helpdeskKeys.all, 'agent-ticket', id] as const,
};

export function injectMyTicketsQuery(page: () => number) {
  const api = inject(HelpdeskApi);
  return injectQuery(() => ({
    queryKey: helpdeskKeys.mine(page()),
    queryFn: () => api.listMyTickets(page()),
    placeholderData: keepPreviousData,
  }));
}

export function injectTicketQuery(id: () => string) {
  const api = inject(HelpdeskApi);
  return injectQuery(() => ({
    queryKey: helpdeskKeys.ticket(id()),
    queryFn: () => api.getTicket(id()),
    retry: false,
  }));
}

export function injectTicketMessagesQuery(id: () => string) {
  const api = inject(HelpdeskApi);
  return injectQuery(() => ({
    queryKey: [...helpdeskKeys.ticket(id()), 'messages'],
    queryFn: () => api.listMessages(id()),
  }));
}

export function injectCustomerTicketMutations() {
  const api = inject(HelpdeskApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: helpdeskKeys.all });
  return {
    create: injectMutation(() => ({
      mutationFn: (value: NewTicket) => api.createTicket(value),
      onSuccess,
    })),
    reply: injectMutation(() => ({
      mutationFn: ({ id, body }: { id: string; body: string }) => api.reply(id, body),
      onSuccess,
    })),
    close: injectMutation(() => ({ mutationFn: (id: string) => api.closeTicket(id), onSuccess })),
    reopen: injectMutation(() => ({ mutationFn: (id: string) => api.reopenTicket(id), onSuccess })),
  };
}

export function injectHelpdeskStatsQuery() {
  const api = inject(HelpdeskApi);
  return injectQuery(() => ({
    queryKey: [...helpdeskKeys.all, 'stats'],
    queryFn: () => api.stats(),
  }));
}

export function injectAgentTicketsQuery(filters: () => AgentTicketFilters) {
  const api = inject(HelpdeskApi);
  return injectQuery(() => ({
    queryKey: helpdeskKeys.agent(filters()),
    queryFn: () => api.searchTickets(filters()),
    placeholderData: keepPreviousData,
  }));
}

export function injectAgentTicketQuery(id: () => string) {
  const api = inject(HelpdeskApi);
  return injectQuery(() => ({
    queryKey: helpdeskKeys.agentTicket(id()),
    queryFn: () => api.getAgentTicket(id()),
    retry: false,
  }));
}

export function injectAgentMessagesQuery(id: () => string) {
  const api = inject(HelpdeskApi);
  return injectQuery(() => ({
    queryKey: [...helpdeskKeys.agentTicket(id()), 'messages'],
    queryFn: () => api.listAgentMessages(id()),
  }));
}

export function injectTicketEventsQuery(id: () => string) {
  const api = inject(HelpdeskApi);
  return injectQuery(() => ({
    queryKey: [...helpdeskKeys.agentTicket(id()), 'events'],
    queryFn: () => api.listEvents(id()),
  }));
}

export function injectSlaPoliciesQuery() {
  const api = inject(HelpdeskApi);
  return injectQuery(() => ({
    queryKey: [...helpdeskKeys.all, 'sla'],
    queryFn: () => api.listSlaPolicies(),
  }));
}

export function injectAgentTicketMutations(id: () => string) {
  const api = inject(HelpdeskApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: helpdeskKeys.all });
  return {
    pick: injectMutation(() => ({ mutationFn: () => api.pick(id()), onSuccess })),
    release: injectMutation(() => ({ mutationFn: () => api.release(id()), onSuccess })),
    reply: injectMutation(() => ({
      mutationFn: (v: { body: string; internal: boolean; status: TicketStatus | null }) =>
        api.agentReply(id(), v.body, v.internal, v.status),
      onSuccess,
    })),
    status: injectMutation(() => ({
      mutationFn: (status: TicketStatus) => api.changeStatus(id(), status),
      onSuccess,
    })),
    update: injectMutation(() => ({
      mutationFn: (change: { priority?: TicketPriority; category?: TicketCategory }) =>
        api.updateTicket(id(), change),
      onSuccess,
    })),
    escalate: injectMutation(() => ({
      mutationFn: (reason: string) => api.escalate(id(), reason),
      onSuccess,
    })),
  };
}

export function injectUpdateSlaPolicyMutation() {
  const api = inject(HelpdeskApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: (policy: SlaPolicy) => api.updateSlaPolicy(policy),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...helpdeskKeys.all, 'sla'] }),
  }));
}
