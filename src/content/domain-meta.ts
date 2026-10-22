import type { Domain, DomainId } from './types';

export const DOMAINS: Domain[] = [
  {
    id: 'D01',
    title: 'AI systems and security foundations',
    short: 'Foundations',
    description:
      'How enterprise AI applications are actually built: models, context, retrieval, memory and tools, and where the trust boundaries and authorization decisions sit.',
    prerequisites: [],
    core: false,
  },
  {
    id: 'D02',
    title: 'Prompt injection and instruction manipulation',
    short: 'Prompt injection',
    description:
      'Direct and indirect injection classified by origin and authority, injection through documents, tools and memory, and why enforcement belongs outside the model.',
    prerequisites: ['D01'],
    core: true,
  },
  {
    id: 'D03',
    title: 'Sensitive information disclosure and privacy',
    short: 'Data leakage',
    description:
      'Tracing sensitive data through the whole flow, authorizing before data reaches the model, keeping secrets out of context and proving whether a disclosure actually happened.',
    prerequisites: ['D01'],
    core: true,
  },
  {
    id: 'D04',
    title: 'Training data poisoning and backdoors',
    short: 'Data poisoning',
    description:
      'Which learning stage an attacker affects, targeted versus broad objectives, backdoors, provenance, evaluation contamination and recovering the right artifacts.',
    prerequisites: ['D01'],
    core: true,
  },
  {
    id: 'D05',
    title: 'Hallucinations, misinformation and evidence',
    short: 'Hallucinations',
    description:
      'Factual correctness versus faithfulness, fabricated citations and actions, abstention, claim-level verification and measuring support without rewarding refusal.',
    prerequisites: ['D01'],
    core: true,
  },
  {
    id: 'D06',
    title: 'RAG, embeddings and retrieval security',
    short: 'RAG security',
    description:
      'The ingestion-to-answer pipeline, chunk-level authorization, metadata filters, poisoned retrieval content, revocation, reindexing and the authority of retrieved text.',
    prerequisites: ['D01', 'D02', 'D03'],
    core: false,
  },
  {
    id: 'D07',
    title: 'Agents, tools, APIs and MCP',
    short: 'Agents & MCP',
    description:
      'Planning loops, tool schemas and MCP, audience-bound authorization, task-scoped capabilities, action validation, approvals and multi-agent boundaries.',
    prerequisites: ['D01', 'D02'],
    core: false,
  },
  {
    id: 'D08',
    title: 'Adversarial ML and model privacy attacks',
    short: 'Adversarial ML',
    description:
      'Threat-model assumptions, evasion, transferability, extraction, inversion, membership inference, memorization and how to read an attack study critically.',
    prerequisites: ['D01', 'D04'],
    core: false,
  },
  {
    id: 'D09',
    title: 'AI supply chain and artifact integrity',
    short: 'Supply chain',
    description:
      'Models, datasets, packages, containers and connectors as supply-chain components: provenance, unsafe serialization, pinning, inventories and update testing.',
    prerequisites: ['D01', 'D04'],
    core: false,
  },
  {
    id: 'D10',
    title: 'Secure AI application engineering and deployment',
    short: 'Secure engineering',
    description:
      'Backend authorization, safe output handling, ordinary web vulnerabilities in AI apps, isolation, secrets, CI, budgets, observability and rollback.',
    prerequisites: ['D01', 'D02', 'D03'],
    core: false,
  },
  {
    id: 'D11',
    title: 'Threat modeling, red teaming and evaluation',
    short: 'Evaluation',
    description:
      'Precise task and attacker statements, falsifiable control tests, attempted versus executed violations, budgets, denominators and evidence-led findings.',
    prerequisites: ['D01', 'D02', 'D05'],
    core: false,
  },
  {
    id: 'D12',
    title: 'Governance, detection and incident response',
    short: 'Governance & IR',
    description:
      'Inventory and ownership, mapping controls to frameworks, telemetry, triage across reliability and manipulation, containment and recovering the right artifact.',
    prerequisites: ['D01', 'D11'],
    core: false,
  },
];

export const DOMAIN_BY_ID: ReadonlyMap<DomainId, Domain> = new Map(DOMAINS.map((d) => [d.id, d]));
