// The fictional setting used in every scenario. Nothing here describes a real company,
// person, system or incident. All hostnames use the reserved .example top-level domain (RFC 2606).

export interface CastMember {
  name: string;
  role: string;
}

export const COMPANY = {
  name: 'ROCKTO Inc.',
  domain: 'rockto.example',
  summary:
    'A fictional mid-sized maker of industrial sensors that also runs SensorCloud, a multi-tenant monitoring service for its customers. ROCKTO is adopting AI across finance, HR, support and engineering.',
};

export const CAST: CastMember[] = [
  { name: 'Dana Okafor', role: 'Chief Financial Officer' },
  { name: 'Priya Raman', role: 'Accounts payable specialist' },
  { name: 'Ravi Kapoor', role: 'Payroll lead' },
  { name: 'Luc Tremblay', role: 'Application security engineer' },
  { name: 'Sam Ortiz', role: 'ML engineer' },
  { name: 'Ines Moreau', role: 'Privacy officer' },
  { name: 'Kofi Mensah', role: 'Platform engineer' },
  { name: 'Hana Sato', role: 'Security operations analyst' },
];

export const SYSTEMS: { name: string; description: string }[] = [
  { name: 'Rocky', description: 'The employee AI assistant at assist.rockto.example. It can search documents, summarize, and call approved tools.' },
  { name: 'AP Assist', description: 'The accounts-payable workflow in Rocky. Reads supplier emails and PDFs, extracts invoice fields, and can draft (not release) payments.' },
  { name: 'Ledgerline', description: 'The fictional ERP. Payments created as drafts must be released by an authorized approver in Ledgerline.' },
  { name: 'PayHub', description: 'The fictional payroll system holding salary and tax records.' },
  { name: 'SupplierKB', description: 'A retrieval index of supplier contracts, onboarding forms and policies.' },
  { name: 'SensorCloud Care', description: 'A customer-facing support assistant for SensorCloud tenants.' },
  { name: 'ticket-router', description: 'A fine-tuned classifier that routes support tickets to queues.' },
];
