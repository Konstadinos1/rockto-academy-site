import { code, mcq, openQ, trace } from '../blocks';
import type { DomainContent } from '../types';

export const D10_QUESTIONS: DomainContent['questions'] = {
  'D10-L01': [
    mcq('foundational', 'Which decision is cheapest to get right at design time and most expensive to retrofit?', [
      ['The colour scheme and typography of the chat interface.', 'Easy to change later.'],
      ['The identity the AI uses to reach backends.', 'Correct.'],
      ['The exact wording of the assistant\'s greeting message.', 'Easy to change later.'],
      ['The number of example questions shown on the empty state.', 'Easy to change later.'],
    ], 'b'),
    mcq('applied', 'A security review of an AI feature finds raw HTML rendering, a shared index without ACLs, and an admin service account. Which finding is the quickest fix?', [
      ['Replacing the admin service account with scoped identities in every backend.', 'Requires identity and API changes.'],
      ['Re-ingesting every document with access-control metadata attached.', 'Requires a full re-index.'],
      ['Switching the renderer to a safe Markdown subset.', 'Correct; hours, not weeks.'],
      ['Splitting the shared index into per-department namespaces.', 'A large data migration.'],
    ], 'c'),
    mcq('applied', 'Why should AI feature reviews still include conventional application security?', [
      ['Because many severe AI-product incidents are ordinary web bugs.', 'Correct.'],
      ['Because AI-specific risks are no longer considered real by most standards bodies.', 'They are real.'],
      ['Because auditors require exactly one conventional check per feature.', 'Not the reason.'],
      ['Because models refuse to process insecure web applications.', 'Not true.'],
    ], 'a'),
    openQ('diagnosis', 'applied', 'A team asked for a security review of "Contract Chat" one week before launch. The review found a shared index without ACL metadata and an admin service account. Diagnose why these findings are so costly now and what process change prevents a repeat.', {
      mechanism: 'Both are architectural decisions embedded in data and identity plumbing; changing them requires re-ingestion and re-plumbing after build.',
      control: 'Design review checkpoint before implementation with AI threat modeling; release gate.',
      extension: 'Suggests interim risk handling (limited pilot audience) and notes cheaper findings (renderer) can be fixed late.',
      exemplar: 'Both findings are baked into how data was ingested and how components authenticate, so fixing them means re-ingesting every document with labels and redesigning identities, weeks of work, where at design time they were a decision. Add an AI design review before implementation (task, data, identities, boundaries) and keep a release gate. For this launch, limit the audience to users allowed to see all contracts until re-ingestion and scoped identities are done.',
      followUp: 'Which three questions would you put on the design-review checklist?',
    }),
    openQ('control', 'applied', 'Propose one AI-specific activity to add to ROCKTO\'s verification stage. Name the enforcement point and a limitation.', {
      mechanism: 'Verification must cover AI-specific failure modes alongside unit tests.',
      control: 'E.g. injection/disclosure/tool-misuse suite with executed-violation thresholds, or deterministic dispatcher policy tests; CI/release gate.',
      extension: 'Limitation: suites cover known attacks, stochastic results, cost.',
      exemplar: 'Add deterministic dispatcher policy tests that assert specific out-of-scope calls are denied (for example external email in the invoice task), run on every push in CI. Limitation: they prove the policy code behaves as written for those cases, not that the policy covers every dangerous combination.',
      followUp: 'How would you decide which denials to test first?',
    }),
  ],
  'D10-L02': [
    mcq('foundational', 'Where should a backend get the tenant for a request made through an AI tool?', [
      ['From a tenant_id argument the model fills in.', 'Model-controlled.'],
      ['From a verified claim tied to the session.', 'Correct.'],
      ['From the tenant name mentioned in the user\'s message.', 'User-controlled text.'],
      ['From the most recent tenant the service account accessed.', 'Not request-specific.'],
    ], 'b'),
    mcq('applied', 'Every Rocky tool uses one admin service account. What is the main consequence?', [
      ['Requests are slower because admin accounts are rate-limited by most providers.', 'Not the main consequence.'],
      ['Any misdirected tool call runs with admin power.', 'Correct.'],
      ['Users cannot log in because their roles conflict with the service account.', 'Unrelated.'],
      ['The model provider will reject requests from admin accounts.', 'Providers do not see backend identities.'],
    ], 'b'),
    mcq('applied', 'Why should tenant enforcement also exist in the data service, not only in the harness?', [
      ['Because the harness cannot read tenant ids at all.', 'It can.'],
      ['Other paths (batch jobs, new tools) reach it.', 'Correct.'],
      ['Because data services are always faster at filtering.', 'Not the reason.'],
      ['Because regulations forbid harness-level checks.', 'No such rule.'],
    ], 'b'),
    openQ('diagnosis', 'applied', 'Diagnose the trace.', {
      scenario: [
        trace('tr_ds02', [
          { actor: 'user', event: 'message', detail: 'Tenant A user: "Check device D-77 for tenant birchline."', flag: 'info' },
          { actor: 'model', event: 'propose', detail: '`get_device_status(tenant_id="birchline", device_id="D-77")`', flag: 'warn' },
          { actor: 'device-api', event: 'execute', detail: 'svc-care (all tenants) returned Birchline device status.', flag: 'violation' },
        ]),
      ],
      mechanism: 'Tenant came from model-controlled arguments; backend used an all-tenant identity without verifying the caller\'s tenant — cross-tenant disclosure.',
      control: 'Remove tenant_id from schema; pass signed tenant claim; device API verifies device belongs to claim\'s tenant; scope svc-care.',
      extension: 'Classifies as disclosure, notes direct user request (no injection needed) and checks logs for other cross-tenant calls.',
      exemplar: 'The user simply asked for another tenant\'s device; the model put "birchline" in tenant_id, and the device API, using an all-tenant service account, trusted it. That is a cross-tenant disclosure needing no injection. Remove tenant_id from the tool schema, pass a signed claim with the session\'s tenant, have the device API check the device belongs to that tenant, and reduce svc-care\'s rights. Search logs for other calls where tenant_id differed from the session tenant.',
      followUp: 'What other tool parameters in SensorCloud Care might identify a principal?',
    }),
    openQ('control', 'applied', 'Design service identities for AP Assist\'s three tools (invoice.search, vendor.lookup, payments.create_draft). Include enforcement point and limitation.', {
      mechanism: 'Per-component least privilege limits misdirected calls.',
      control: 'Separate identities: read invoices; read vendor master; create drafts only; plus user/task claims checked in Ledgerline or proxy.',
      extension: 'Limitation: identity sprawl/rotation; Ledgerline may not support claims.',
      exemplar: 'svc-ap-invoice-read can read invoices only; svc-ap-vendor-read can read vendor master records only; svc-ap-draft can create payment drafts and nothing else (no release, no vendor writes). Each call also carries a signed user-and-task claim checked by a Ledgerline proxy. Limitation: three identities to rotate and monitor, and if Ledgerline cannot read claims, the proxy is the only enforcement point.',
      followUp: 'How would you detect if svc-ap-draft started making unexpected calls?',
    }),
  ],
  'D10-L03': [
    mcq('foundational', 'How should model output be treated before it reaches a database query?', [
      ['As trusted, since ROCKTO\'s own model generated it.', 'Model output is steerable.'],
      ['As untrusted input: parameterize and validate.', 'Correct.'],
      ['As safe if the system prompt forbids SQL injection.', 'Not enforcement.'],
      ['As safe if the output is shorter than 100 characters.', 'Length is irrelevant.'],
    ], 'b'),
    mcq('applied', 'An "ask the ledger" feature executes model-written SQL with a read-write connection. Which change most limits impact?', [
      ['Adding "only use SELECT" to the prompt.', 'Not enforced.'],
      ['Logging all executed SQL statements for weekly review.', 'Detects after damage.'],
      ['A read-only role limited to reporting views.', 'Correct.'],
      ['Lowering the model temperature to zero.', 'Does not constrain SQL.'],
    ], 'c'),
    mcq('applied', 'A file tool joins a model-supplied file name to /data/reports/. What check is essential?', [
      ['Canonicalize; confirm it stays in the directory.', 'Correct.'],
      ['Check that the file name ends in .pdf.', 'Traversal can still escape.'],
      ['Ask the model to confirm that the resolved path is safe before reading.', 'Not enforcement.'],
      ['Limit file names to 50 characters.', 'Insufficient.'],
    ], 'a'),
    openQ('diagnosis', 'applied', 'A pasted supplier note led the model to generate `SELECT ...; UPDATE vendors SET iban=...`, and both statements ran. Diagnose the chain of failures.', {
      mechanism: 'Untrusted text steered model output into an interpreter (SQL) with write privileges and multi-statement execution.',
      control: 'Read-only, view-limited role; disable multi-statement; replace free SQL with parameterized report tools; validate statements.',
      extension: 'Recovery steps (revert, audit changes, payments) and evidence (DB audit logs).',
      exemplar: 'Untrusted text in the pasted note shaped the model\'s SQL; the feature passed that SQL straight to a database connection with write rights and multi-statement execution enabled, so the UPDATE ran. Three layers failed: no parameterization, excessive database privilege and permissive driver settings. Revert V-2210, audit all writes made through this feature and payments since, then use a read-only role on reporting views, disable multi-statement execution, and prefer parameterized report tools.',
      followUp: 'Which database log would show every statement this feature executed?',
    }),
    openQ('control', 'applied', 'Specify output handling for model answers rendered in the Rocky portal. Include enforcement point and limitation.', {
      mechanism: 'Rendered output reaches the browser; XSS and data-leaking links/images.',
      control: 'Safe Markdown subset, no raw HTML, encode text, block external images, allowlist link schemes/hosts, CSP; front-end renderer.',
      extension: 'Limitation: misleading text/links still possible; new views must reuse component.',
      exemplar: 'All answers render through one component that supports a safe Markdown subset, escapes everything else, refuses raw HTML and javascript: links, blocks external images and shows external links as plain text with a warning; a Content Security Policy blocks inline script. Limitation: it cannot stop a convincing false statement, and any new view that bypasses the component reintroduces the risk.',
      followUp: 'How would you stop a new view from bypassing the component?',
    }),
  ],
  'D10-L04': [
    mcq('foundational', 'A hostile document makes the model output an `<img onerror=...>` tag that runs in another user\'s shared view. What vulnerability class is this?', [
      ['Cross-site scripting delivered through model output.', 'Correct.'],
      ['Training data poisoning of the rendering model.', 'No training involved.'],
      ['Membership inference against the shared conversation.', 'Unrelated.'],
      ['A denial-of-service attack on the image server.', 'Not the class.'],
    ], 'a'),
    mcq('applied', 'Which test best checks for SSRF in an AI feature with a link-preview tool?', [
      ['Asking the model whether it would fetch internal URLs.', 'Model answers are not evidence.'],
      ['Planting internal URLs in content and watching fetch logs.', 'Correct.'],
      ['Checking that TLS certificates are valid on the preview server.', 'Not an SSRF test.'],
      ['Counting how many previews are generated per day.', 'Volume says nothing about targets.'],
    ], 'b'),
    mcq('applied', 'Model-written cells exported to CSV start with "=HYPERLINK(...)". What risk is this?', [
      ['SQL injection into the reporting database.', 'Not SQL.'],
      ['Formula injection in spreadsheet apps.', 'Correct.'],
      ['Path traversal on the export server\'s file system.', 'Not path-related.'],
      ['Model extraction through exported data.', 'Unrelated.'],
    ], 'b'),
    openQ('diagnosis', 'applied', 'Rocky\'s main chat view escapes output, but a newly added "shared conversation" view renders answers with innerHTML. Diagnose the failure and its severity.', {
      mechanism: 'A second rendering path bypassed safe handling; planted content can produce script executing in other users\' browsers (cross-user XSS).',
      control: 'Single safe rendering component, CSP, HttpOnly cookies, CI test with planted payload.',
      extension: 'Explains why severity may exceed many prompt-injection findings (session theft across users) and checks logs for exploitation.',
      exemplar: 'Safety lived in one view\'s code, not in a shared component, so the new view reintroduced XSS. Because conversations are shared, a planted document can run script in other users\' browsers and steal sessions, which is more severe than injected text the attacker alone sees. Move all rendering to one safe component, add CSP and HttpOnly cookies, add a planted-payload test to CI, and review shared-view access logs for exploitation.',
      followUp: 'Which logs would show whether the payload already ran for real users?',
    }),
    openQ('control', 'applied', 'Design SSRF protection for a "fetch supplier certificate" tool. Include enforcement point and limitation.', {
      mechanism: 'Model-chosen URLs can target internal services and metadata endpoints.',
      control: 'Egress proxy with domain allowlist, block private/link-local ranges, validate redirects and resolved IPs, sandboxed fetcher without credentials.',
      extension: 'Limitation: allowlisted domains can host malicious content; DNS rebinding requires resolution checks at connect time.',
      exemplar: 'The tool fetches only through an egress proxy that allows verified supplier certificate domains, blocks private, loopback and link-local ranges (including 169.254.169.254) after DNS resolution, re-checks every redirect hop, and runs in a sandbox with no credentials. Limitation: an allowlisted supplier site can still serve misleading content, and the proxy must check resolved addresses at connection time to resist DNS rebinding.',
      followUp: 'Where would you log blocked fetch attempts?',
    }),
  ],
  'D10-L05': [
    mcq('foundational', 'Where should model-written Python from an "analyse spreadsheet" tool run?', [
      ['Inside the API service process for speed.', 'Exposes service credentials.'],
      ['In an ephemeral, credential-free, offline sandbox.', 'Correct.'],
      ['On the user\'s browser through WebAssembly by default.', 'Not the general answer; still needs review.'],
      ['On the database server, close to the data it analyses, for performance.', 'Exposes the database host.'],
    ], 'b'),
    mcq('applied', 'Which sandbox setting most directly prevents exfiltration of results to the internet?', [
      ['A read-only root file system.', 'Prevents writes, not network.'],
      ['A 2 GB memory limit.', 'Resource limit only.'],
      ['Default-deny network egress.', 'Correct.'],
      ['Running as a non-root user.', 'Reduces privilege, not network access.'],
    ], 'c'),
    mcq('applied', 'What does sandboxing NOT do?', [
      ['Limit which files the code can read.', 'It does that.'],
      ['Limit network destinations.', 'It does that.'],
      ['Make the code\'s output trustworthy.', 'Correct.'],
      ['Limit CPU and memory use.', 'It does that.'],
    ], 'c'),
    openQ('diagnosis', 'applied', 'The analysis tool ran model-written code inside the API container, which had LEDGER_TOKEN and PROVIDER_API_KEY in its environment and full egress. No incident is known. Diagnose the exposure and required actions.', {
      mechanism: 'Any steered code could read environment secrets and send them anywhere; exposure exists even without a known incident.',
      control: 'Move execution to ephemeral credential-free, network-denied sandbox; rotate both tokens; review egress logs.',
      extension: 'Explains why rotation is needed without evidence of misuse (cannot prove non-exposure), and scope of review.',
      exemplar: 'Every piece of code the model wrote ran with access to both tokens and unrestricted egress, so any spreadsheet or prompt that steered it toward `os.environ` and a network call could have exfiltrated them. Absence of a known incident is not evidence of safety. Rotate both tokens, review egress logs from that container for unusual destinations, and move execution to ephemeral sandboxes with no credentials and no network.',
      followUp: 'How far back would you review the egress logs?',
    }),
    openQ('control', 'applied', 'Write a sandbox profile for running untrusted document parsers. Include at least four settings, the enforcement point and a limitation.', {
      mechanism: 'Parsers process attacker-controlled files.',
      control: 'Ephemeral, no network, no credentials, read-only input mount, limited output, CPU/memory/time limits, non-root, dropped capabilities; container/microVM runtime.',
      extension: 'Limitation: escapes; parser bugs still crash; output must be validated.',
      exemplar: 'One container per file, destroyed after; input file mounted read-only; writable output directory capped at 50 MB; no network; no environment secrets; non-root user with dropped capabilities; 1 CPU, 1 GB RAM, 30-second timeout. Enforced by the container runtime (or microVMs for multi-tenant uploads). Limitation: a kernel or runtime escape bypasses it, and the extracted text is still untrusted.',
      followUp: 'When would you choose microVMs over containers?',
    }),
  ],
  'D10-L06': [
    mcq('foundational', 'What does TLS between ROCKTO and a model provider protect against?', [
      ['The provider processing prompts in plaintext.', 'Endpoints see plaintext.'],
      ['Network eavesdroppers on the connection.', 'Correct.'],
      ['Engineers reading ROCKTO\'s traces.', 'Not covered by TLS.'],
      ['Prompt injection in retrieved documents.', 'Unrelated.'],
    ], 'b'),
    mcq('applied', 'Which statement for a customer questionnaire is accurate?', [
      ['"Encryption means the provider cannot see your data."', 'False; the provider must process plaintext.'],
      ['"Encrypted in transit and at rest; provider terms reviewed."', 'Correct.'],
      ['"Our AI has no access to your data because everything is encrypted end to end."', 'Misleading.'],
      ['"AES-256 makes prompt injection impossible."', 'Unrelated claim.'],
    ], 'b'),
    mcq('applied', 'Why should secret rotation be rehearsed?', [
      ['Untested rotation fails under pressure.', 'Correct.'],
      ['Rotation improves model accuracy.', 'Unrelated.'],
      ['Providers require monthly rotation rehearsals as a condition of their contracts.', 'Not generally.'],
      ['Rehearsal removes the need for a secret manager.', 'No.'],
    ], 'a'),
    openQ('diagnosis', 'applied', 'A draft security statement reads: "All Rocky data is encrypted end to end with TLS 1.3 and AES-256, so it is fully protected." Diagnose what is misleading.', {
      mechanism: 'TLS/at-rest encryption protect transit/storage, not endpoints; provider, harness, logs, caches process plaintext.',
      control: 'Rewrite to describe transit/rest encryption plus minimization, provider terms, access controls and logging practices.',
      extension: 'Notes "end to end" is inaccurate when the provider is an endpoint and lists plaintext locations.',
      exemplar: '"End to end" is wrong: the model provider is one of the ends and must decrypt prompts to process them, and so do ROCKTO\'s harness, tools, caches and any logs that store content. TLS protects the network path and AES at rest protects storage. A truthful statement describes encryption in transit and at rest, then explains minimization, the reviewed provider terms, access controls and what ROCKTO logs.',
      followUp: 'Which plaintext location would a customer most likely ask about next?',
    }),
    openQ('control', 'applied', 'Design secret handling for the provider API key used by three ROCKTO services. Include enforcement point and limitation.', {
      mechanism: 'Shared long-lived keys widen exposure and complicate rotation.',
      control: 'Per-service keys (or a gateway holding the key), secret manager injection, rotation schedule and runbook, usage monitoring per key.',
      extension: 'Limitation: provider may limit keys; gateway becomes a critical component.',
      exemplar: 'Route provider calls through an internal gateway that alone holds the provider key from the secret manager; services authenticate to the gateway with their own identities, so usage is attributable and services never see the key. Rotate the key every 90 days with a rehearsed runbook and immediately on suspicion. Limitation: the gateway becomes a single point of failure and a high-value target.',
      followUp: 'How would you make the gateway resilient without spreading the key?',
    }),
  ],
  'D10-L07': [
    mcq('foundational', 'Which test can run on every commit without calling a model?', [
      ['A dispatcher policy test that an external send is denied.', 'Correct.'],
      ['A full injection evaluation with 80 adversarial cases.', 'Needs a model and is slower.'],
      ['A benign end-to-end task suite against the provider.', 'Needs a model.'],
      ['A cost and latency benchmark against production traffic.', 'Needs a model and traffic.'],
    ], 'a'),
    mcq('applied', 'A new tool shipped without review because tool definitions lived outside the repository. What fixes the process?', [
      ['Asking developers to mention new tools in the release notes.', 'Voluntary, easily skipped.'],
      ['Tools and scopes in the repo, with review.', 'Correct.'],
      ['Running the unit and integration tests twice before each release.', 'Does not cover configuration.'],
      ['Requiring a larger model for tool selection.', 'Unrelated.'],
    ], 'b'),
    mcq('applied', 'How should thresholds differ between deterministic policy tests and model evaluations?', [
      ['Both should allow a 5% failure rate.', 'Policy tests should not flake.'],
      ['Policy tests must always pass; evaluations allow noise.', 'Correct.'],
      ['Evaluations must always pass exactly; policy tests allow noise.', 'Reversed.'],
      ['Neither should have thresholds.', 'Then they cannot gate releases.'],
    ], 'b'),
    openQ('diagnosis', 'applied', 'CI was green when a web.fetch tool shipped in AP Assist; later Hana saw fetches to internal hosts. The injection suite runs nightly but is not a release requirement. Diagnose the pipeline gaps.', {
      mechanism: 'Configuration (tool registry) outside review; evaluation not gating release; no deterministic SSRF policy test.',
      control: 'Tools in repo with security review; evaluation stage required for release; deterministic test for private-range fetch denial.',
      extension: 'Notes green CI only reflects what it checks, and assesses current exposure.',
      exemplar: 'A green pipeline only means the checks it runs passed. The new tool lived in a registry no review saw, the nightly injection suite was not required for release, and there was no deterministic test that fetches to private ranges are denied. Bring tool definitions into the repository with mandatory security review, make the evaluation stage a release prerequisite, and add the SSRF denial as a policy test. Then check what the fetches already reached.',
      followUp: 'What would you check first about the fetches that already happened?',
    }),
    openQ('control', 'applied', 'Define release approval for a change that adds a new data source to SupplierKB. Include evidence required, approvers, enforcement point and limitation.', {
      mechanism: 'Data scope changes alter disclosure risk and need explicit review.',
      control: 'Evidence: ingestion approval record, retrieval authorization suite results, canary tests, quality metrics; approvers: feature owner + security/privacy; release pipeline gate.',
      extension: 'Limitation: approvers may rubber-stamp; evidence covers tested personas.',
      exemplar: 'Required evidence: the source\'s ingestion approval (writers, owner, authority, access), retrieval authorization results per persona with zero unauthorized retrievals, canary tests, and recall and quality metrics versus the current version. Approvers: the SupplierKB owner and a security or privacy reviewer, enforced as a protected release environment in the pipeline. Limitation: evidence covers only the personas and phrasings tested.',
      followUp: 'Which persona would you always include for a new source?',
    }),
  ],
  'D10-L08': [
    mcq('foundational', 'Why is an input-size limit a security control as well as a cost control?', [
      ['It stops context flooding.', 'Correct.'],
      ['It encrypts large inputs before processing.', 'Unrelated.'],
      ['It prevents all prompt injection.', 'Overclaims.'],
      ['It makes the model more accurate on short inputs.', 'Not the security reason.'],
    ], 'a'),
    mcq('applied', 'A tenant integration bug resubmitted a 38k-token log 41,000 times over a weekend. Which control would have limited the damage most?', [
      ['A clearer error message for very large inputs.', 'Does not cap volume.'],
      ['Per-tenant rate limits and spend caps with alerts.', 'Correct.'],
      ['A larger context window so requests do not fail.', 'Increases cost.'],
      ['A better system prompt asking users to be concise.', 'Not enforcement.'],
    ], 'b'),
    mcq('applied', 'What is the best behaviour when an agent hits its step limit mid-task?', [
      ['Silently truncate and continue with partial context.', 'Silent failure is risky.'],
      ['Stop, report what was done, and allow resumption.', 'Correct.'],
      ['Double the limit automatically and continue.', 'Defeats the limit.'],
      ['Delete the task and its history.', 'Loses work and evidence.'],
    ], 'b'),
    openQ('diagnosis', 'applied', 'Weekend AI spend was 14× normal, 92% from one tenant with no per-tenant limits. The tenant says it was a bug. Diagnose the control gap and whether it matters that no attacker was involved.', {
      mechanism: 'Missing per-tenant rate/spend limits and input limits allowed unbounded consumption; impact is the same whether accidental or malicious.',
      control: 'Per-tenant rate limits, spend caps with alerts, input limits, deduplication caching.',
      extension: 'Notes denial-of-wallet risk, contract terms, and alert-based detection timing.',
      exemplar: 'Without per-tenant rate or spend limits and with a 128k input limit, one integration loop could consume 14× normal spend; it does not matter that it was a bug, because an attacker could do the same deliberately (denial of wallet). Add per-tenant rate limits, daily spend caps with alerts at 80%, a lower input limit with a clear error, and caching of identical requests, and clarify in contracts who bears the cost of runaway usage.',
      followUp: 'Who should receive the 80% spend alert?',
    }),
    openQ('control', 'applied', 'Specify budgets for SensorCloud Care at request, user and tenant scope. Include behaviour at limits, enforcement point and a limitation.', {
      mechanism: 'Budgets at multiple scopes bound cost, abuse and loops.',
      control: 'Request: input/output tokens, timeout; user: requests/min, concurrency; tenant: daily requests/spend; explicit errors and alerts; gateway/harness.',
      extension: 'Limitation: legitimate spikes; tuning from usage data.',
      exemplar: 'Request: max 16k input tokens, 1,500 output tokens, 60-second timeout. User: 20 requests per minute, 2 concurrent conversations. Tenant: daily request cap at twice contracted volume and a spend cap with alerts at 80%. At a limit, return a clear message with the reset time and notify the tenant admin. Enforced in the gateway and harness. Limitation: real incidents at customers may need temporary increases; provide an approved override path.',
      followUp: 'How would you set the initial numbers?',
    }),
  ],
  'D10-L09': [
    mcq('foundational', 'Which telemetry should an AI feature record by default?', [
      ['Full prompts and outputs for every request, kept for a year.', 'Creates a sensitive store.'],
      ['Ids, versions, tool decisions and retrieved chunk ids.', 'Correct.'],
      ['Only error messages and nothing else.', 'Insufficient for investigation.'],
      ['Screenshots of the user\'s browser.', 'Inappropriate.'],
    ], 'b'),
    mcq('applied', 'Where should redaction of secrets in traces happen?', [
      ['At write time, before storage.', 'Correct.'],
      ['At read time, when an engineer opens a trace.', 'Data is already stored unredacted.'],
      ['Monthly, by a cleanup script.', 'Exposure window remains.'],
      ['Only when a secret is reported leaked.', 'Too late.'],
    ], 'a'),
    mcq('applied', 'Which set of artifacts must rollback cover for an AI feature?', [
      ['Only the application container image.', 'Insufficient.'],
      ['Every behaviour-defining artifact.', 'Correct.'],
      ['Only the model provider\'s API version.', 'Insufficient.'],
      ['Only the database schema and its migrations.', 'Insufficient.'],
    ], 'b'),
    openQ('diagnosis', 'applied', 'Rocky\'s trace store holds full prompts and tool results for one year, readable by 60 engineers, and a scan found 14 secrets in it. Diagnose and prioritize fixes.', {
      mechanism: 'Observability became a broad, long-lived sensitive-data store with secrets; exposure through readers and retention.',
      control: 'Rotate found secrets; metadata-first logging with write-time redaction; restrict access with audit; shorten retention; controlled content sampling.',
      extension: 'Prioritizes secret rotation first; checks access logs; notes debugging still possible with ids/decisions.',
      exemplar: 'First rotate the 14 secrets, since 60 people could read them. Then change what is written: ids, versions, tool decisions and retrieved chunk ids by default, with redaction at write time, and only a small, time-limited content sample under approved access. Restrict readers to on-call and security with audited access, cut retention to 30 days for content, and purge existing content. Check trace-store access logs for unusual reads.',
      followUp: 'What evidence would you collect to show debugging still works after the change?',
    }),
    openQ('control', 'applied', 'Design a rollback runbook entry for "SupplierKB answers degraded after release". Include what to roll back, how to decide, enforcement point and a limitation.', {
      mechanism: 'Behaviour depends on several artifacts; telemetry identifies which changed.',
      control: 'Check per-request versions to identify changed artifact; roll back that artifact (prompt/index/model/tool) via pipeline; criteria and owner predefined.',
      extension: 'Limitation: provider-retired versions; data changes (new documents) may not be reversible.',
      exemplar: 'Step 1: compare the versions logged on degraded requests with the last good day (prompt, model id, index snapshot, tool hashes) to find what changed. Step 2: roll back that artifact through the deployment pipeline by version id; the owner decides using predefined thresholds (support rate or abstention change of more than 5 points). Step 3: confirm metrics recover. Limitation: a retired provider model version cannot be restored, and newly ingested documents may need targeted removal rather than a snapshot rollback.',
      followUp: 'How often would you rehearse this runbook?',
    }),
  ],
  'D10-L10': [
    mcq('applied', 'Policy Helper has no tools. What was its most severe finding?', [
      ['An unpinned container image.', 'The image was pinned by digest.'],
      ['Restricted HR files in a staff-wide index.', 'Correct.'],
      ['Missing non-root configuration.', 'It ran as non-root.'],
      ['A missing egress allowlist.', 'Egress was allowlisted.'],
    ], 'b'),
    mcq('applied', 'Why include passing items in a review report?', [
      ['To make the report look balanced to management.', 'Not the purpose.'],
      ['To record what was checked and found sound.', 'Correct.'],
      ['Because passing items need no follow-up.', 'True but not the reason to record them.'],
      ['To reduce the number of findings counted.', 'Not the purpose.'],
    ], 'b'),
    mcq('advanced', 'Which evidence would turn the no-go into a go?', [
      ['Re-index with ACLs; pass both canary tests.', 'Correct.'],
      ['A statement from HR that the folder contains nothing sensitive.', 'Contradicts the folder\'s restricted status.'],
      ['A system-prompt line forbidding investigation topics.', 'Not enforcement.'],
      ['A larger provider model with better refusals.', 'Does not fix data scope.'],
    ], 'a'),
    openQ('diagnosis', 'applied', 'Read the manifest and diagnose one risk it does not address.', {
      scenario: [
        code('Manifest excerpt (synthetic)', 'yaml', `image: registry.rockto.example/policy-helper@sha256:7c1e...
runAsNonRoot: true
egress: [provider-api.example, retrieval.rockto.internal]
identity: svc-policy-helper    # read: policy index only
limits: {requests_per_user_per_min: 20, max_input_tokens: 8000}
logging: {content: false, retrieved_chunk_ids: true}
tools: []`),
      ],
      mechanism: 'Identifies an unaddressed risk such as index content scope/ACL (restricted docs in index), provider terms, rollback readiness, or output rendering not specified.',
      control: 'Proposes the specific control/evidence for that risk (ACL metadata + canaries; terms review; rollback rehearsal; renderer spec).',
      extension: 'Explains why the manifest cannot show it (it is about data or process, not runtime configuration).',
      exemplar: 'The manifest controls runtime configuration well, but it cannot show what is in the policy index. svc-policy-helper can read the whole index, and nothing here proves every document in it is appropriate for all staff. That needs ACL metadata on chunks and canary tests showing restricted documents are not retrievable by a standard staff persona. It is a data-scope question the manifest cannot answer.',
      followUp: 'What other non-runtime evidence would you request?',
    }),
    openQ('control', 'applied', 'Write the go/no-go criteria for launching any answer-only AI service at ROCKTO. Include at least four criteria, the enforcement point and a limitation.', {
      mechanism: 'Answer-only services still carry data scope, rendering, secrets, budget and logging risks.',
      control: 'Criteria: data scope verified (ACL + canaries), safe rendering, secrets via manager/pinned image/egress allowlist, budgets set, metadata logging, rollback rehearsed, provider terms current; release governance gate.',
      extension: 'Limitation: criteria are necessary not sufficient; review quality.',
      exemplar: 'Go requires: (1) index scope verified with ACL metadata and passing restricted and public canary tests; (2) one safe renderer with external images blocked; (3) secrets from the manager, image pinned by digest, egress allowlisted; (4) request and user budgets configured; (5) metadata-first logging with defined retention; (6) rollback rehearsed for prompt and index; (7) provider terms reviewed within 12 months. Enforced as a release governance gate. Limitation: meeting every criterion does not prove the service is free of other flaws.',
      followUp: 'Which criterion would you allow to be waived temporarily, and under what conditions?',
    }),
  ],
};
