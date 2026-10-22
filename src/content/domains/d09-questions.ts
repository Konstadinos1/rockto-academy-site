import { code, mcq, openQ, table } from '../blocks';
import type { DomainContent } from '../types';

export const D09_QUESTIONS: DomainContent['questions'] = {
  'D09-L01': [
    mcq('foundational', 'Which configuration lets a new, unreviewed model reach production without any ROCKTO change?', [
      ['Calling the provider through the alias "latest".', 'Correct.'],
      ['Pinning the provider model to an explicit dated version id.', 'Pinning prevents unreviewed changes.'],
      ['Storing the provider API key in the platform secret manager.', 'Secret storage does not affect which model runs.'],
      ['Logging the model id returned with every provider response.', 'Logging helps detect changes; it does not cause them.'],
    ], 'a'),
    mcq('applied', 'Which component\'s compromise would most directly expose Rocky\'s Ledgerline credentials?', [
      ['A plotting library used only in an offline analysis notebook.', 'No access to the API service\'s credentials.'],
      ['A dependency loaded inside the API service holding the token.', 'Correct.'],
      ['A public benchmark dataset used to compare embedding models.', 'Data, not code with credential access.'],
      ['A colour theme package used by the documentation site.', 'Unrelated to the API service.'],
    ], 'b'),
    mcq('applied', 'Why are AI model artifacts harder to review than ordinary source code?', [
      ['They are always encrypted by their publishers before release.', 'Not generally true.'],
      ['They are written in proprietary languages that reviewers cannot read.', 'Weights are numbers, not a language.'],
      ['Weights are opaque, so review leans on provenance and testing.', 'Correct.'],
      ['They cannot be versioned or hashed like other files.', 'They can be versioned and hashed.'],
    ], 'c'),
    openQ('diagnosis', 'applied', 'An inventory shows: provider alias "latest", package range ^3.2, container tag "stable", MCP server @latest. The team says "nothing changed this week" after behaviour shifted. Diagnose.', {
      mechanism: 'All four are floating references, so upstream changes arrive without a ROCKTO change; "nothing changed" is only true of ROCKTO\'s code.',
      control: 'Pin each (explicit model version, exact package with hash, image digest, exact server version) and monitor.',
      extension: 'Explains how to determine which reference moved (response model ids, lockfile/image digests in logs) and that pinning requires deliberate updates.',
      exemplar: 'Each of those references floats: the provider can move "latest", a rebuild can pull a newer 3.x package or "stable" image, and the MCP server updates on launch. ROCKTO\'s code did not change, but its components may have. Check the model id in responses and the package and image digests in build logs to find what moved, then pin all four to exact versions or digests so updates become reviewed decisions.',
      followUp: 'Which of the four would you pin first, and why?',
    }),
    openQ('control', 'applied', 'Propose one supply-chain control for Rocky, naming the chain it addresses, the enforcement point and a limitation.', {
      mechanism: 'Each chain lets upstream parties change behaviour or code.',
      control: 'E.g. hash-pinned lockfiles (dependencies), image digests (containers), explicit model versions (models), definition hashes (connectors).',
      extension: 'Limitation specific to the control.',
      exemplar: 'Dependencies: require hash-pinned lockfiles and fail the build on any mismatch, enforced in CI. Limitation: it guarantees we install exactly what we approved, including a malicious version if we approved one, so updates still need review.',
      followUp: 'How would you keep pinned dependencies from going stale on security fixes?',
    }),
  ],
  'D09-L02': [
    mcq('foundational', 'What is the status of claims in a model card?', [
      ['Independently verified by the hosting platform.', 'Cards are self-reported.'],
      ['Self-reported claims that inform review.', 'Correct.'],
      ['Legally binding warranties of model behaviour.', 'Not generally.'],
      ['Irrelevant once the model is downloaded.', 'Still informative.'],
    ], 'b'),
    mcq('applied', 'A model is "open-weight" with a non-commercial licence. ROCKTO wants it in a paid product. What follows?', [
      ['It can be used because the weights are public.', 'Availability is not permission.'],
      ['It can be used if ROCKTO fine-tunes it first.', 'Derivatives usually inherit restrictions.'],
      ['It cannot be used commercially under that licence.', 'Correct.'],
      ['It can be used if the model card omits licence terms.', 'Missing terms are a gap, not permission.'],
    ], 'c'),
    mcq('applied', 'A model card says nothing about training data. How should intake treat this?', [
      ['As a recorded risk with an owner.', 'Correct.'],
      ['As evidence the training data is clean and licensed.', 'Absence is not evidence.'],
      ['As irrelevant, since evaluation results are provided.', 'Evaluation does not cover rights or contamination.'],
      ['As a reason to skip evaluation and accept directly.', 'Opposite.'],
    ], 'a'),
    openQ('diagnosis', 'applied', 'Compare these two embedding models and diagnose which to shortlist for SupplierKB (French and English content).', {
      scenario: [
        table('Cards (synthetic)', ['Item', 'E1', 'E2'], [
          ['Licence', 'Commercial allowed', 'Non-commercial'],
          ['Languages evaluated', 'EN, FR', 'EN'],
          ['Format', 'safetensors', 'pickle-based .bin'],
          ['Training data', 'Described', 'Undisclosed'],
        ]),
      ],
      mechanism: 'E2 fails licence for commercial use; also unsafe format, undisclosed data and no French evaluation; E1 fits on all.',
      control: 'Shortlist E1; still run ROCKTO evaluation (FR/EN), record card version and gaps.',
      extension: 'Notes cards are self-reported and that evaluation on own data is still required.',
      exemplar: 'E2 is out on licence alone (non-commercial), and its pickle-based format, undisclosed training data and English-only evaluation add risk. E1 matches: commercial licence, French and English evaluated, safe format, described data. Shortlist E1, but the card is self-reported, so evaluate it on SupplierKB\'s own French and English queries and record the card version used.',
      followUp: 'What would you do if E1 performed poorly on French contract clauses?',
    }),
    openQ('control', 'applied', 'Define the licence check step in ROCKTO\'s model intake. State where it sits and a limitation.', {
      mechanism: 'Licences restrict use independent of availability.',
      control: 'Legal review of licence vs intended use, recorded with version/date, blocking intake until done.',
      extension: 'Limitation: licence changes between versions; derivative/fine-tune terms; ambiguity.',
      exemplar: 'Before any model or dataset enters the registry, the intake form records its licence text and version, the intended use and distribution, and legal\'s decision with date; the registry blocks promotion until the decision exists. Limitation: licences can change in later versions, so an upgrade needs a new check, and some terms are ambiguous enough to need negotiation.',
      followUp: 'Who should be able to override a blocked licence decision?',
    }),
  ],
  'D09-L03': [
    mcq('foundational', 'Why can loading a pickle-based model file be dangerous?', [
      ['Unpickling can execute arbitrary code embedded in the file.', 'Correct.'],
      ['Pickle files are always too large for normal memory.', 'Size is not the danger.'],
      ['Pickle files corrupt GPU drivers and CUDA libraries when loaded.', 'Not a general property.'],
      ['Pickle files leak the user\'s password to the publisher.', 'Not inherent; though code execution could do anything.'],
    ], 'a'),
    mcq('applied', 'What does a tensor-only format like safetensors change?', [
      ['No code runs at load; behaviour still needs testing.', 'Correct.'],
      ['It proves the model is free of backdoors and bias.', 'Format does not prove behaviour.'],
      ['It encrypts the weights so they cannot be stolen.', 'Not encryption.'],
      ['It makes signature verification unnecessary.', 'Integrity still matters.'],
    ], 'a'),
    mcq('applied', 'A contractor sends a .bin model and asks you to load it in a notebook with cloud credentials. What is the right action?', [
      ['Load it quickly, then rotate credentials afterwards.', 'Code would already have run with those credentials.'],
      ['Load it only if the file name and size look legitimate for a model.', 'Names prove nothing.'],
      ['Do not load it; send it through intake.', 'Correct.'],
      ['Load it in read-only mode to be safe.', 'Unpickling still executes code.'],
    ], 'c'),
    openQ('diagnosis', 'applied', 'Interpret this scan result and diagnose the risk.', {
      scenario: [
        code('Scan output (synthetic)', 'text', `scan vendor-classifier.pt
format: pickle
references: torch._utils._rebuild_tensor_v2, builtins.exec, base64.b64decode
verdict: UNSAFE`),
      ],
      mechanism: 'The pickle references exec and base64 decode, indicating embedded code that runs on load; loading = executing the publisher\'s payload.',
      control: 'Quarantine, do not load; obtain safe-format artifact; investigate source; remove credentials from environments that load models.',
      extension: 'Notes scanners help but cannot prove safety, and isolated conversion/analysis procedure.',
      exemplar: 'A weights file has no reason to reference exec and base64 decoding: this is a pattern for running hidden code when the file is unpickled. Loading it anywhere would execute that code with the loader\'s privileges. Quarantine it, do not load it, ask the vendor for a safetensors version and investigate how this file was produced. Scanners catch known patterns like this one but cannot certify a clean result, so any untrusted pickle is opened only in an isolated sandbox.',
      followUp: 'Which credentials exist in the environments where your team loads models today?',
    }),
    openQ('control', 'applied', 'Design a policy for model file formats at ROCKTO. Include enforcement point and limitation.', {
      mechanism: 'Pickle-based formats execute code; tensor-only formats do not.',
      control: 'Accept tensor-only formats from external sources; pickle only from internal trusted builds or converted in sandbox; loaders configured to refuse unsafe formats; registry checks.',
      extension: 'Limitation: ecosystem defaults, custom-code formats, internal compromise.',
      exemplar: 'External models are accepted only in tensor-only formats such as safetensors; pickle-based files from outside are converted in an isolated sandbox with no credentials or network, and the original discarded. The registry rejects pickle uploads from external sources, and production loaders are configured to refuse them. Limitation: some frameworks bundle custom code that must be reviewed separately, and an internal build could still be tampered with.',
      followUp: 'How would you handle a model that requires custom layer code?',
    }),
  ],
  'D09-L04': [
    mcq('foundational', 'What does an integrity hash in a lockfile guarantee?', [
      ['That the installed files match the bytes you reviewed.', 'Correct.'],
      ['That the package has no known vulnerabilities at all.', 'Hashes say nothing about vulnerabilities.'],
      ['That the package maintainer is a verified organization.', 'Not established by a hash.'],
      ['That newer versions will install automatically when released.', 'The opposite.'],
    ], 'a'),
    mcq('applied', 'A dependency update adds a post-install script that fetches code from a CDN, from a new maintainer. What should happen?', [
      ['Merge it because automated tests passed in CI.', 'Tests may not cover install-time behaviour.'],
      ['Merge it but disable telemetry with an environment variable.', 'Unknown fetched code may ignore it.'],
      ['Reject it and report; keep the pinned previous version.', 'Correct.'],
      ['Merge it only on developer laptops, not production.', 'Laptops hold credentials too.'],
    ], 'c'),
    mcq('applied', 'An internal package "rockto-ai-utils" also exists on the public registry under the same name. What risk is this?', [
      ['Dependency confusion: builds may fetch the public package.', 'Correct.'],
      ['License violation, because names must be unique worldwide.', 'Not the security risk.'],
      ['Model poisoning of the public package\'s training data.', 'Unrelated.'],
      ['Nothing at all, as long as the internal package has a newer version number.', 'Version precedence can favour the public one.'],
    ], 'a'),
    openQ('diagnosis', 'applied', 'Builds use `vector-db-client>=3.2` without a lockfile. A malicious 3.5.0 was published yesterday. Diagnose exposure and the immediate steps.', {
      mechanism: 'Unpinned ranges mean any build since publication may have installed 3.5.0; exposure depends on which builds ran and where they deployed.',
      control: 'Identify builds/environments with 3.5.0 (SBOM/build logs), roll back to pinned 3.4.1 with hash, rotate credentials in affected environments, add lockfiles.',
      extension: 'Checks egress/IOC, notes developer machines, and future update review process.',
      exemplar: 'Without a lockfile, every build or install since 3.5.0 appeared may have pulled it. Use build logs and SBOMs to list environments with 3.5.0, including developer machines. Rebuild with 3.4.1 pinned by hash, rotate any credentials present in affected environments, and check egress logs for the package\'s indicators. Then require hash-pinned lockfiles so the next malicious release cannot arrive automatically.',
      followUp: 'How would you find developer machines that installed 3.5.0?',
    }),
    openQ('control', 'applied', 'Write the review checklist for dependency update pull requests in AI services. Name the enforcement point and a limitation.', {
      mechanism: 'Updates can introduce malicious or vulnerable code.',
      control: 'Changelog, maintainer changes, install scripts, network calls, known vulnerabilities, tests; required review in PR process.',
      extension: 'Limitation: obfuscation; reviewer time; transitive deps.',
      exemplar: 'For each update PR: read the changelog; check for maintainer or ownership changes; diff for new install scripts, network calls, file access and obfuscated code; check vulnerability databases for the new version; run the full test suite including AI security cases. Enforced as a required review on dependency PRs. Limitation: transitive dependencies and obfuscated changes are easy to miss, so high-risk services get extra scrutiny.',
      followUp: 'Which services would you classify as high-risk for dependency review?',
    }),
  ],
  'D09-L05': [
    mcq('foundational', 'What question does an AI-BOM answer during an incident?', [
      ['Whether the affected model is ethically aligned.', 'Not what an inventory answers.'],
      ['Which systems contain the affected component.', 'Correct.'],
      ['Who wrote each line of the application\'s code.', 'Not the purpose.'],
      ['How much each model costs per thousand tokens.', 'Not the purpose.'],
    ], 'b'),
    mcq('applied', 'A build provenance attestation proves what?', [
      ['That the model trained on clean, licensed data.', 'Provenance proves process, not data quality.'],
      ['It was built from the stated sources and pipeline.', 'Correct.'],
      ['That the artifact contains no vulnerabilities.', 'Not established.'],
      ['That the artifact will behave identically in production as in testing.', 'Not established.'],
    ], 'b'),
    mcq('applied', 'An advisory names a malicious image version. Which system is most likely affected?', [
      ['A system pinned to an older image digest.', 'Pinned to a different version.'],
      ['A system that floats on a "stable" tag.', 'Correct.'],
      ['A system that does not use that image at all.', 'Unaffected.'],
      ['A system whose SBOM was generated last week.', 'Having an SBOM does not imply exposure.'],
    ], 'b'),
    openQ('diagnosis', 'applied', 'An advisory says a base model checkpoint published on a hub has a backdoor. ROCKTO has no AI-BOM. Diagnose the consequence and the minimal record that would have helped.', {
      mechanism: 'Without an inventory linking systems to base models/fine-tunes, finding affected systems requires manual investigation across teams.',
      control: 'AI-BOM per system listing base model id/version/digest, fine-tunes derived from it, deployments.',
      extension: 'Notes derived artifacts (fine-tunes, distilled models) and dataset lineage; time-to-answer as metric.',
      exemplar: 'Without an AI-BOM, nobody can quickly say which systems use that base checkpoint, directly or through fine-tunes and distilled models, so the team has to interview owners and inspect deployments while exposure continues. A minimal AI-BOM per system would list the base model id and digest, every fine-tune and derived model built on it, and where each is deployed, which turns the question into a query.',
      followUp: 'How would you keep the AI-BOM current automatically?',
    }),
    openQ('control', 'applied', 'Specify how ROCKTO\'s pipeline should produce and use AI-BOMs. Name the enforcement point and a limitation.', {
      mechanism: 'Inventories must be generated automatically to be accurate.',
      control: 'Build/training pipelines emit AI-BOM (models, datasets, packages, images, connectors with versions/digests) to inventory; deployment admission requires one.',
      extension: 'Limitation: components added outside pipelines; runtime-loaded models; connectors configured by users.',
      exemplar: 'Every build and training job emits an AI-BOM listing model ids and digests, dataset versions, package versions with hashes, image digests and pinned MCP servers, stored in the inventory; deployment admission rejects artifacts without one. Limitation: anything added outside the pipeline, such as a connector a user configures locally or a model downloaded at runtime, will be missing.',
      followUp: 'How would you detect models downloaded at runtime?',
    }),
  ],
  'D09-L06': [
    mcq('foundational', 'What does "promote, not rebuild" mean for AI artifacts?', [
      ['Production gets the tested artifact, by digest.', 'Correct.'],
      ['Production retrains the model with production data for freshness.', 'That creates an untested artifact.'],
      ['Staging is skipped for small prompt changes.', 'Prompts change behaviour too.'],
      ['Each environment uses its own model provider.', 'Not the meaning.'],
    ], 'a'),
    mcq('applied', 'Production answers differ from staging. Logs show an unversioned prompt edit and a different index snapshot in production. What is the root problem?', [
      ['The model provider is serving different weights per environment.', 'Logs show the same model id.'],
      ['Environment drift from editing and rebuilding in production.', 'Correct.'],
      ['Staging has too little traffic to measure quality.', 'Not the issue shown.'],
      ['Users in production ask harder questions.', 'Possible but the logs show concrete drift.'],
    ], 'b'),
    mcq('applied', 'Which logging practice best lets you reproduce a specific answer?', [
      ['Logging only the final answer text.', 'Insufficient.'],
      ['Logging the user\'s department and role for each request.', 'Insufficient.'],
      ['Log all component versions per request.', 'Correct.'],
      ['Logging the server hostname and process id for each request.', 'Insufficient.'],
    ], 'c'),
    openQ('diagnosis', 'applied', 'A "hotfix" to SupplierKB\'s system prompt was made through an admin UI in production and fixed one complaint; a week later abstentions doubled. Diagnose.', {
      mechanism: 'Unversioned, untested prompt edit changed behaviour beyond the intended fix; bypassed release testing; no record to correlate.',
      control: 'Prompts in version control, deployed via pipeline with release suite; per-request prompt version logging.',
      extension: 'Explains how to confirm (diff, timing, metrics) and rollback.',
      exemplar: 'The admin-UI edit changed behaviour for all questions, not just the complaint, and never went through the release suite, so its side effect (more abstentions) shipped unnoticed. Confirm by comparing the prompt before and after and correlating the metric change with the edit time. Roll back, move prompts into version control with a pipeline that runs the release suite, and log the prompt version on every request.',
      followUp: 'How would you still allow urgent prompt fixes quickly?',
    }),
    openQ('control', 'applied', 'Define the versioning rules for SupplierKB index snapshots. Include enforcement point and limitation.', {
      mechanism: 'Index snapshots change evidence and must be tested like other artifacts.',
      control: 'Snapshots built once, immutable id/hash, tested in staging (retrieval suite), promoted by id; requests log snapshot id; deployment pipeline.',
      extension: 'Limitation: freshness needs vs promotion delay; large storage.',
      exemplar: 'Each index snapshot is built once from pinned source versions, gets an immutable id and manifest hash, runs the retrieval authorization and quality suite in staging, and is promoted to production by id through the deployment pipeline; every request logs the snapshot id. Limitation: urgent document removals cannot wait for a full promotion cycle, so there must be a tested fast path for deletions.',
      followUp: 'What would the fast path for urgent deletions look like?',
    }),
  ],
  'D09-L07': [
    mcq('foundational', 'Why is `npx some-mcp-server@latest` in a client configuration a supply-chain risk?', [
      ['Every launch can run new, unreviewed code.', 'Correct.'],
      ['npx is too slow to start MCP servers reliably.', 'Not the risk.'],
      ['@latest disables the MCP protocol\'s encryption.', 'Not true.'],
      ['The model cannot call tools from npx servers.', 'It can.'],
    ], 'a'),
    mcq('applied', 'A pinned remote server\'s definitions are unchanged, but its results now include instructions to call other tools. What caught this?', [
      ['Pinning the hash of each tool definition at approval.', 'Definitions did not change.'],
      ['Monitoring result size and content.', 'Correct.'],
      ['TLS certificate validation on every connection to the server.', 'Does not inspect content.'],
      ['The provider\'s safety filter.', 'Not designed for this.'],
    ], 'b'),
    mcq('applied', 'Which event should trigger re-review of an approved MCP server?', [
      ['A user rating the server five stars in a survey.', 'Not a review trigger.'],
      ['The server\'s operator changing ownership.', 'Correct.'],
      ['The client application updating its theme.', 'Unrelated.'],
      ['The model provider releasing a new model.', 'Not about the server.'],
    ], 'b'),
    openQ('diagnosis', 'applied', 'A popular community MCP server package was taken over by a new maintainer, who released a version that uploads files to an external host. ROCKTO developers launch it with @latest. Diagnose exposure and response.', {
      mechanism: 'Floating launch pulls the malicious version; local server runs with developer privileges and may exfiltrate files.',
      control: 'Identify machines that launched new version, block/remove, check egress, rotate credentials accessible on those machines, pin and sandbox.',
      extension: 'Supply-chain monitoring of maintainers/advisories; managed configuration.',
      exemplar: 'Every developer who launched the server since the release ran the new code with their own privileges, which may have uploaded local files. Use endpoint and egress logs to find those machines and connections to the external host, remove the server, rotate credentials stored on affected machines, and investigate what was uploaded. Then pin approved versions with integrity checks, sandbox local servers, manage client configuration centrally and watch for maintainer changes.',
      followUp: 'Which files on a developer laptop would you treat as most sensitive?',
    }),
    openQ('control', 'applied', 'Specify monitoring for third-party MCP servers. Include signals, enforcement point and limitation.', {
      mechanism: 'Behaviour can change without definition changes.',
      control: 'Baseline result sizes, instruction-pattern rate, tool-call frequency, egress destinations; alerts to SIEM; client telemetry.',
      extension: 'Limitation: subtle changes below thresholds; privacy of logged content.',
      exemplar: 'The client records, per server and tool, result sizes, rate of imperative instruction-like text in results, call frequency, and (for local servers) outbound connections, and sends alerts to the SIEM when they deviate from a 30-day baseline. Limitation: a careful attacker can keep changes small, and logging result content must itself respect data minimization.',
      followUp: 'What would you log instead of full result content?',
    }),
  ],
  'D09-L08': [
    mcq('foundational', 'Why pin explicit provider model versions?', [
      ['So behaviour changes only when ROCKTO upgrades.', 'Correct.'],
      ['Because pinned versions are always cheaper per token.', 'Not necessarily.'],
      ['Because aliases are not allowed by providers.', 'They are commonly offered.'],
      ['So the provider cannot see ROCKTO\'s prompts.', 'Unrelated.'],
    ], 'a'),
    mcq('applied', 'After the alias moved, abstentions rose from 9% to 19% and support rate rose from 88% to 91%. How is this best described?', [
      ['A pure regression that must be rolled back immediately.', 'Support improved; it is a trade-off.'],
      ['A trade-off to evaluate before deciding.', 'Correct.'],
      ['Proof that the new model is poisoned.', 'No evidence.'],
      ['An improvement that needs no review.', 'Coverage may have dropped.'],
    ], 'b'),
    mcq('applied', 'What must be true before switching to a fallback provider during an outage?', [
      ['The fallback is cheaper than the primary.', 'Not the key requirement.'],
      ['The fallback has the same model name.', 'Irrelevant.'],
      ['Its terms reviewed and the feature tested.', 'Correct.'],
      ['The fallback is hosted in the same region as users.', 'May matter, but terms and testing come first.'],
    ], 'c'),
    openQ('diagnosis', 'applied', 'During a provider outage, an engineer switched Rocky to a second provider "temporarily" using a personal account key. Diagnose the problems.', {
      mechanism: 'Unreviewed provider terms (retention/training/processing) for ROCKTO data, credential misuse, untested behaviour.',
      control: 'Pre-approved, reviewed fallback with organizational account; runbook; degraded mode option.',
      extension: 'Assesses data already sent (what, how long), revoke key, contract review; notes behaviour testing.',
      exemplar: 'ROCKTO data went to a provider whose terms nobody reviewed, under a personal account ROCKTO has no contract for, and the feature ran on an untested model. Revoke the key, determine what data was sent during the switch and under which terms, and involve privacy and legal. Going forward, keep a pre-reviewed fallback on an organizational account with tested behaviour, or use a degraded mode, with a runbook that says who can switch.',
      followUp: 'What would SupplierKB\'s degraded mode look like?',
    }),
    openQ('control', 'applied', 'Design behavioural monitoring that would detect a provider model change. Name signals, enforcement point and a limitation.', {
      mechanism: 'Provider changes alter behaviour without ROCKTO deployments.',
      control: 'Track model id in responses, refusal/abstention rates, answer length, tool-call patterns, support metrics, cost; alerts on drift; observability.',
      extension: 'Limitation: metrics drift for other reasons (traffic mix); triage needed.',
      exemplar: 'Record the model id from every response and alert when it changes; track daily abstention rate, refusal rate, average answer length, tool-call mix, sampled support rate and cost per task against a 14-day baseline, alerting on large deviations. Implemented in observability dashboards. Limitation: traffic mix changes (month-end) can move the same metrics, so alerts need triage.',
      followUp: 'Which single signal would you alert on first?',
    }),
  ],
  'D09-L09': [
    mcq('foundational', 'Why must shadow mode for an agent stub its tools?', [
      ['So it cannot cause real side effects.', 'Correct.'],
      ['Because tools are too slow for shadow traffic.', 'Not the reason.'],
      ['Because shadow models cannot call tools.', 'They can if allowed.'],
      ['To save logging storage and reduce the cost of running shadow traffic.', 'Not the reason.'],
    ], 'a'),
    mcq('applied', 'A candidate model keeps executed violations at 0 but raises proposed violations from 14 to 22. What does this mean?', [
      ['It is easier to steer; more rests on the dispatcher.', 'Correct.'],
      ['It is exactly as secure, since nothing executed.', 'Proposals matter.'],
      ['It is more secure because it tries more tools.', 'Not supported.'],
      ['The evaluation is invalid because the numbers disagree.', 'They measure different things.'],
    ], 'a'),
    mcq('applied', 'When should rollback criteria for a canary be defined?', [
      ['Before the release starts.', 'Correct.'],
      ['After the first incident report.', 'Too late and biased.'],
      ['Only if the canary fails.', 'Circular.'],
      ['Never; engineers decide case by case.', 'Leads to inconsistent decisions.'],
    ], 'a'),
    openQ('diagnosis', 'applied', 'A model upgrade passed the quality suite and shipped. Within a day, cost per task rose 60% and month-end processing slowed. Diagnose the release-process gap.', {
      mechanism: 'The release suite did not include cost/latency criteria or realistic volume tests.',
      control: 'Add cost and latency gates, load tests, canary with cost alerts and rollback criteria.',
      extension: 'Notes benign completion and security also need to be part, and that canary would have limited impact.',
      exemplar: 'The suite measured answer quality but not cost or latency at realistic volume, so a more verbose or slower model passed. Add cost-per-task and p95 latency gates on a month-end-sized load test, and release through a canary with cost alerts and predefined rollback thresholds so a 60% increase affects a small share of traffic before anyone decides.',
      followUp: 'What cost threshold would trigger an automatic rollback?',
    }),
    openQ('control', 'applied', 'List the five areas of a release suite for AP Assist and one pass criterion for the security area. Name the enforcement point and a limitation.', {
      mechanism: 'Releases must stay useful, safe and affordable.',
      control: 'Quality, security, benign tasks, cost/latency, regressions; security criterion e.g. zero executed violations and canaries not leaked; CI release gate.',
      extension: 'Limitation: suites lag new attacks; proposed-violation trends should be tracked.',
      exemplar: 'Areas: quality (labelled questions and slices), security (injection, disclosure and tool-misuse cases), benign end-to-end tasks, cost and latency, and regressions from past incidents. Security criterion: zero executed violations and zero leaked canaries, with proposed violations reported against the current version. Enforced as a CI release gate. Limitation: the suite covers known attacks; new techniques need regular additions.',
      followUp: 'How often would you add new cases to the security area?',
    }),
  ],
  'D09-L10': [
    mcq('applied', 'Which field makes an intake record accountable?', [
      ['Named owner and risk acceptor.', 'Correct.'],
      ['The vendor\'s marketing description.', 'Not accountability.'],
      ['The number of pages and annexes in the vendor\'s signed contract.', 'Irrelevant.'],
      ['The model\'s parameter count.', 'Technical detail only.'],
    ], 'a'),
    mcq('applied', 'Why place the vendor extractor where bank fields are ignored?', [
      ['Its worst failure then cannot redirect payments.', 'Correct.'],
      ['Because extractors cannot read bank details at all.', 'They can.'],
      ['Because bank fields slow down extraction.', 'Not the reason.'],
      ['Because the vendor licence forbids bank fields.', 'Not stated.'],
    ], 'a'),
    mcq('advanced', 'The training data of an accepted component cannot be verified. How should the record treat this?', [
      ['Omit it, since evaluation passed.', 'Hides a known gap.'],
      ['Record the gap, conditions and review date.', 'Correct.'],
      ['Reject every component that has any documentation gap at all.', 'Over-restrictive; gaps can be accepted knowingly.'],
      ['Ask the model to describe its own training data.', 'Not evidence.'],
    ], 'b'),
    openQ('diagnosis', 'applied', 'An intake record reads: "Component approved. Signed by vendor. Looks good." Diagnose what is missing.', {
      mechanism: 'No evidence beyond signature (which proves origin only), no placement, licence, format, evaluation, gaps, conditions, owner or review date.',
      control: 'Use the standard record fields; add evaluation and conditions.',
      extension: 'Explains why each missing field matters for incidents and governance.',
      exemplar: 'The record shows only that the artifact came from the vendor unchanged. It does not say where the component runs or what it can reach, whether the licence fits, whether the format is safe, how it performed on ROCKTO data, what could not be verified, what conditions apply, who owns it, who accepted the risk, or when it will be reviewed. An incident responder could not use it. Redo it with the standard fields.',
      followUp: 'Which missing field would an incident responder need first?',
    }),
    openQ('control', 'applied', 'Write the conditions for accepting a third-party embedding model into SupplierKB. Include at least three conditions, the enforcement point and a limitation.', {
      mechanism: 'Conditions bound the component\'s impact and keep acceptance current.',
      control: 'Pinned digest; safe format; evaluation thresholds on FR/EN; monitoring of retrieval quality; re-review triggers; enforced in registry/deployment.',
      extension: 'Limitation: conditions only as good as monitoring/enforcement; embedding drift.',
      exemplar: 'Conditions: pinned digest in a tensor-only format; retrieval recall on ROCKTO\'s French and English set at or above the current model; weekly monitoring of retrieval metrics with alerts; no exposure of raw embeddings outside SupplierKB; re-review on any version change or after 12 months. Enforced by the registry (digest, format) and the deployment gate (evaluation). Limitation: conditions that rely on monitoring only help if someone acts on the alerts.',
      followUp: 'Who should receive the retrieval-quality alerts?',
    }),
  ],
};
