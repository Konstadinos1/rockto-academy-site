import { code, key, note, p, table, trace, ul, warn } from '../blocks';
import type { LessonDraft } from '../types';

export const D12_LESSONS: LessonDraft[] = [
  {
    id: 'D12-L01',
    title: 'AI system inventory, ownership, approved uses and risk acceptance',
    summary:
      'Builds the register every other governance activity depends on: which AI systems exist, who owns them, what they may be used for and which risks someone has accepted.',
    minutes: 15,
    objectives: [
      'List the fields an AI inventory entry needs to support security decisions.',
      'Distinguish approved uses from technically possible uses.',
      'Write a risk acceptance with an accountable owner, scope and expiry.',
    ],
    prerequisites: ['D01-L10', 'D11-L10'],
    explanation: [
      p('You cannot secure, monitor or respond to an AI system nobody knows exists. The NIST AI RMF lists this as a governance outcome: "Mechanisms are in place to inventory AI systems and are resourced according to organizational risk priorities" (GOVERN 1.6). An {{ai-inventory|AI inventory}} is the register that answers the first questions in every review and incident: what is this, who owns it, what does it touch?'),
      table('Inventory entry fields (minimum useful set)', ['Field', 'Why it matters'], [
        ['System and accountable owner', 'Someone must decide, fund fixes and accept risk'],
        ['Approved uses and users', 'Defines the legitimate task ([[D11-L01]]) and what is out of bounds'],
        ['Models and versions; provider', 'Needed for upgrades, provider review and incident scoping ([[D09-L06]])'],
        ['Data classes in and out; retention', 'Drives privacy review and disclosure impact ([[D12-L03]])'],
        ['Connectors, tools and identities', 'Defines blast radius and what containment must disable ([[D12-L07]])'],
        ['Persistent stores (memory, index, datasets)', 'Defines what recovery may need to repair ([[D12-L08]])'],
        ['Accepted risks with expiry', 'Shows which known gaps are tolerated, by whom, until when'],
      ]),
      p('**Approved uses** are narrower than technical capability. Rocky can technically summarize any document a user pastes; the approved use might exclude pasting customer contracts from outside ROCKTO\'s systems, or payroll exports. Writing approved uses down turns "the model can do it" into a policy question with an owner, and gives users a clear answer.'),
      p('A {{risk-acceptance|risk acceptance}} is a decision by the accountable owner, not by the security team, to operate with a named residual risk. A good one names the risk precisely, the evidence it rests on (often an evaluation report), compensating controls, conditions, and an expiry or review trigger. Acceptances that never expire quietly become permanent policy.'),
      key('Inventory first: every later step (monitoring, triage, containment, recovery) asks a question the inventory should already answer.'),
      p('Keep the inventory close to how systems are actually built. Entries generated from deployment manifests, provider contracts and connector registrations stay accurate; entries maintained by hand drift within months. Reconcile the two periodically: an AI feature found in network logs but missing from the inventory is itself a finding.'),
    ],
    boundary: {
      component: 'AI system inventory and risk register.',
      trustBoundary: 'Between documented, owned systems and unregistered ("shadow") AI use.',
      attackerControl: 'Not primarily adversarial; unregistered systems are simply invisible to controls.',
    },
    scenario: {
      title: 'An entry nobody owned',
      setup: 'During inventory reconciliation, Kofi finds outbound calls from ticket-router to a model provider that no entry mentions.',
      evidence: [
        table('Reconciliation result (synthetic)', ['Check', 'Result'], [
          ['Network egress to provider endpoints', 'ticket-router: about 4,000 calls/day'],
          ['Inventory entry', 'None'],
          ['Code owner', 'Former contractor; repository maintained by the support tooling team'],
          ['Data sent', 'Full ticket text, including customer names and occasional invoice numbers'],
          ['Provider contract', 'Personal developer account, not a ROCKTO agreement'],
        ]),
      ],
    },
    worked: {
      title: 'Registering and deciding',
      blocks: [
        p('Kofi creates an entry, assigns the support tooling lead as owner and escalates to Ines because customer data goes to a provider under a personal account with no reviewed terms ([[D12-L03]]). The owner chooses between moving to the ROCKTO provider agreement with minimized fields, or disabling the feature. Until then the risk is not accepted: it is an open issue with a two-week deadline. The approved use is recorded as "classify tickets into queues; no generation of customer replies".'),
      ],
    },
    controls: [
      { control: 'Inventory generated from manifests and provider contracts, reconciled against egress.', enforcementPoint: 'Platform and procurement processes.', limitation: 'Personal accounts and browser use can bypass egress visibility.' },
      { control: 'Risk acceptance requires owner, evidence, conditions and expiry.', enforcementPoint: 'Risk register workflow.', limitation: 'Owners may accept risks they do not fully understand; reviewers should challenge.' },
    ],
    misconception: {
      claim: '"The security team accepts AI risks after reviewing them."',
      correction: 'Security advises and records. The accountable system owner accepts residual risk, because they own the business outcome and the budget to fix it.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Write the inventory entry for AP Assist v3 using the fields above.',
      modelResponse: ['Owner: Dana Okafor (CFO). Approved use: AP clerks summarize invoices and create drafts for approved invoices; no release of payments. Model: provider-model-2026-08-15 via ROCKTO agreement. Data: supplier invoices, vendor master (read); no payroll. Tools: read_invoice, create_payment_draft (dispatcher-scoped). Stores: none persistent beyond audit log. Accepted risks: limitations 1–5 of the v3 evaluation, review on model upgrade or in 90 days.'],
    },
    sourceIds: ['nist-ai-rmf', 'nist-ai-600-1', 'owasp-llm-top10-2025'],
    glossary: ['ai-inventory', 'risk-acceptance'],
    related: ['D11-L10', 'D12-L02'],
    conceptTag: 'inventory-and-risk-acceptance',
  },
  {
    id: 'D12-L02',
    title: 'Mapping technical controls to current primary frameworks',
    summary:
      'Connects the controls built in this course to the frameworks auditors and regulators use, without overclaiming what a mapping proves.',
    minutes: 15,
    objectives: [
      'Map a technical control to the relevant framework outcome or risk category.',
      'Explain what a mapping shows and what it does not.',
      'Check framework versions and scope before citing them.',
    ],
    prerequisites: ['D12-L01'],
    explanation: [
      p('Frameworks give shared vocabulary and coverage checklists. They do not tell you whether your dispatcher denies an out-of-scope call; your tests do. A mapping is useful when it connects a specific, tested control to a framework outcome so that gaps become visible and auditors can follow the evidence.'),
      table('Frameworks used in this course', ['Source', 'What it is', 'How to use it'], [
        ['NIST AI RMF 1.0 (AI 100-1)', 'Voluntary framework with four functions: GOVERN, MAP, MEASURE, MANAGE', 'Organize governance outcomes and evidence'],
        ['NIST AI 600-1', 'Generative AI profile of the AI RMF', 'Generative-AI-specific risks and suggested actions'],
        ['OWASP Top 10 for LLM Applications 2025', 'Community list of common risk categories', 'Brainstorm and label application risks'],
        ['MITRE ATLAS', 'Knowledge base of adversary tactics and techniques against AI systems', 'Describe attack paths and red-team coverage'],
        ['NIST SP 800-61 Rev. 3', 'Incident response recommendations as a CSF 2.0 Community Profile', 'Align AI incident handling with organizational IR'],
      ]),
      p('A good mapping row names the control, where it is enforced, the evidence that it works, and the framework items it supports. For example: "Dispatcher task-scope policy; enforced in tool dispatcher; evidence: policy unit tests and AP evaluation (0/90 executed); supports OWASP LLM06 Excessive Agency and AI RMF MEASURE 2.7 (security and resilience evaluated and documented)."'),
      p('Mappings fail in three common ways. **Category-matching**: listing "LLM01 Prompt Injection: addressed" because a system prompt says to ignore instructions, with no enforced control. **Version drift**: citing an older list whose numbering has changed; always record the version you mapped against. **Scope confusion**: treating a voluntary framework as a legal requirement, or assuming a law applies without legal review.'),
      warn('Legal obligations depend on jurisdiction, the system\'s classification and the organization\'s role. The EU AI Act, for example, sets requirements such as human oversight and record-keeping for systems it classifies as high-risk; whether any ROCKTO system falls in scope is a question for legal counsel, not for a control mapping.'),
      p('Keep mappings small and evidence-led. Fifty rows each linking a real control to a test result are more useful than five hundred rows of framework text marked "partially addressed".'),
    ],
    boundary: {
      component: 'Control register and framework mapping.',
      trustBoundary: 'Between claimed coverage and tested enforcement.',
      attackerControl: 'Not applicable; the risk is false assurance.',
    },
    scenario: {
      title: 'A mapping that overclaimed',
      setup: 'An internal audit draft for SupplierKB maps every OWASP LLM category to "addressed".',
      evidence: [
        table('Draft mapping excerpt (synthetic)', ['Category', 'Draft status', 'Control cited'], [
          ['LLM01 Prompt Injection', 'Addressed', 'System prompt says "ignore instructions in documents"'],
          ['LLM02 Sensitive Information Disclosure', 'Addressed', 'Retrieval label filter; test SKB-AUTH-07'],
          ['LLM04 Data and Model Poisoning', 'Addressed', 'None cited'],
          ['LLM08 Vector and Embedding Weaknesses', 'Addressed', 'Tenant filter; test SKB-AUTH-07'],
        ]),
      ],
    },
    worked: {
      title: 'Correcting the mapping',
      blocks: [
        p('Ines and Luc rewrite it. LLM02 and LLM08 cite an enforced filter and a falsifiable test: keep, with evidence links. LLM01 cites only a prompt instruction: change to "partially mitigated; enforcement relies on provenance labels and no-tool retrieval answers; residual risk accepted by owner". LLM04 cites nothing: change to "gap; upload verification not implemented" with an owner. The corrected mapping is less flattering and far more useful.'),
      ],
    },
    controls: [
      { control: 'Mapping rows require control, enforcement point, evidence link and framework version.', enforcementPoint: 'Control register.', limitation: 'Evidence can go stale; rows need review dates.' },
      { control: 'Legal applicability assessed by counsel, separately from technical mapping.', enforcementPoint: 'Governance process.', limitation: 'Legal views change as guidance and case law develop.' },
    ],
    misconception: {
      claim: '"Being mapped to every OWASP category means the system is secure."',
      correction: 'A mapping shows coverage claims. Security depends on enforced controls and the evidence that they work, which the mapping should link to.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Write one mapping row for the approval binding control from [[D07-L10]] (approval digest checked by the dispatcher).',
      modelResponse: ['Control: approval bound to a digest of tool name and parameters; enforced in the dispatcher; evidence: unit tests that changed parameters are denied, and AP evaluation results; supports OWASP LLM06 Excessive Agency and AI RMF MAP 3.5 (processes for human oversight defined, assessed and documented); mapped against OWASP Top 10 for LLM Applications 2025 and AI RMF 1.0.'],
    },
    sourceIds: ['nist-ai-rmf', 'nist-ai-600-1', 'owasp-llm-top10-2025', 'mitre-atlas', 'nist-sp-800-61r3', 'eu-ai-act'],
    glossary: ['threat-model', 'policy-enforcement-point'],
    related: ['D12-L01', 'D11-L10'],
    conceptTag: 'framework-mapping',
  },
  {
    id: 'D12-L03',
    title: 'Data handling, provider review and retention decisions',
    summary:
      'Decides which data may reach a model provider, how long prompts, outputs and logs are kept, and who reviews the provider\'s terms.',
    minutes: 15,
    objectives: [
      'Classify the data flowing to and from an AI feature.',
      'Identify the provider-review questions that matter for security.',
      'Set retention for prompts, outputs, traces and derived stores.',
    ],
    prerequisites: ['D03-L04', 'D12-L01'],
    explanation: [
      p('AI features create new copies of data: prompts sent to a provider, outputs stored in tickets, traces kept for debugging, embeddings in an index, memories in a profile. Each copy is a disclosure surface and a retention decision ([[D03-L04]]).'),
      table('Data handling decisions per flow', ['Flow', 'Decision', 'Example for AP Assist'], [
        ['To provider', 'Which fields are necessary ({{minimization|minimization}})', 'Invoice text and vendor id; not bank account numbers'],
        ['Provider side', 'Contract terms on retention and use for training; region', 'Reviewed ROCKTO agreement, not personal accounts'],
        ['Outputs', 'Where outputs land and who can see them', 'Draft notes in Ledgerline, visible to AP only'],
        ['Traces and logs', 'Content vs metadata; access; retention', 'Metadata 1 year; content sample 30 days ([[D10-L09]])'],
        ['Derived stores', 'Embeddings, memory, caches', 'None persistent for AP Assist'],
      ]),
      p('**Provider review** asks concrete questions and records the answers with the date and the document version: Is customer data used to train provider models under our agreement? How long are prompts and outputs retained, and can that be shortened? Where is data processed? Who at the provider can access it, and under what conditions? How are we notified of incidents? Do not answer these from memory or marketing pages; quote the contract or the provider\'s current documentation, and re-check when terms change.'),
      p('**{{retention|Retention}}** should follow purpose. Debug traces with full content are useful for days, not years. Keep metadata long enough for investigations and audits; keep content briefly and under access control. Remember derived copies: deleting a document from the source does not remove its chunks from an index, its influence from a fine-tuned checkpoint, or quotes of it in stored outputs.'),
      note('Never test provider handling with real payroll or customer data. Use synthetic records and canaries.'),
      p('Write these decisions into the inventory entry ([[D12-L01]]) so incident responders know immediately which copies exist and where to look.'),
    ],
    boundary: {
      component: 'Data flows to providers and internal stores.',
      trustBoundary: 'ROCKTO → provider; source system → derived stores.',
      attackerControl: 'Indirect: any party who can read a store or provider-side copy.',
    },
    scenario: {
      title: 'The debug flag',
      setup: 'Ines reviews PayHub\'s assistant before expansion and finds a debug setting left on since the pilot.',
      evidence: [
        table('Findings (synthetic)', ['Item', 'Observed'], [
          ['Trace content logging', 'Full prompts and outputs, including salary figures, retained indefinitely'],
          ['Trace access', 'All platform engineers (about 25 people)'],
          ['Provider agreement', 'ROCKTO agreement; reviewed terms on file, dated'],
          ['Fields sent to provider', 'Full employee records where only pay-run summary was needed'],
        ]),
      ],
    },
    worked: {
      title: 'Decisions',
      blocks: [
        p('Ines and Ravi decide: send only the fields the task needs (employee id, pay period, gross and deduction totals); switch traces to metadata with a 30-day, access-requested content sample; purge existing full-content traces after preserving those under an open investigation; restrict trace access to the on-call platform group. The provider agreement is fine; the larger exposure was internal.'),
      ],
    },
    controls: [
      { control: 'Field-level minimization before provider calls.', enforcementPoint: 'Prompt construction service.', limitation: 'Tasks change; field lists need review.' },
      { control: 'Retention schedules for traces, outputs and derived stores.', enforcementPoint: 'Logging pipeline and storage lifecycle rules.', limitation: 'Derived influence (fine-tuned weights) cannot be deleted by a schedule.' },
      { control: 'Provider review recorded with document versions and dates.', enforcementPoint: 'Procurement and privacy review.', limitation: 'Terms change; reviews need triggers.' },
    ],
    misconception: {
      claim: '"Our provider does not train on our data, so data handling is covered."',
      correction: 'Training is one question. Retention, access, region, internal traces and derived stores are others, and internal copies are often the larger exposure.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'List every copy of an invoice\'s content that exists after AP Assist summarizes it.',
      modelResponse: ['The original email and PDF in ap-inbox; the prompt and output at the provider (per agreement retention); the trace content sample (if sampled); the summary stored as a draft note in Ledgerline; any cached result. No index or memory copy for AP Assist.'],
    },
    sourceIds: ['owasp-llm02', 'nist-ai-600-1', 'owasp-cs-logging'],
    glossary: ['minimization', 'retention', 'sensitive-information'],
    related: ['D03-L04', 'D10-L09'],
    conceptTag: 'data-handling-retention',
  },
  {
    id: 'D12-L04',
    title: 'Human oversight, escalation and accessible approval experiences',
    summary:
      'Designs oversight that people can actually perform: clear approvals, sensible volumes, escalation paths and interfaces that work for everyone.',
    minutes: 15,
    objectives: [
      'Distinguish meaningful human oversight from rubber-stamp approval.',
      'Design approval screens that show the exact action and work accessibly.',
      'Set escalation paths and volume limits that prevent approval fatigue.',
    ],
    prerequisites: ['D07-L06', 'D07-L07'],
    explanation: [
      p('{{human-approval|Human approval}} is a control only if the approver can see what will happen, has time to judge it, and can say no without penalty. The NIST AI RMF expects that "processes for human oversight are defined, assessed, and documented" (MAP 3.5); the design work is making those processes real.'),
      ul(
        '**Show the exact action.** Render the approval from the structured parameters the dispatcher will execute (recipient, amount, account), not from the model\'s description ([[D07-L07]]).',
        '**Bind and expire.** The approval covers that action only, and lapses ([[D07-L07]]).',
        '**Highlight what changed.** A new account or an amount outside the usual range should be visually distinct and explained in text, not colour alone.',
        '**Make "no" easy.** Rejecting or escalating should be one clear step, with a reason field, and should not count against the approver\'s throughput.',
      ),
      p('**Approval fatigue** is the main failure. When approvers see hundreds of near-identical requests, approval rate drifts towards 100% and time-per-approval collapses. Track both. Reduce volume by approving low-risk categories by policy (with enforcement) and reserving human review for the risky ones.'),
      p('Accessibility is part of the control. An approval screen that relies on colour to mark a changed bank account, times out before a screen-reader user can finish, or hides details behind hover-only tooltips will fail for some approvers. WCAG 2.2 criteria such as adjustable timing, visible focus that is not obscured, and minimum target sizes apply directly to approval interfaces.'),
      p('**Escalation** routes decisions that exceed the approver\'s authority or confidence: amounts above a threshold, first payments to new accounts, anything flagged by verification. Name the escalation owner and a response time; an escalation queue nobody watches becomes an approval delay that users learn to avoid.'),
      key('Measure oversight like any control: approval rate, time per decision, rejection reasons and escalations, by approver and period.'),
    ],
    boundary: {
      component: 'Approval interface and escalation workflow.',
      trustBoundary: 'Between proposed action and executed action.',
      attackerControl: 'Content shaping the proposal and its description; not the structured parameters if rendered from them.',
    },
    scenario: {
      title: 'Month-end approvals',
      setup: 'Priya\'s team approves AP Assist drafts in Ledgerline. Hana pulls approval telemetry for the last three month-ends.',
      evidence: [
        table('Approval telemetry (synthetic)', ['Period', 'Drafts approved', 'Rejected', 'Median seconds per approval'], [
          ['Mid-month week', '410', '14 (3.4%)', '38'],
          ['Month-end week (Aug)', '1,920', '6 (0.3%)', '7'],
          ['Month-end week (Sep)', '2,050', '4 (0.2%)', '6'],
        ]),
      ],
    },
    worked: {
      title: 'Redesign',
      blocks: [
        p('At month-end, rejection rate drops tenfold and time per approval falls to seconds: classic fatigue. Changes: drafts matching an approved invoice, an unchanged vendor-master account and an amount within 2% of the purchase order are approved by policy (enforced in Ledgerline, sampled for audit); everything else goes to a human, with changed fields highlighted in text and an icon, no session timeout during review, and a one-step "escalate to Ravi" for amounts above the threshold. Human volume falls by about 70%.'),
      ],
    },
    controls: [
      { control: 'Approvals rendered from structured parameters with change highlighting.', enforcementPoint: 'Approval UI.', limitation: 'Complex actions remain hard to present.' },
      { control: 'Volume reduction by enforced policy for low-risk categories.', enforcementPoint: 'Workflow engine.', limitation: 'Policy thresholds can be gamed; sample for audit.' },
      { control: 'Approval telemetry and accessible interface requirements.', enforcementPoint: 'Monitoring and UI acceptance tests.', limitation: 'Metrics show fatigue; they do not fix workload.' },
    ],
    misconception: {
      claim: '"Adding a human approval step makes any AI action safe."',
      correction: 'Only if the approver sees the exact action, has time and support to judge it, and can refuse easily. Fatigued or poorly informed approval is a formality.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'List three changes to make an approval screen for "send email" usable with a screen reader and keyboard only.',
      modelResponse: ['1. Recipient, subject and full body exposed as text with headings, not images or hover tooltips. 2. Approve, reject and escalate as real buttons in a logical tab order with visible focus. 3. No silent timeout; warn and allow extension before any session expiry.'],
    },
    sourceIds: ['nist-ai-rmf', 'w3c-wcag-22', 'owasp-llm06', 'eu-ai-act'],
    glossary: ['human-approval', 'excessive-agency'],
    related: ['D07-L07', 'D12-L05'],
    conceptTag: 'human-oversight',
  },
  {
    id: 'D12-L05',
    title: 'Useful telemetry, data minimization and operational detection',
    summary:
      'Chooses what to record so incidents can be detected and investigated, without turning logs into a second copy of sensitive data.',
    minutes: 15,
    objectives: [
      'Select telemetry events that support detection and investigation of AI incidents.',
      'Apply minimization and access control to AI logs.',
      'Write detections based on enforcement decisions and behaviour changes.',
    ],
    prerequisites: ['D10-L09', 'D12-L03'],
    explanation: [
      p('Useful {{telemetry|telemetry}} for AI systems records **decisions and identifiers**, not everything. The most valuable events are the ones enforcement produces: tool proposals and dispatcher decisions, approval outcomes, retrieval candidates with labels, memory writes, renderer blocks, and version identifiers ([[D10-L09]]).'),
      table('Events worth recording', ['Event', 'Key fields', 'Detection use'], [
        ['Tool proposal and decision', 'Tool, parameter hashes, decision, policy version, trace id', 'Spikes in denials; new tools proposed'],
        ['Approval', 'Approver, action digest, outcome, seconds', 'Fatigue; unusual approvers'],
        ['Retrieval', 'Chunk ids, labels, tenant, persona', 'Label mismatch; cross-tenant candidates'],
        ['Memory write', 'Key, source, confirmation, session', 'Writes during untrusted content'],
        ['Renderer', 'Blocked URLs and domains', 'Exfiltration attempts via links or images'],
        ['Versions', 'Model, prompt, index snapshot, policy', 'Correlating behaviour changes with releases'],
      ]),
      p('**Minimize content.** Prompts and outputs often contain the most sensitive data in the system. Log ids, hashes, labels and decisions by default; keep a small, access-controlled content sample with short retention for debugging ([[D12-L03]]). The OWASP Logging Cheat Sheet\'s general advice applies: exclude secrets and session tokens, protect logs from tampering, and control access.'),
      p('**Detect on enforcement, not on model text.** "Model output contains the word ignore" is noisy and easy to evade. Better detections: dispatcher denials per session above baseline; any executed tool call outside a task\'s declared scope (should be zero, so alert on one); retrieval candidates whose labels do not match the persona; memory writes while untrusted content is in context; a jump in proposed-violation rate after a model upgrade ([[D11-L05]]).'),
      warn('A detection that fires on every injection attempt in inbound email will drown the SOC. Alert on attempts that got further than expected (a proposal reaching approval, an execution), and trend the rest.'),
      p('Check detections against your evaluation suite: replay adversarial cases and confirm the expected alerts fire, and replay benign cases to measure false alerts. Detection logic is code and belongs in the regression suite ([[D11-L08]]).'),
    ],
    boundary: {
      component: 'Logging pipeline, SIEM and detection rules.',
      trustBoundary: 'Between operational systems and the people who can read their logs.',
      attackerControl: 'Inputs that generate events; not the logging pipeline itself.',
    },
    scenario: {
      title: 'An alert that worked',
      setup: 'Hana\'s detection "executed tool call outside declared task scope" fires for Rocky.',
      evidence: [
        trace('Alert context (synthetic)', [
          { actor: 'detector', event: 'alert', detail: 'tr_7f21: tool export_csv executed in task "summarize ticket"; declared scope: read_ticket only.', flag: 'violation' },
          { actor: 'dispatcher', event: 'policy', detail: 'policy v18 deployed 40 minutes earlier; diff adds export_csv to default allowlist.', flag: 'warn' },
          { actor: 'logs', event: 'scope', detail: '3 sessions affected since deployment; exports went to user downloads, not external.', flag: 'info' },
        ]),
      ],
    },
    worked: {
      title: 'Why it was caught',
      blocks: [
        p('The detection keyed on an enforcement invariant (executed calls must be within declared scope), not on model text, so it caught a configuration regression rather than an attack. Kofi rolls back to policy v17; Hana reviews the three sessions; a regression test for the default allowlist is added. Content logs were not needed: ids, tool names and policy versions answered every question.'),
      ],
    },
    controls: [
      { control: 'Decision- and identifier-centric telemetry with content sampling.', enforcementPoint: 'Logging pipeline.', limitation: 'Some investigations need content; sampling may miss it.' },
      { control: 'Detections on enforcement invariants, tested against evaluation suites.', enforcementPoint: 'SIEM rules and CI.', limitation: 'Invariants must be declared; undeclared behaviour is invisible.' },
    ],
    misconception: {
      claim: '"Log every prompt and output in full so nothing is missed."',
      correction: 'Full content logs create a second, widely readable copy of sensitive data. Record decisions and identifiers, sample content briefly under access control.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Write one detection for SupplierKB based on an enforcement decision, with its expected false-positive sources.',
      modelResponse: ['Alert when any retrieval candidate\'s label is outside the requesting persona\'s allowed labels, even if filtered later. Expected false positives: newly added labels not yet mapped to personas, and test accounts during evaluations (tag and exclude).'],
    },
    sourceIds: ['owasp-cs-logging', 'nist-sp-800-61r3', 'nist-ai-600-1'],
    glossary: ['telemetry', 'minimization', 'policy-enforcement-point'],
    related: ['D10-L09', 'D12-L06'],
    conceptTag: 'telemetry-detection',
  },
  {
    id: 'D12-L06',
    title: 'Triage: reliability failure, manipulation, access defect, or several together',
    summary:
      'Classifies an AI incident by what actually went wrong, so the response targets the right component instead of the most dramatic symptom.',
    minutes: 16,
    objectives: [
      'Distinguish reliability failures, manipulation and access-control defects from evidence.',
      'Recognize incidents with more than one cause.',
      'Choose the first responders and actions based on the classification.',
    ],
    prerequisites: ['D05-L01', 'D02-L01', 'D12-L05'],
    explanation: [
      p('AI incident reports arrive as symptoms: "Rocky told a customer the wrong refund amount", "the assistant showed payroll to marketing", "AP Assist drafted a payment to a strange account". Before responding, classify the cause. The same symptom can come from very different failures.'),
      table('Triage classes', ['Class', 'What happened', 'Typical evidence'], [
        ['Reliability failure', 'The system produced a wrong or unsupported result without adversarial input', 'No hostile content in context; hallucination or retrieval miss ([[D05-L01]])'],
        ['Manipulation', 'Attacker-controlled content steered the model or a persistent store', 'Instructions or false facts in retrieved, emailed or uploaded content ([[D02-L01]])'],
        ['Access defect', 'A control allowed data or actions it should have blocked, regardless of the model', 'Wrong labels, missing filters, over-broad identities ([[D03-L05]])'],
        ['Several together', 'Combination, e.g. manipulation that succeeded because of an access defect', 'Evidence for more than one class'],
      ]),
      p('Classification guides who responds and what to touch first. A reliability failure goes to the feature team and may need a correction to business records. Manipulation needs security, containment of the entry point, and a search for the same content elsewhere. An access defect needs the data or platform owner and is often the most urgent, because it does not depend on an attacker being clever.'),
      p('Classify **injection by origin and authority**: did the instruction come from the user (direct) or from content the system processed (indirect), and did it have any authority over the action? A user asking Rocky for payroll is not an injection if Rocky\'s retrieval simply allowed it; that is an access defect. Separate **proposed from executed**: if the model proposed an action that the dispatcher denied, the incident is a near miss with different urgency ([[D11-L05]]).'),
      key('Ask three questions in order: What executed or was disclosed? What controlled content was involved? Which control should have stopped it?'),
      p('Expect combinations. Many serious incidents are manipulation that worked only because of an access defect: hostile content could steer the model, and nothing between the model and the data or action stopped it.'),
    ],
    boundary: {
      component: 'Incident triage process.',
      trustBoundary: 'Every boundary on the affected path.',
      attackerControl: 'To be determined by the evidence; may be none.',
    },
    scenario: {
      title: 'Payroll in a marketing answer',
      setup: 'A marketing analyst reports that Rocky answered a budget question with individual salary figures.',
      evidence: [
        trace('Investigation trace (synthetic)', [
          { actor: 'user', event: 'query', detail: 'Marketing analyst: "What did we spend on the Q3 campaign team?"', flag: 'info' },
          { actor: 'retriever', event: 'candidates', detail: 'Chunk c_4410 from payroll-export-q3.xlsx, label: general (expected: payroll-restricted).', flag: 'violation' },
          { actor: 'context', event: 'content', detail: 'No instructions or hostile text in any retrieved chunk.', flag: 'ok' },
          { actor: 'ingestion', event: 'record', detail: 'File uploaded to the shared finance drive by a payroll clerk on 02/10/2026; drive default label "general".', flag: 'warn' },
        ]),
      ],
    },
    worked: {
      title: 'Classification',
      blocks: [
        p('No hostile content, no adversary: not manipulation. The model answered faithfully from what it was given: not a reliability failure in the usual sense. The cause is an access defect: a payroll export inherited the drive\'s default "general" label and became retrievable by everyone. Responders: Ines (privacy, disclosure assessment) and Kofi (labelling pipeline). First actions: remove the chunk from the index, check who else retrieved it, and fix default labelling for the finance drive. Rewording the prompt would do nothing.'),
      ],
    },
    controls: [
      { control: 'Triage checklist: executed/disclosed, controlled content, failed control.', enforcementPoint: 'Incident runbook.', limitation: 'Early evidence may be incomplete; revisit classification.' },
      { control: 'Responder routing by class.', enforcementPoint: 'On-call process.', limitation: 'Combined incidents need several teams.' },
    ],
    misconception: {
      claim: '"If the AI disclosed something it should not have, it must have been prompt-injected."',
      correction: 'Most disclosures trace to access defects: wrong labels, missing filters, broad identities. Check the control path before assuming an attacker.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Open the trace-inspector lab and classify each flagged event as reliability, manipulation, access defect or combination.',
      modelResponse: ['The invoice instruction is manipulation (indirect injection from a PDF); the executed external send that followed is an access defect in the dispatcher scope, so the incident overall is a combination.'],
    },
    sourceIds: ['nist-sp-800-61r3', 'owasp-llm01', 'owasp-llm02', 'mitre-atlas'],
    glossary: ['indirect-injection', 'disclosure', 'root-cause'],
    related: ['D01-L08', 'D12-L07'],
    conceptTag: 'incident-triage',
    labId: 'trace-inspector',
  },
  {
    id: 'D12-L07',
    title: 'Containment, connector restriction, credential response and evidence preservation',
    summary:
      'Stops an AI incident from spreading by restricting connectors and credentials, while preserving the evidence needed to understand it.',
    minutes: 16,
    objectives: [
      'Choose containment actions that match the triage class and blast radius.',
      'Respond to exposed or claimed credentials correctly.',
      'Preserve traces, artifacts and hashes before cleanup.',
    ],
    prerequisites: ['D12-L06'],
    explanation: [
      p('{{containment|Containment}} narrows what the affected system can do while you investigate. For AI features, the most effective levers are usually outside the model:'),
      ul(
        '**Disable or narrow connectors and tools**: remove send_email from the allowlist; switch a tool to propose-only; disconnect an MCP server.',
        '**Freeze persistent stores**: stop index ingestion, block memory writes, pin the current index snapshot.',
        '**Restrict audiences**: limit the feature to a pilot group while the investigation runs.',
        '**Roll back versions**: return to the last known-good prompt, policy or index snapshot ([[D09-L06]]).',
      ),
      p('A model refusal does not contain anything. If an action already executed, asking the model to undo it, or seeing it apologize, changes nothing in the system of record. Containment acts on the dispatcher, connectors, identities and stores.'),
      p('**Credential response.** If a real credential was exposed (in a prompt, output, log or tool response), revoke and rotate it, then search logs for use of the old value. If a model *claims* to reveal a credential, verify before acting on the claim: check the value against the secret store or the issuing system. Models produce plausible-looking keys that are not real; a real-looking value that matches nothing still matters (it may indicate memorized training data from elsewhere) but does not require rotating ROCKTO secrets ([[D03-L10]]). Never paste a suspected secret into another AI tool to "check" it.'),
      p('**{{evidence-preservation|Evidence preservation}}** comes before cleanup. Capture traces, dispatcher logs, the affected index snapshot or memory records, the hostile content, and version identifiers; record hashes and who collected them. Deleting a poisoned chunk before copying it destroys the evidence needed to find the same content elsewhere and to show what users saw.'),
      key('Contain at the enforcement points, preserve before you clean, verify claimed secrets before you rotate.'),
    ],
    boundary: {
      component: 'Connectors, identities, persistent stores and versions of the affected system.',
      trustBoundary: 'Between the AI system and everything it can reach.',
      attackerControl: 'Whatever the incident showed; assume the entry point is still open until contained.',
    },
    scenario: {
      title: 'The key in the answer',
      setup: 'A user reports that Rocky included a string resembling an API key for SensorCloud\'s telemetry service in an answer.',
      evidence: [
        trace('First hour (synthetic)', [
          { actor: 'responder', event: 'preserve', detail: 'Trace tr_c903 and retrieved chunks exported; SHA-256 recorded; answer screenshot attached to ticket.', flag: 'ok' },
          { actor: 'secret-store', event: 'verify', detail: 'Value matches active key sc-telemetry-ingest (issued 03/2026).', flag: 'violation' },
          { actor: 'retrieval', event: 'source', detail: 'Chunk from runbook page "SensorCloud ingest setup", which embeds the key in a code block.', flag: 'warn' },
          { actor: 'platform', event: 'contain', detail: 'Key revoked and rotated; runbook page removed from index; ingestion paused for the runbooks space.', flag: 'blocked' },
        ]),
      ],
    },
    worked: {
      title: 'Order of actions',
      blocks: [
        p('Hana preserved the trace and chunk first, then verified the value against the secret store: it was real, so rotation was required. Kofi revoked the key, searched telemetry-service logs for use of the old key since issue, paused ingestion for the runbooks space and removed the page from the index. Classification: access defect (secret in an indexed document), not manipulation. The remaining work is recovery of the index and the runbook ([[D12-L08]]).'),
      ],
    },
    controls: [
      { control: 'Pre-approved containment switches per system (tool allowlist, ingestion pause, audience limit).', enforcementPoint: 'Runbooks and feature flags.', limitation: 'Switches must be tested before an incident to be trusted.' },
      { control: 'Secret verification and rotation runbook.', enforcementPoint: 'Secret store and issuing systems.', limitation: 'Rotation can break integrations; plan for it.' },
      { control: 'Evidence capture with hashes before cleanup.', enforcementPoint: 'Incident procedure.', limitation: 'Evidence stores need their own access control.' },
    ],
    misconception: {
      claim: '"The model output a key, so we must rotate every credential it could know."',
      correction: 'Verify first. If the value is real, rotate it and check for use. If it matches nothing, there is nothing of yours to rotate, though the source of the string may still need investigation.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'List three containment actions for an incident where hostile supplier emails caused AP Assist to propose external sends that the dispatcher denied.',
      modelResponse: ['1. Keep the dispatcher policy as is (it worked) and add a temporary alert on any send proposal in the AP task. 2. Block or quarantine the sending domain at the mail gateway. 3. Search ap-inbox for the same content and quarantine matching messages. No rollback is needed; nothing executed.'],
    },
    sourceIds: ['nist-sp-800-61r3', 'owasp-cs-secrets', 'owasp-llm06'],
    glossary: ['containment', 'evidence-preservation', 'secrets-management'],
    related: ['D03-L10', 'D12-L08'],
    conceptTag: 'containment-evidence',
  },
  {
    id: 'D12-L08',
    title: 'Recovering the right artifact: memory, index, dataset, checkpoint or business record',
    summary:
      'Repairs the component that actually carries the bad state, knowing that inference does not retrain the model and that business records may need their own correction.',
    minutes: 16,
    objectives: [
      'Identify which artifact holds the persistent effect of an incident.',
      'Choose the recovery action for memory, index, dataset, checkpoint and business records.',
      'Verify recovery with tests before reopening the system.',
    ],
    prerequisites: ['D04-L01', 'D06-L05', 'D12-L07'],
    explanation: [
      p('After containment, ask where the bad state lives. Ordinary inference does not change the model\'s weights: a hostile email processed yesterday does not retrain the model ([[D01-L02]]). Persistent effects live in specific artifacts, and each needs a different repair.'),
      table('Where the effect lives and how to recover', ['Artifact', 'Example', 'Recovery'], [
        ['Application memory', 'False "Vela\'s account is …9902" stored for a user ({{memory-poisoning|memory poisoning}})', 'Delete or correct the entry; review other writes from the same source'],
        ['Retrieval index', 'Poisoned supplier-portal document retrieved into answers ({{poisoned-retrieval|poisoned retrieval}})', 'Remove chunks; restore a clean snapshot; re-ingest with verification'],
        ['Training or tuning dataset', 'Mislabelled examples added to a fine-tuning set ({{data-poisoning|data poisoning}})', 'Remove examples; record provenance; retrain from clean data'],
        ['Model checkpoint', 'Fine-tuned ticket-router learned a backdoor', 'Roll back to a known-good checkpoint; retrain; re-evaluate'],
        ['Business record', 'Tickets misrouted or payment drafts created during the incident', 'Identify affected records by time window and trace ids; correct them'],
      ]),
      p('**Business records are often forgotten.** Fixing the index stops new wrong answers; it does not fix the vendor-master change a clerk made after reading one, or the tickets the poisoned router misrouted last week. Use trace ids and time windows from telemetry to find every downstream record ([[D12-L05]]).'),
      p('**Recover from known-good, not from "probably fine".** Restoring an index snapshot from before the poisoned upload is cleaner than deleting the chunks you found, because you may not have found all of them. Retraining from a dataset whose provenance you cannot establish risks reintroducing the problem ([[D04-L04]]).'),
      p('**Verify before reopening.** Rerun the reproduction from the incident, the relevant regression cases, and a benign sample. A recovered index that no longer returns the poisoned chunk but also no longer returns legitimate supplier documents is not recovered ([[D11-L03]]).'),
      warn('Do not "fix" a persistent store by telling the model to ignore the bad entry. The entry stays and will be retrieved again by another prompt, another user or the next model version.'),
    ],
    boundary: {
      component: 'Persistent stores and downstream systems of record.',
      trustBoundary: 'Between the AI system and anything it writes to or reads from persistently.',
      attackerControl: 'Whatever wrote the bad state; recovery must not rely on that source again.',
    },
    scenario: {
      title: 'Recovering from a poisoned upload',
      setup: 'A compromised supplier-portal account uploaded a document claiming Vela Freight\'s bank account changed. It was indexed by SupplierKB for nine days.',
      evidence: [
        table('Affected artifacts (synthetic)', ['Artifact', 'State'], [
          ['SupplierKB index', '3 chunks from the upload; 41 answers cited them'],
          ['Rocky memory', '2 users have a stored note "Vela new account …9902"'],
          ['Vendor master', '1 change request raised by a clerk citing a SupplierKB answer (pending verification)'],
          ['Fine-tuned models', 'None trained on SupplierKB content in the window'],
          ['Payments', 'None to …9902 (vendor master unchanged; dispatcher uses vendor master)'],
        ]),
      ],
    },
    worked: {
      title: 'Recovery plan',
      blocks: [
        p('Index: restore the snapshot from before the upload, then re-ingest legitimate documents uploaded since, with portal uploads marked unverified. Memory: delete the two notes and notify the users. Vendor master: reject the pending change request and log it. Models: no action, since no training used the content. Payments: confirmed none. Verification: rerun the incident query, the regression case for poisoned uploads ([[D11-L08]]) and 30 benign supplier questions. Then reopen.'),
        note('Inference over the poisoned chunks did not change any model. Nothing needs retraining.'),
      ],
    },
    controls: [
      { control: 'Versioned snapshots for indexes, memory and datasets.', enforcementPoint: 'Data platform.', limitation: 'Snapshots cost storage and need retention rules.' },
      { control: 'Downstream record search by trace id and time window.', enforcementPoint: 'Telemetry and systems of record.', limitation: 'Records changed by humans after reading an answer may not carry trace ids.' },
      { control: 'Recovery verification with incident reproduction, regression and benign samples.', enforcementPoint: 'Incident runbook.', limitation: 'Verification covers known variants.' },
    ],
    misconception: {
      claim: '"The model read a poisoned document, so it has to be retrained."',
      correction: 'Inference does not retrain the model. Repair the store that holds the content (index, memory) and the records it influenced; retrain only if poisoned data entered a training set.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'In the persistence-explorer lab, which stores still contain the false claim after the session ends, and what would recover each?',
      modelResponse: ['The memory entry and the indexed chunk persist; model weights do not change. Recover by deleting the memory entry and restoring a clean index snapshot, then check business records that used the false claim.'],
    },
    sourceIds: ['owasp-llm04', 'owasp-llm08', 'nist-sp-800-61r3', 'nist-ai-100-2'],
    glossary: ['memory-poisoning', 'poisoned-retrieval', 'data-poisoning', 'checkpoint'],
    related: ['D04-L09', 'D06-L05'],
    conceptTag: 'artifact-recovery',
    labId: 'persistence-explorer',
  },
  {
    id: 'D12-L09',
    title: 'Root-cause analysis, stakeholder communication and regression testing',
    summary:
      'Finds the control that failed, communicates accurately to the people affected, and makes sure the same incident cannot quietly return.',
    minutes: 15,
    objectives: [
      'Separate the triggering input from the root cause.',
      'Write stakeholder communication that is accurate about what happened and what is known.',
      'Turn the incident into regression tests and control changes.',
    ],
    prerequisites: ['D12-L08', 'D11-L09'],
    explanation: [
      p('The {{root-cause|root cause}} of an AI incident is almost never "the prompt". The hostile email, the odd question or the unlucky phrasing is the trigger. The root cause is the condition that let the trigger have its effect: a missing destination check, a default label, an over-broad identity, a persistent store with no provenance. Fixing the trigger (blocking one phrase) leaves the next one free to work.'),
      p('Ask "why" along the control path, not the model\'s reasoning: Why did the call execute? The dispatcher allowed it. Why? The tool was in the default allowlist. Why? Policy v18 changed defaults without review. Why? Policy changes did not need a second reviewer. Each answer points to a control and an owner.'),
      table('Trigger versus root cause', ['Incident', 'Trigger', 'Root cause'], [
        ['Payroll in marketing answer', 'Budget question', 'Payroll export inherited "general" label; no label audit'],
        ['Key in an answer', 'Setup question', 'Secret embedded in an indexed runbook; no secret scanning at ingestion'],
        ['Out-of-scope export', 'Ordinary ticket summary', 'Policy default change without review'],
      ]),
      p('**Stakeholder communication** must be accurate and appropriately cautious. Say what happened, what data or actions were affected, what has been done, what is still being investigated and when the next update comes. Distinguish confirmed facts from working hypotheses. Do not speculate about attacker identity or claim "no data was accessed" until logs show it. Coordinate with privacy and legal on any notification obligations; do not decide those in the incident channel.'),
      p('**Regression testing** closes the loop: add the incident reproduction and nearby variants to the regression suite ([[D11-L08]]), add or adjust the detection that should have caught it earlier ([[D12-L05]]), and record the control change in the inventory and mapping ([[D12-L01]], [[D12-L02]]).'),
      key('A post-incident review is finished when the failed control is changed, tested and owned, not when the report is written.'),
    ],
    boundary: {
      component: 'Post-incident review and follow-up.',
      trustBoundary: 'As identified in the incident.',
      attackerControl: 'As established by the investigation.',
    },
    scenario: {
      title: 'Two drafts of an update',
      setup: 'After the payroll-in-marketing incident ([[D12-L06]]), Ines reviews the communication to affected employees.',
      evidence: [
        code('Draft A (rejected)', 'text', `Subject: AI incident
A sophisticated attack on our AI assistant exposed some data. The AI has been
retrained and the problem is fully fixed. No further action is needed.`, ['Calls it an attack; there was no attacker.', 'Claims retraining; no model was retrained.', '"Fully fixed" before retrieval logs were reviewed.']),
        code('Draft B (sent)', 'text', `Subject: Payroll information shown in an internal assistant answer
On 14/10/2026 a payroll export was incorrectly labelled and became searchable by
Rocky, ROCKTO's internal assistant. Between 02/10 and 14/10, answers to 3 employees
included salary figures for 11 colleagues, including you. We removed the file from
Rocky's index on 14/10 and corrected the labelling rule. We are confirming whether
anyone else retrieved it and will update you by 21/10. Questions: Ines Moreau,
privacy@rockto.example.`, ['States facts, scope and actions.', 'Says what is still being checked and when.', 'Names a contact.']),
      ],
    },
    worked: {
      title: 'Follow-up actions',
      blocks: [
        p('Root cause: drive default label "general" applied to payroll exports, with no label audit at ingestion. Changes: finance drives default to "finance-restricted"; ingestion blocks spreadsheets with salary-like columns unless explicitly labelled; label audit job weekly. Regression: the original query plus 15 variants must retrieve zero payroll chunks for non-payroll personas, with a positive control for Ravi. Detection: alert on payroll-labelled candidates for non-payroll personas.'),
      ],
    },
    controls: [
      { control: 'Root-cause analysis along the control path with owners per finding.', enforcementPoint: 'Post-incident review.', limitation: 'Blame-focused cultures stop people reporting; keep reviews blameless.' },
      { control: 'Communication templates separating facts, hypotheses and next update.', enforcementPoint: 'Incident communications process.', limitation: 'Pressure to reassure; reviewers must hold the line on accuracy.' },
      { control: 'Incident cases added to regression suite and detections.', enforcementPoint: 'CI and SIEM.', limitation: 'Suites grow; maintain them.' },
    ],
    misconception: {
      claim: '"We blocked the phrase that caused it, so the incident is resolved."',
      correction: 'The phrase was the trigger. Resolution means changing the control that let any trigger have that effect, and testing it.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Write two "why" steps for the key-in-an-answer incident, starting from "the key appeared in an answer".',
      modelResponse: ['Why did the key appear? A runbook chunk containing it was retrieved. Why was it in the index? Ingestion has no secret scanning, and the runbook embedded the key. Root cause: no secret scanning at ingestion and secrets kept in documentation.'],
    },
    sourceIds: ['nist-sp-800-61r3', 'nist-ai-rmf', 'owasp-llm02'],
    glossary: ['root-cause', 'regression-suite'],
    related: ['D11-L09', 'D12-L10'],
    conceptTag: 'root-cause-communication',
  },
  {
    id: 'D12-L10',
    title: 'An integrated ROCKTO incident tabletop and improvement plan',
    summary:
      'Runs a full tabletop across detection, triage, containment, recovery and follow-up for a multi-system ROCKTO incident, ending in a prioritized improvement plan.',
    minutes: 25,
    objectives: [
      'Apply triage, containment, preservation and recovery to a multi-system incident.',
      'Identify governance and telemetry gaps exposed by the exercise.',
      'Produce a prioritized improvement plan with owners and evidence.',
    ],
    prerequisites: ['D12-L06', 'D12-L07', 'D12-L08', 'D12-L09'],
    explanation: [
      p('A tabletop rehearses an incident with the people who would handle it, using a written scenario and injected updates, before it happens for real. It tests runbooks, ownership and information flow, not individual skill. Everything in this exercise is fictional and synthetic.'),
      ul(
        '**Participants:** Dana (system owner, AP), Priya (AP lead), Ravi (payroll lead), Luc (appsec), Ines (privacy), Kofi (platform), Hana (SOC).',
        '**Rules:** decisions are made with the information available at each inject; nobody may assume facts not yet revealed; the facilitator records decisions and open questions.',
        '**Output:** a timeline, decisions with reasons, gaps found, and an improvement plan with owners.',
      ),
      p('Work through the injects below. At each one, answer: What do we know? What class is this ([[D12-L06]])? What do we contain, preserve or verify ([[D12-L07]])? Which artifact holds the state ([[D12-L08]])? Who needs to hear what ([[D12-L09]])?'),
      p('Good tabletops surface uncomfortable gaps: a containment switch nobody has tested, a store missing from the inventory, telemetry that cannot answer "who else saw this", an escalation path that ends at someone on leave. Write them down without blame; they are the point of the exercise.'),
      p('Close with an improvement plan that is short, owned and testable. Prefer fixes that change enforcement or recovery capability over fixes that add documentation, and attach each to the evidence that will show it worked: a regression case, a detection replay, a drill.'),
    ],
    boundary: {
      component: 'AP Assist, Rocky, SupplierKB and Ledgerline as an integrated system.',
      trustBoundary: 'Supplier email and portal → AI features → vendor master and payment drafts.',
      attackerControl: 'A compromised Vela Freight mailbox and supplier-portal account (Profile C from [[D11-L01]]).',
    },
    scenario: {
      title: 'Tabletop injects (all synthetic)',
      setup: 'The facilitator reveals injects one at a time. Dates are DD/MM/YYYY.',
      evidence: [
        table('Injects', ['#', 'Time', 'Inject'], [
          ['1', '27/10/2026 09:10', 'Hana: alert "send proposal in AP task" fired 6 times overnight; all denied by dispatcher.'],
          ['2', '09:40', 'Priya: two clerks say AP Assist summaries mention "Vela\'s new bank details per SupplierKB".'],
          ['3', '10:15', 'Kofi: a Vela portal upload from 20/10 is indexed in SupplierKB; Rocky memory has the claim for 3 users.'],
          ['4', '11:00', 'Ravi: an unrelated payroll correction batch is due today; Rocky is used to draft notes for it.'],
          ['5', '11:30', 'Luc: Ledgerline shows one payment draft to Vela at the vendor-master account; one vendor-master change request to …9902 is pending.'],
          ['6', '13:00', 'Vela (by phone, known contact): their mailbox and portal account were compromised on 19/10.'],
        ]),
      ],
    },
    worked: {
      title: 'Model debrief',
      blocks: [
        trace('Decisions (model answer)', [
          { actor: 'triage', event: 'class', detail: 'Manipulation (indirect, via email and portal) with persistence in index and memory; no access defect found so far; dispatcher held.', flag: 'info' },
          { actor: 'contain', event: 'actions', detail: 'Quarantine Vela mail; suspend Vela portal account; pause SupplierKB ingestion from portal; block memory writes mentioning bank details pending review.', flag: 'blocked' },
          { actor: 'preserve', event: 'evidence', detail: 'Export alerts, traces, upload file and hash, memory entries and change request before cleanup.', flag: 'ok' },
          { actor: 'recover', event: 'artifacts', detail: 'Restore index snapshot from 19/10; delete 3 memory entries; reject change request; confirm the one draft uses vendor-master account.', flag: 'ok' },
          { actor: 'scope', event: 'payroll', detail: 'Payroll batch proceeds: no evidence Rocky\'s payroll path is affected; monitor.', flag: 'info' },
          { actor: 'comms', event: 'update', detail: 'Dana briefed at 11:45 and 13:15; AP clerks told to ignore SupplierKB bank details until further notice.', flag: 'ok' },
        ]),
        table('Improvement plan (example)', ['Gap found', 'Change', 'Owner', 'Evidence it works'], [
          ['Portal uploads indexed as trusted', 'Mark unverified; bank details answered only from vendor master', 'Kofi', 'Regression case for poisoned upload passes'],
          ['Memory accepted claims from summaries', 'No memory writes while untrusted content is in context', 'Sam', 'Falsifiable test from [[D11-L03]] exercise passes'],
          ['No alert linking SupplierKB and AP signals', 'Correlate send-proposal alerts with supplier ids', 'Hana', 'Replay of this tabletop fires one combined alert'],
          ['Ingestion pause switch untested', 'Quarterly drill', 'Kofi', 'Drill log with time to pause'],
        ]),
      ],
    },
    controls: [
      { control: 'Tabletop exercises on a schedule with cross-functional participants.', enforcementPoint: 'Governance calendar.', limitation: 'Scenarios reflect what planners imagine.' },
      { control: 'Improvement plan items with owners and evidence criteria.', enforcementPoint: 'Risk register and follow-up reviews.', limitation: 'Items stall without executive attention.' },
    ],
    misconception: {
      claim: '"A tabletop is successful when the team handles everything smoothly."',
      correction: 'A tabletop is successful when it reveals gaps before a real incident does. A smooth run with no findings usually means the scenario was too easy.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Add inject 7 that tests a gap the plan above does not yet cover, and say which participant must act.',
      modelResponse: ['Inject 7, 14:30: a clerk reports she updated Vela\'s phone number in the vendor master on 22/10 using a SupplierKB answer, so the callback in inject 6 may have reached the attacker. Actor: Priya, with Luc; tests whether business records changed by humans after reading AI answers are found by the recovery search.'],
    },
    sourceIds: ['nist-sp-800-61r3', 'nist-ai-rmf', 'mitre-atlas', 'owasp-llm-top10-2025'],
    glossary: ['containment', 'evidence-preservation', 'risk-acceptance'],
    related: ['D11-L10', 'D07-L10'],
    conceptTag: 'incident-tabletop',
  },
];
