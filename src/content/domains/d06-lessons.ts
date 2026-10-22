import { code, flow, key, note, p, table, trace, ul, warn } from '../blocks';
import type { LessonDraft } from '../types';

export const D06_LESSONS: LessonDraft[] = [
  {
    id: 'D06-L01',
    title: 'The ingestion-to-answer retrieval pipeline',
    summary:
      'Walks the full RAG pipeline (acquire, parse, chunk, embed, index, retrieve, rerank, assemble, generate) and the security question at each stage.',
    minutes: 16,
    objectives: [
      'Name each stage of a retrieval pipeline and what it produces.',
      'Identify the security question that applies at each stage.',
      'Locate where access control, provenance and parsing safety must be enforced.',
    ],
    prerequisites: ['D01-L04', 'D05-L04'],
    explanation: [
      p('{{rag|Retrieval-augmented generation}} is a pipeline, not a feature. Each stage transforms data and each can introduce a security or reliability failure. Knowing the stages lets you place controls precisely instead of saying "secure the RAG".'),
      flow('SupplierKB pipeline', [
        { label: 'Acquire', zone: 'external', note: 'Connectors pull files' },
        { label: 'Parse', zone: 'boundary', note: 'PDF/HTML → text' },
        { label: 'Chunk + metadata', zone: 'trusted', note: 'Owner, ACL, version' },
        { label: 'Embed + index', zone: 'trusted', note: 'Vector store' },
        { label: 'Retrieve + filter', zone: 'boundary', note: 'Per-user ACL' },
        { label: 'Rerank + assemble', zone: 'trusted', note: 'Context budget' },
        { label: 'Generate', zone: 'model', note: 'Answer + citations' },
      ]),
      table('Security question per stage', ['Stage', 'Question', 'Typical failure'], [
        ['Acquire', 'Who approved this source, and who can write to it?', 'Connector pulls an unvetted shared folder'],
        ['Parse', 'Can a hostile file harm the parser or hide content?', 'Parser exploit; hidden text'],
        ['Chunk + metadata', 'Does every chunk carry owner, access and version?', 'Access labels lost when splitting'],
        ['Embed + index', 'Who can write to or read the index?', 'Index writable by any service'],
        ['Retrieve + filter', 'Is the requester\'s authorization applied before similarity results return?', 'Filter missing on one code path'],
        ['Rerank + assemble', 'Can ranking or truncation drop the right evidence?', 'Stale chunk outranks current'],
        ['Generate', 'Is retrieved text treated as data, not instructions?', 'Injection from a document'],
      ]),
      p('Two properties must flow through every stage: **access metadata** (who may read this chunk) and **provenance** (where it came from, which version). If either is dropped at any stage, later stages cannot recover it. A chunk without access labels can only be served to everyone or to no one.'),
      p('The rest of this domain takes these stages in turn: ownership and approval ([[D06-L02]]), chunk-level authorization ([[D06-L03]]), search mechanics ([[D06-L04]]), poisoned content ([[D06-L05]]), isolation and revocation ([[D06-L06]]), parsing ([[D06-L07]]) and evidence authority ([[D06-L08]]).'),
    ],
    boundary: {
      component: 'The whole retrieval pipeline from connector to answer.',
      trustBoundary: 'Source content entering the pipeline; retrieved chunks entering a user\'s context.',
      attackerControl: 'Depends on the source: anyone who can edit a connected folder or send a file that gets ingested.',
    },
    scenario: {
      title: 'Mapping SupplierKB',
      setup: 'Kofi documents SupplierKB before an expansion to more teams. Luc annotates each stage with its current control.',
      evidence: [
        table('Current state (synthetic)', ['Stage', 'Current control', 'Gap'], [
          ['Acquire', 'Procurement SharePoint folder', 'Folder also writable by 40 contractors'],
          ['Parse', 'Generic PDF library in the API service', 'Runs with API service permissions'],
          ['Chunk + metadata', 'Supplier name only', 'No ACL, no version'],
          ['Retrieve + filter', 'None', 'All users see all chunks'],
        ]),
      ],
    },
    worked: {
      title: 'Prioritizing',
      blocks: [
        p('The missing ACL metadata blocks everything else: retrieval cannot filter on labels that do not exist. Order of work: (1) add owner, classification and version metadata at chunking, copied from the source system\'s permissions; (2) apply a mandatory filter at retrieval; (3) move parsing to an isolated worker; (4) review who can write to the source folder. Each step maps to one stage and can be tested separately.'),
      ],
    },
    controls: [
      { control: 'Carry access and provenance metadata from source to every chunk.', enforcementPoint: 'Chunking stage.', limitation: 'Source permissions may themselves be wrong or change later.' },
      { control: 'Document the pipeline with an owner and control per stage.', enforcementPoint: 'Architecture review.', limitation: 'Documentation does not enforce; test each control.' },
    ],
    misconception: {
      claim: '"RAG is just search, so normal search security covers it."',
      correction: 'RAG copies content into new stores, transforms it, and places it in a model\'s context where it can act as instructions. Each stage needs its own controls.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'For a retrieval feature you know, which stage drops access metadata, if any?',
      modelResponse: ['Common answer: chunking. The source document has permissions, but the chunker stores only text and a file name, so retrieval cannot enforce the original access.'],
    },
    sourceIds: ['owasp-cs-rag', 'owasp-llm08', 'arxiv-2005.11401'],
    glossary: ['rag', 'chunk', 'vector-store', 'provenance'],
    related: ['D01-L04', 'D06-L10'],
    conceptTag: 'rag-pipeline-stages',
  },
  {
    id: 'D06-L02',
    title: 'Document ownership, source provenance and ingestion approval',
    summary:
      'Decides which sources may enter an index, who owns them, and how provenance is recorded so content can be traced and removed.',
    minutes: 15,
    objectives: [
      'Define ingestion approval criteria for a retrieval source.',
      'Record provenance per document and chunk.',
      'Assign ownership so that corrections and removals have someone accountable.',
    ],
    prerequisites: ['D06-L01'],
    explanation: [
      p('Everything in an index becomes evidence the assistant can cite. Adding a source is therefore a decision about **whose words the assistant will repeat** to whom. Treat it like granting write access to the assistant\'s answers.'),
      p('Ingestion approval should answer:'),
      ul(
        '**Who writes to this source?** (Procurement staff only? Any employee? Suppliers? The public web?)',
        '**Who owns it?** Someone must be able to correct or remove content.',
        '**What is its authority?** Policy, contract, informal notes, email threads.',
        '**What access does it carry?** Which permissions must follow its chunks.',
        '**How fresh is it?** Update frequency and how supersession is marked.',
      ),
      p('Provenance per chunk makes the index operable: source system, document id, version or hash, ingestion time, and ingestion job. With it you can answer "where did this sentence come from?" and "remove everything from that folder". Without it, cleaning a poisoned or mistaken document means rebuilding the whole index.'),
      table('Source approval decisions for SupplierKB', ['Source', 'Writers', 'Decision'], [
        ['Signed contracts repository', 'Legal and Procurement', 'Approve; authority: high'],
        ['Procurement wiki', 'Procurement staff', 'Approve; authority: medium; mark informal'],
        ['Supplier-uploaded onboarding forms', 'Suppliers', 'Approve with label "supplier-provided"; never authoritative for bank details'],
        ['AP shared inbox', 'Anyone on the internet', 'Reject for the index; process per message instead'],
      ]),
      note('Rejecting a source for the index is not banning it from use. The AP inbox can still be processed in a scoped task ([[D02-L07]]); it just should not become standing evidence for everyone.'),
    ],
    boundary: {
      component: 'Connector configuration and ingestion jobs.',
      trustBoundary: 'Source content becoming indexed evidence available to many users.',
      attackerControl: 'Whoever can write to an approved source; the more open the source, the wider the control.',
    },
    scenario: {
      title: 'The helpful contractor folder',
      setup: 'A contractor asks Kofi to add the "Supplier notes" shared folder to SupplierKB "because it has useful tips". Kofi checks the folder before deciding.',
      evidence: [
        table('Folder facts (synthetic)', ['Property', 'Value'], [
          ['Writers', '120 employees and 40 contractors'],
          ['Owner', 'None recorded; creator left in 2025'],
          ['Content', 'Mixed: meeting notes, copied emails, bank-change notices'],
          ['Versioning', 'None'],
        ]),
      ],
    },
    worked: {
      title: 'Decision',
      blocks: [
        p('No owner, many writers, unverified bank-change notices, and no versioning. Indexing it would let any of 160 people place "evidence" in every SupplierKB answer. Kofi declines and suggests the useful tips be moved into the procurement wiki, which has an owner and editorial process. The decision and reasons are recorded so the next request has a precedent.'),
      ],
    },
    controls: [
      { control: 'Ingestion approval with writers, owner, authority and access recorded per source.', enforcementPoint: 'Connector configuration review.', limitation: 'Source properties change; re-review periodically.' },
      { control: 'Chunk-level provenance (source, doc id, version, job).', enforcementPoint: 'Ingestion pipeline.', limitation: 'Provenance of copied text inside a document (pasted emails) is still unknown.' },
    ],
    misconception: {
      claim: '"More sources make the assistant smarter, so index everything employees can already read."',
      correction: 'Each source makes its writers co-authors of the assistant\'s answers. Index sources with owners, appropriate writers and known authority.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Write the approval record for adding "Signed contracts repository" to SupplierKB.',
      modelResponse: ['Source: contracts repository (Legal). Writers: Legal and Procurement (12 people). Owner: Legal Operations. Authority: high, binding terms. Access: chunk ACL copied from repository permissions (Procurement, Finance AP, Legal). Freshness: amendments linked via "supersedes". Review: annually or on permission model change.'],
    },
    sourceIds: ['owasp-cs-rag', 'owasp-llm08', 'owasp-llm04'],
    glossary: ['provenance', 'chunk'],
    related: ['D06-L05', 'D09-L01'],
    conceptTag: 'ingestion-approval',
  },
  {
    id: 'D06-L03',
    title: 'Chunk-level permissions and authorization-aware retrieval',
    summary:
      'Carries permissions onto each chunk and filters at query time, so users only retrieve what they may read.',
    minutes: 16,
    objectives: [
      'Attach access metadata to chunks derived from source permissions.',
      'Apply authorization filters during, not after, similarity search.',
      'Handle documents with mixed sensitivity.',
    ],
    prerequisites: ['D06-L01', 'D03-L02'],
    explanation: [
      p('Similarity search returns the nearest chunks, not the permitted ones ([[D01-L04]]). Authorization-aware retrieval adds two things: **access metadata on every chunk** and a **filter applied by the retrieval service** using the requester\'s identity.'),
      p('Where should the filter run? Ideally inside the vector search as a pre-filter or filtered search, so the top-k results are drawn only from permitted chunks. Post-filtering (retrieve top 20, then drop unauthorized ones) is better than nothing but has two problems: it can return too few results when most neighbours are unauthorized, and timing or count differences can leak that restricted documents exist.'),
      code('Filtered retrieval (illustrative pseudocode)', 'python', `def retrieve(query, user, k=8):
    groups = identity.groups_for(user.id)           # from the identity provider, not the prompt
    return vector_store.search(
        embedding=embed(query),
        top_k=k,
        filter={"tenant": user.tenant, "acl_groups": {"any_of": groups},
                "status": {"not": "superseded"}},
    )`, ['Groups come from the identity provider at request time.', 'Tenant and ACL filters are mandatory; there is no code path without them.', 'If groups cannot be resolved, the function should fail closed rather than search unfiltered.']),
      p('Mixed-sensitivity documents need care. A contract may have public terms and a confidential pricing annex. Chunk boundaries should follow section boundaries, and chunks inherit the most restrictive label of their section. When unsure, label the whole document at its highest sensitivity.'),
      warn('Authorization must use identity from the authenticated session. A filter value taken from the user\'s message or the document ("tenant: Alder") is attacker-controlled.'),
    ],
    boundary: {
      component: 'Retrieval service and chunk metadata.',
      trustBoundary: 'Indexed chunks entering a specific user\'s context.',
      attackerControl: 'The user controls the query text; they must not control the filter.',
    },
    scenario: {
      title: 'The pricing annex',
      setup: 'Larchmont\'s contract has a public terms section and a confidential pricing annex. A Finance AP clerk (allowed terms, not pricing) asks "What discount does Larchmont give us?"',
      evidence: [
        trace('Retrieval with section-level labels (tr_ra71)', [
          { actor: 'retriever', event: 'filter', detail: 'User groups: finance-ap. Filter acl_groups any_of [finance-ap].', flag: 'info' },
          { actor: 'retriever', event: 'result', detail: '3 chunks from contract §1–§6 (label: procurement, finance-ap, legal).', flag: 'ok' },
          { actor: 'retriever', event: 'excluded', detail: 'Annex B pricing chunks (label: procurement, legal) not eligible.', flag: 'blocked' },
          { actor: 'model', event: 'answer', detail: '"The contract terms don\'t state a discount. Pricing details are in an annex you may not have access to; ask Procurement."', flag: 'ok' },
        ]),
      ],
    },
    worked: {
      title: 'What made this work',
      blocks: [
        p('Section-level labelling put the annex in separate chunks with stricter labels, and the filter ran inside the search. The answer still mentions that an annex exists. Is that acceptable? Here yes: the existence of a pricing annex is not secret. In other contexts (an unannounced acquisition), even existence is sensitive, and the answer template should not hint at excluded material.'),
      ],
    },
    controls: [
      { control: 'Mandatory, identity-derived filters inside vector search.', enforcementPoint: 'Retrieval service.', limitation: 'Correctness depends on accurate chunk labels and group membership.' },
      { control: 'Section-aware chunking with inherited labels.', enforcementPoint: 'Ingestion.', limitation: 'Poorly structured documents mix sensitivities within sections.' },
    ],
    misconception: {
      claim: '"We retrieve the top 20 and then remove anything the user can\'t see, so it\'s secure."',
      correction: 'Post-filtering is weaker than filtered search: it can starve results and leak existence. Filter during the search with identity-derived values.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Name a document type at your organization whose existence, not just content, is sensitive.',
      modelResponse: ['Examples: investigation reports about named employees, M&A due diligence, security incident post-mortems before disclosure. For these, retrieval must not reveal that excluded matches exist.'],
    },
    sourceIds: ['owasp-cs-rag', 'owasp-llm08', 'owasp-cs-authz'],
    glossary: ['metadata-filter', 'chunk', 'vector-store'],
    related: ['D03-L02', 'D06-L09'],
    conceptTag: 'chunk-acl-filtering',
  },
  {
    id: 'D06-L04',
    title: 'Vector search, metadata filters, reranking and failure modes',
    summary:
      'Explains how nearest-neighbour search, filters and rerankers behave, and the failures each can cause for relevance and security.',
    minutes: 15,
    objectives: [
      'Explain approximate nearest-neighbour search and why results can vary.',
      'Distinguish what filters and rerankers each control.',
      'Diagnose retrieval failures from logs.',
    ],
    prerequisites: ['D06-L03'],
    explanation: [
      p('Vector databases usually use **approximate** nearest-neighbour indexes for speed. They return close, not guaranteed closest, matches, and results can shift slightly after index rebuilds or parameter changes. That is fine for relevance and dangerous only if you assumed determinism in tests.'),
      p('**Metadata filters** restrict the candidate set by attributes (tenant, ACL, status, date). They are where authorization belongs ([[D06-L03]]). **Rerankers** reorder candidates using a more expensive relevance model. A reranker changes order, never permissions: if an unauthorized chunk reached the reranker, reranking will not remove it.'),
      table('Failure modes', ['Mode', 'Symptom', 'Typical cause'], [
        ['Lexical mismatch', 'Right document not retrieved for exact codes (SC-220)', 'Embeddings blur identifiers; add keyword/hybrid search'],
        ['Stale dominance', 'Old version outranks new', 'No supersession metadata ([[D05-L04]])'],
        ['Filter starvation', 'Too few results after post-filtering', 'Filter applied after top-k'],
        ['Near-duplicate flooding', 'Context filled with copies', 'No deduplication at ingestion'],
        ['Adversarial similarity', 'Attacker text ranks high for many queries', 'Content crafted to match common queries ([[D06-L05]])'],
      ]),
      p('Diagnose from the retrieval log, not the answer: which chunks were candidates, which passed filters, how they were ranked, and which entered the context. That log is also your security evidence.'),
      p('Chunking choices interact with all of this. Very small chunks lose context ("the rate is 1.5x" without saying which policy); very large chunks dilute similarity and waste context budget. Overlapping windows help continuity but multiply near-duplicates. Pick chunk boundaries that follow document structure (sections, clauses, table rows) so that both relevance and access labels stay meaningful.'),
      p('Finally, retrieval quality is a security concern in its own right: when the right document is not found, the model fills the gap, and users act on the result ([[D05-L03]]).'),
    ],
    boundary: {
      component: 'Vector index, filters and reranker.',
      trustBoundary: 'Ranking decisions that determine which evidence the model sees.',
      attackerControl: 'Someone who can add content can try to make it rank highly; filters are not attacker-controlled.',
    },
    scenario: {
      title: 'The missing part number',
      setup: 'Support asks SensorCloud Care about firmware for part SC-220. The answer describes SC-200 firmware instead.',
      evidence: [
        trace('Retrieval log tr_sc22', [
          { actor: 'retriever', event: 'vector', detail: 'Top-8 by embedding: 5 chunks about SC-200, 2 about SC-2200, 1 general.', flag: 'warn' },
          { actor: 'retriever', event: 'keyword', detail: '(not enabled)', flag: 'info' },
          { actor: 'reranker', event: 'order', detail: 'Promoted SC-200 release notes to rank 1.', flag: 'warn' },
        ]),
      ],
    },
    worked: {
      title: 'Fix',
      blocks: [
        p('Embeddings treated SC-220, SC-200 and SC-2200 as near-identical. The reranker could only reorder wrong candidates. Enable hybrid search (keyword plus vector) so exact identifiers match, and add a check that answers about a part number cite a chunk containing that exact number, otherwise abstain ([[D05-L03]]).'),
      ],
    },
    controls: [
      { control: 'Hybrid lexical + vector retrieval for identifiers.', enforcementPoint: 'Retrieval service.', limitation: 'More tuning; lexical matching can surface keyword-stuffed content.' },
      { control: 'Retrieval logs with candidates, filters and ranks.', enforcementPoint: 'Observability.', limitation: 'Logs contain document references; protect them.' },
    ],
    misconception: {
      claim: '"The reranker will push unauthorized or irrelevant chunks down, so filters are optional."',
      correction: 'Rerankers reorder candidates by relevance. Only filters on the candidate set enforce authorization.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'What would you log for each retrieval so you could later prove no unauthorized chunk reached a user?',
      modelResponse: ['Request id, user id, resolved groups, filter expression applied, candidate chunk ids with ACL labels, final chunk ids placed in context, and timestamps.'],
    },
    sourceIds: ['owasp-cs-rag', 'owasp-llm08', 'arxiv-2005.11401'],
    glossary: ['vector-store', 'metadata-filter', 'reranking'],
    related: ['D05-L04', 'D06-L09'],
    conceptTag: 'search-filter-rerank',
  },
  {
    id: 'D06-L05',
    title: 'Poisoned retrieval content versus poisoned model weights',
    summary:
      'Distinguishes corrupting a retrieval corpus from poisoning training data, including persistence, blast radius and recovery.',
    minutes: 15,
    objectives: [
      'Distinguish poisoned retrieval from training data poisoning by changed artifact.',
      'Explain how crafted documents can rank highly and carry instructions or false facts.',
      'Plan recovery for a poisoned index.',
    ],
    prerequisites: ['D04-L01', 'D06-L02'],
    explanation: [
      p('{{poisoned-retrieval|Poisoned retrieval}} means malicious or false content placed in the corpus that the retriever searches. It changes answers by changing evidence, not weights. Research such as PoisonedRAG has shown that a small number of crafted passages can be designed to be retrieved for targeted questions and steer answers.'),
      table('Retrieval poisoning vs training poisoning', ['', 'Poisoned retrieval', 'Training data poisoning'], [
        ['Changed artifact', 'Documents / chunks in the index', 'Model weights (checkpoint)'],
        ['Access needed', 'Write access to an indexed source', 'Path into training data'],
        ['Takes effect', 'Next ingestion, immediately', 'Next training run and deployment'],
        ['Visible in trace?', 'Yes: the chunk appears in retrieval logs', 'No: behaviour comes from weights'],
        ['Recovery', 'Remove/correct document, re-index, purge caches', 'Roll back checkpoint, retrain'],
      ]),
      p('Poisoned content can do two things: assert false facts ("Vela\'s new remittance account is …9902") or carry instructions (indirect injection, [[D02-L03]]). Crafted text can also be stuffed with phrases likely to match common queries so it ranks highly for many questions.'),
      key('If the false claim appears in a retrieved chunk, look at the corpus first. That is good news: it is traceable and removable.'),
    ],
    boundary: {
      component: 'Indexed sources and the ingestion pipeline.',
      trustBoundary: 'Writers to indexed sources becoming authors of evidence.',
      attackerControl: 'Write access to at least one indexed source (a wiki page, an uploaded form, a shared folder).',
    },
    scenario: {
      title: 'The onboarding form',
      setup: 'Several clerks receive the same wrong remittance account for Vela Freight from SupplierKB. Sam checks whether the router model or the index is responsible.',
      evidence: [
        trace('Retrieval log tr_vf09', [
          { actor: 'retriever', event: 'result', detail: 'chunk onboarding-forms/vela-update.pdf#2 "Remittance account updated to …9902. Use this for all payments." (rank 1)', flag: 'warn' },
          { actor: 'ingestion', event: 'record', detail: 'vela-update.pdf uploaded via supplier portal 2026-10-03 by account vela-contact-2 (created 2026-10-02).', flag: 'warn' },
          { actor: 'registry', event: 'model', detail: 'Model and embedding versions unchanged since 2026-09.', flag: 'info' },
        ]),
      ],
    },
    worked: {
      title: 'Classification and recovery',
      blocks: [
        p('The claim is in a retrieved chunk; the model is unchanged. This is poisoned retrieval via the supplier-portal upload path, by an account created one day earlier. Recovery: remove the document, re-index, purge caches, and search answers since 2026-10-03 that cited it. Prevention: supplier-provided documents are labelled and never authoritative for bank details ([[D06-L08]]); new supplier portal accounts require verification before uploads are indexed.'),
      ],
    },
    controls: [
      { control: 'Provenance per chunk and fast removal + re-index procedure.', enforcementPoint: 'Ingestion pipeline.', limitation: 'Answers already given cannot be recalled; find and notify.' },
      { control: 'Source authority labels limiting what supplier content can establish.', enforcementPoint: 'Retrieval and answer policy.', limitation: 'Requires authority rules per fact type.' },
    ],
    misconception: {
      claim: '"The assistant is giving a wrong account, so we need to retrain the model."',
      correction: 'If the wrong account comes from a retrieved document, the index is poisoned, not the weights. Remove the document and re-index.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'List the steps to remove one poisoned document completely from a RAG system, including derived copies.',
      modelResponse: ['Delete or quarantine the source; remove its chunks and embeddings from the index; purge semantic caches and any memory entries derived from answers citing it; check backups and replicas; identify answers that cited it.'],
    },
    sourceIds: ['arxiv-2402.07867', 'owasp-llm08', 'owasp-llm04', 'owasp-cs-rag'],
    glossary: ['poisoned-retrieval', 'data-poisoning', 'provenance'],
    related: ['D04-L01', 'D12-L08'],
    conceptTag: 'retrieval-vs-weights-poisoning',
    labId: 'persistence-explorer',
  },
  {
    id: 'D06-L06',
    title: 'Tenant separation, caches, permission revocation and reindexing',
    summary:
      'Keeps tenants apart in shared retrieval infrastructure and makes permission changes and deletions take effect everywhere.',
    minutes: 15,
    objectives: [
      'Choose between per-tenant namespaces and shared indexes with filters.',
      'Propagate permission revocation and deletions to chunks, caches and replicas.',
      'Test that revoked access is actually removed.',
    ],
    prerequisites: ['D03-L06', 'D06-L03'],
    explanation: [
      p('Multi-tenant retrieval can isolate tenants with **separate namespaces or indexes** per tenant, or with a **shared index plus mandatory tenant filters**. Separate namespaces give stronger isolation (a missing filter cannot cross tenants) at higher operational cost. Shared indexes are cheaper and depend entirely on every query path applying the filter.'),
      p('Permissions also change over time. An employee moves from Procurement to Marketing; a document is reclassified; a tenant leaves and requests deletion. If chunk labels were copied at ingestion and never updated, the index keeps the old permissions. Revocation must propagate to:'),
      ul(
        'Chunk ACL metadata (re-sync from the source).',
        'Semantic and response caches keyed on old permissions.',
        'Application memory that quoted the document.',
        'Replicas, backups used for restore, and evaluation copies.',
      ),
      p('Deletion is similar: deleting the source file does not delete its embeddings. Reindexing jobs should reconcile the index with the source (remove chunks whose source no longer exists) and log what was removed.'),
      warn('A permission change that takes effect in the source system but not in the index is a disclosure path that grows silently.'),
    ],
    boundary: {
      component: 'Index partitioning, caches and synchronization jobs.',
      trustBoundary: 'Between tenants, and between a user\'s past and current permissions.',
      attackerControl: 'A former insider or an ex-tenant who retains access through stale copies.',
    },
    scenario: {
      title: 'The reassigned buyer',
      setup: 'A buyer moved from Procurement to Marketing on 2026-09-15. On 2026-10-10 they still retrieve Procurement-only pricing chunks through Rocky.',
      evidence: [
        table('State on 2026-10-10 (synthetic)', ['Component', 'State'], [
          ['Identity provider', 'User in group marketing (procurement removed 09-15)'],
          ['Retrieval filter', 'Uses groups from a nightly-cached directory snapshot'],
          ['Snapshot job', 'Failing since 09-12 (credential expired)'],
          ['Result', 'Filter still sees group procurement'],
        ]),
      ],
    },
    worked: {
      title: 'Root cause and fixes',
      blocks: [
        p('The filter was correct in design, but its group data was stale because a sync job had failed silently for a month. Fixes: resolve groups at request time from the identity provider (or a cache with a short TTL that fails closed when stale); alert on sync job failures; and add a weekly test that a deliberately removed test user loses access within the target time.'),
      ],
    },
    controls: [
      { control: 'Request-time group resolution or short-TTL caches that fail closed.', enforcementPoint: 'Retrieval service.', limitation: 'Identity provider outages then block retrieval.' },
      { control: 'Reconciliation jobs syncing ACLs and deletions from sources.', enforcementPoint: 'Ingestion pipeline.', limitation: 'Lag between source change and index update.' },
      { control: 'Revocation tests with a test user.', enforcementPoint: 'Scheduled checks.', limitation: 'Covers the tested path only.' },
    ],
    misconception: {
      claim: '"We removed the user from the Procurement group, so they can no longer see Procurement documents in the assistant."',
      correction: 'Only if the retrieval path uses current group membership. Cached groups, copied ACLs and caches can preserve old access.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'What maximum delay between revoking access in the source and revocation in the assistant would you accept for HR documents, and how would you measure it?',
      modelResponse: ['For HR, minutes rather than days, e.g. 15 minutes. Measure with a scheduled test: remove a test user from a group, then query every 5 minutes until restricted canaries stop appearing, recording the elapsed time.'],
    },
    sourceIds: ['owasp-cs-rag', 'owasp-llm08', 'owasp-llm02'],
    glossary: ['tenant-isolation', 'metadata-filter'],
    related: ['D03-L06', 'D12-L08'],
    conceptTag: 'revocation-propagation',
  },
  {
    id: 'D06-L07',
    title: 'Malicious document parsing, links, attachments and ingestion isolation',
    summary:
      'Treats ingestion as processing untrusted files: parser vulnerabilities, hidden content, links fetched during ingestion, and sandboxing.',
    minutes: 15,
    objectives: [
      'Identify parsing risks in ingestion: exploits, resource exhaustion, hidden content.',
      'Prevent ingestion from fetching attacker-chosen links (SSRF).',
      'Isolate parsing from systems that hold credentials.',
    ],
    prerequisites: ['D06-L01', 'D02-L03'],
    explanation: [
      p('Ingestion opens files from sources you do not fully control: PDFs, Office documents, HTML, archives, images for OCR. That is the same risk class as an email gateway or a file-upload service, with a few AI-specific additions.'),
      ul(
        '**Parser vulnerabilities:** document libraries have had memory-safety and logic bugs. A crafted file can crash or exploit the parser.',
        '**Resource exhaustion:** zip bombs, enormous page counts, deeply nested structures.',
        '**Hidden content:** white text, metadata, comments, alt text, embedded files that become chunks ([[D02-L03]]).',
        '**Active links:** some pipelines follow links in documents to "enrich" content. An attacker can point them at internal addresses (SSRF) or at pages that change after review.',
      ),
      p('Isolation limits the blast radius: run parsers in a separate worker or container with no credentials to the index or other services, no network access (or an egress allowlist), memory and time limits, and pass back only extracted text and metadata. The ingestion job, not the parser, writes to the index.'),
      table('Ingestion hardening', ['Control', 'Addresses'], [
        ['Sandboxed parser worker, no secrets, no network', 'Exploits, SSRF'],
        ['File type allowlist and size/page/time limits', 'Exhaustion, unexpected formats'],
        ['Visible-text extraction; hidden content flagged', 'Hidden instructions'],
        ['No automatic link following', 'SSRF, bait-and-switch content'],
      ]),
    ],
    boundary: {
      component: 'Parser workers and the ingestion job.',
      trustBoundary: 'Untrusted file bytes entering ROCKTO infrastructure.',
      attackerControl: 'Full control of file contents uploaded or synced from a writable source.',
    },
    scenario: {
      title: 'The link-enrichment feature',
      setup: 'An engineer added "link enrichment": ingestion fetches URLs found in supplier documents and indexes the page text. A security review samples the fetch log.',
      evidence: [
        trace('Ingestion fetch log (synthetic)', [
          { actor: 'ingest', event: 'fetch', detail: 'https://larchmont-metals.example/certs → 200, indexed', flag: 'info' },
          { actor: 'ingest', event: 'fetch', detail: 'http://169.254.169.254/latest/meta-data/ (from vela-update.pdf) → 200, indexed', flag: 'violation' },
          { actor: 'ingest', event: 'fetch', detail: 'http://ledger-admin.rockto.example:8080/status → 200, indexed', flag: 'violation' },
        ]),
      ],
    },
    worked: {
      title: 'Response',
      blocks: [
        p('The ingestion service fetched a cloud metadata address and an internal admin page because a document contained those URLs, and then **indexed their responses**, making internal data retrievable by any SupplierKB user. Immediate actions: disable enrichment, remove the indexed chunks, rotate any credentials the metadata endpoint exposed, and check retrieval logs for who received them. Long term: no automatic link following; if enrichment is needed, use an egress proxy with an allowlist of supplier domains and block private ranges ([[D10-L04]]).'),
      ],
    },
    controls: [
      { control: 'Parser sandbox with no secrets and no network.', enforcementPoint: 'Ingestion infrastructure.', limitation: 'Sandbox escapes are possible; keep parsers patched.' },
      { control: 'Egress allowlist for any ingestion fetch.', enforcementPoint: 'Network policy / egress proxy.', limitation: 'Allowlisted domains can still host malicious content.' },
    ],
    misconception: {
      claim: '"Ingestion only reads files, so it can\'t be attacked."',
      correction: 'Parsing untrusted files and following their links are classic attack surfaces. Ingestion needs the same isolation as any file-processing service.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'What permissions should a parser worker have, at minimum?',
      modelResponse: ['Read the single input file it was given and return extracted text and metadata; no network, no credentials, no write access to the index or other storage, with CPU, memory and time limits.'],
    },
    sourceIds: ['owasp-cs-rag', 'owasp-cs-ssrf', 'owasp-llm08', 'mcp-security'],
    glossary: ['ssrf', 'indirect-injection'],
    related: ['D10-L04', 'D10-L05'],
    conceptTag: 'ingestion-isolation',
  },
  {
    id: 'D06-L08',
    title: 'Evidence selection and the authority of retrieved sources',
    summary:
      'Gives retrieved content an explicit authority level so that informal or supplier-provided text cannot override authoritative records.',
    minutes: 15,
    objectives: [
      'Assign authority levels to sources and fact types.',
      'Design answer rules where authoritative records win over retrieved text.',
      'Recognize facts that must never be established by retrieval.',
    ],
    prerequisites: ['D06-L02', 'D06-L05'],
    explanation: [
      p('Retrieval treats all chunks as candidate evidence. Businesses do not: a signed contract outranks a wiki page, and the vendor master outranks any document for bank details. Make that hierarchy explicit so the assistant does not flatten it.'),
      table('Authority by fact type (SupplierKB)', ['Fact type', 'Authoritative source', 'Retrieved text may…'], [
        ['Bank details', 'Ledgerline vendor master', 'Never establish; may flag a change request'],
        ['Payment terms', 'Signed contract + amendments', 'Establish if from contract repository'],
        ['Contact persons', 'Vendor master', 'Suggest; confirm in vendor master'],
        ['Product specs', 'Supplier datasheets (labelled)', 'Establish, labelled as supplier-provided'],
      ]),
      p('Implementation has two parts. **Retrieval metadata** carries each chunk\'s source type and authority. **Answer policy** decides per fact type: for bank details, the tool reads the vendor master and the assistant may only say "a document claims a change; verify". The model can be told this, but the strong version is structural: the answer for "what is Vela\'s bank account?" comes from a tool call to Ledgerline, not from retrieval.'),
      key('Some facts should never be established by retrieved text. Route them to systems of record.'),
      note('Labelling content as "supplier-provided" in the answer also helps people calibrate their trust.'),
      p('Authority rules need an owner and a review cycle. When a new source is approved ([[D06-L02]]), decide its authority level and which fact types it may establish at the same time.'),
    ],
    boundary: {
      component: 'Answer policy and retrieval metadata.',
      trustBoundary: 'Retrieved text being presented as authoritative fact.',
      attackerControl: 'Anyone who can write lower-authority content (supplier uploads, wiki edits).',
    },
    scenario: {
      title: 'Which account is right?',
      setup: 'After [[D06-L05]], Luc tests how SupplierKB answers "What is Vela Freight\'s bank account?" under the new authority rules.',
      evidence: [
        trace('Test tr_au12', [
          { actor: 'policy', event: 'route', detail: 'Fact type bank_details → tool vendor.lookup (Ledgerline).', flag: 'ok' },
          { actor: 'tool', event: 'result', detail: 'Vendor master: account ending …1188, last changed 2025-04-02.', flag: 'ok' },
          { actor: 'retriever', event: 'result', detail: 'Supplier upload claims …9902 (authority: supplier-provided).', flag: 'warn' },
          { actor: 'model', event: 'answer', detail: '"Ledgerline lists …1188. A supplier-uploaded document claims a change to …9902; bank changes require verification via the known contact."', flag: 'ok' },
        ]),
      ],
    },
    worked: {
      title: 'Why this answer is right',
      blocks: [
        p('The authoritative value comes from the vendor master. The conflicting claim is surfaced, labelled by authority, and routed to the verification process rather than silently accepted or silently hidden. Hiding it would also be a failure: the clerk should know a change request exists.'),
      ],
    },
    controls: [
      { control: 'Per-fact-type authority rules routing to systems of record.', enforcementPoint: 'Answer policy in the harness.', limitation: 'Requires classifying questions by fact type, which can fail.' },
      { control: 'Authority labels on chunks shown in answers.', enforcementPoint: 'Retrieval metadata and UI.', limitation: 'Users may ignore labels.' },
    ],
    misconception: {
      claim: '"If a document is in the knowledge base, the assistant can treat it as true."',
      correction: 'Indexed documents have different authority. Some facts must come only from systems of record, with lower-authority claims shown as unverified.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Add two rows to the authority table for an HR assistant.',
      modelResponse: ['Salary: authoritative source PayHub; retrieved text may never establish an individual\'s salary. Leave balance: authoritative source HR system; wiki pages may explain the policy but not a person\'s balance.'],
    },
    sourceIds: ['owasp-llm09', 'owasp-cs-rag', 'owasp-llm08'],
    glossary: ['provenance', 'faithfulness'],
    related: ['D05-L01', 'D02-L07'],
    conceptTag: 'source-authority',
  },
  {
    id: 'D06-L09',
    title: 'Evaluating unauthorized retrieval and retrieval usefulness together',
    summary:
      'Measures both "no unauthorized chunks retrieved" and "the right chunks retrieved", so access control cannot be achieved by retrieving nothing.',
    minutes: 15,
    objectives: [
      'Define metrics for unauthorized retrieval and for retrieval quality.',
      'Build test sets with personas, permitted and forbidden targets.',
      'Report both with denominators.',
    ],
    prerequisites: ['D06-L03', 'D06-L04'],
    explanation: [
      p('A retrieval system can trivially avoid unauthorized results by returning nothing. Evaluation must measure security and usefulness together:'),
      table('Retrieval metrics', ['Metric', 'Definition', 'Denominator'], [
        ['Unauthorized retrieval rate', 'Queries where any retrieved chunk is outside the persona\'s access', 'All test queries per persona'],
        ['Recall@k (permitted)', 'Queries where a relevant permitted chunk is in the top k', 'Queries with a relevant permitted chunk'],
        ['Existence leakage', 'Answers revealing that forbidden matches exist (where existence is sensitive)', 'Queries targeting sensitive-existence documents'],
        ['Revocation lag', 'Time until revoked access stops retrieval', 'Revocation tests run'],
      ]),
      p('Test sets need **personas** (Finance AP clerk, Procurement buyer, Marketing employee, tenant A user), **targets** (documents each persona may and may not read), and **query phrasings**, including adversarial ones ("ignore filters", other languages, exact quotes from forbidden documents). Measure from retrieval logs, not answers: an unauthorized chunk in context is a failure even if the answer happened not to repeat it.'),
      warn('An unauthorized chunk that entered the context is a failure even when the answer did not mention it. It was available for disclosure.'),
      p('Report results per persona with counts, not one blended percentage. A 0.5% overall unauthorized rate can hide a single persona at 5%, and that persona may be the one with the most sensitive neighbours. State the query budget and the phrasing mix as well, so readers know what "zero" was measured against ([[D11-L06]]).'),
    ],
    boundary: {
      component: 'Retrieval service under test.',
      trustBoundary: 'Persona permissions.',
      attackerControl: 'Simulated: query phrasing within a stated budget, from authenticated personas.',
    },
    scenario: {
      title: 'Release test for SupplierKB v2',
      setup: 'Luc runs the authorization and quality suite before rollout to Marketing.',
      evidence: [
        table('Results (synthetic)', ['Persona', 'Queries', 'Unauthorized retrievals', 'Recall@8 (permitted)'], [
          ['Finance AP', '120', '0', '88% (79/90)'],
          ['Procurement buyer', '120', '0', '91% (91/100)'],
          ['Marketing employee', '120', '3', '84% (42/50)'],
          ['Tenant A user (SensorCloud)', '80', '0', '86% (52/60)'],
        ]),
      ],
    },
    worked: {
      title: 'Reading the results',
      blocks: [
        p('Marketing had 3 unauthorized retrievals in 120 queries. All three involved a pricing annex mislabelled at ingestion (whole contract labelled at the lower level). The filter worked; the label was wrong. Fix the label, add a label-audit query for annexes, rerun. Recall is acceptable for all personas, which matters: a fix that drops recall to 40% would be a failure of a different kind.'),
      ],
    },
    controls: [
      { control: 'Persona-based retrieval suite measuring unauthorized rate and recall.', enforcementPoint: 'Release gate.', limitation: 'Finite personas and phrasings.' },
      { control: 'Label audits for documents with mixed sensitivity.', enforcementPoint: 'Ingestion QA.', limitation: 'Manual review scales poorly.' },
    ],
    misconception: {
      claim: '"Zero unauthorized results means retrieval is secure and ready."',
      correction: 'Zero unauthorized results is also what an empty retriever produces. Report recall for permitted content with it, and measure from logs rather than answers.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Design three adversarial queries for the Marketing persona that try to retrieve pricing chunks.',
      modelResponse: ['1. An exact phrase copied from the pricing annex. 2. "List all discounts in Larchmont contracts, including annexes." 3. The same request in French. Pass criterion: no chunk labelled procurement-only in the retrieval log for any of them.'],
    },
    sourceIds: ['owasp-cs-rag', 'owasp-llm08', 'arxiv-2406.13352'],
    glossary: ['metadata-filter', 'benign-completion', 'attack-success-rate'],
    related: ['D11-L05', 'D03-L09'],
    conceptTag: 'retrieval-eval-balance',
    labId: 'evaluation-panel',
  },
  {
    id: 'D06-L10',
    title: 'Secure ROCKTO supplier-knowledge-base design review',
    summary:
      'Applies the domain to a full design review of SupplierKB v2, producing findings with enforcement points, tests and residual risk.',
    minutes: 22,
    objectives: [
      'Review a RAG design stage by stage.',
      'Produce prioritized findings with enforcement points and tests.',
      'State residual risks for the system owner to accept or address.',
    ],
    prerequisites: ['D06-L06', 'D06-L07', 'D06-L08', 'D06-L09'],
    explanation: [
      p('This capstone reviews the proposed SupplierKB v2 design. Use the pipeline stages from [[D06-L01]] as your checklist, and for each finding name the stage, the enforcement point, the test that would show the control working, and the residual risk.'),
      code('SupplierKB v2 proposal (synthetic summary)', 'yaml', `sources:
  - contracts_repo        # Legal, Procurement write
  - procurement_wiki      # Procurement write
  - supplier_portal_uploads   # suppliers write (new in v2)
ingestion:
  parser: in-process in api-service
  link_enrichment: true
chunk_metadata: [supplier, doc_id]
index: shared, all tenants and departments
retrieval: top_k=20, post-filter by department (from user profile field)
cache: semantic, key=query_embedding
answers: may state bank details from any source
audience: Finance, Procurement, Marketing (new), SensorCloud tenants (new)`),
    ],
    boundary: {
      component: 'SupplierKB v2 end to end.',
      trustBoundary: 'Supplier uploads entering the index; chunks reaching four audiences; answers asserting bank details.',
      attackerControl: 'Suppliers (and anyone who registers a supplier portal account) can upload documents; tenants and employees can query.',
    },
    scenario: {
      title: 'Review findings',
      setup: 'Luc, Kofi and Ines review the proposal. Their findings are below, ordered by the impact each could enable.',
      evidence: [
        table('Findings', ['#', 'Stage', 'Finding', 'Enforcement point', 'Test'], [
          ['1', 'Retrieve', 'Shared index with post-filter on a profile field; SensorCloud tenants added', 'Per-tenant namespaces; filtered search with IdP groups', 'Cross-tenant and cross-department canaries, 0 in logs'],
          ['2', 'Answer', 'Bank details may come from supplier uploads', 'Route bank_details to vendor master only', 'Poisoned upload test: answer cites vendor master'],
          ['3', 'Parse', 'In-process parser plus link enrichment', 'Sandboxed worker, no network; enrichment off', 'Metadata-URL document produces no fetch'],
          ['4', 'Cache', 'Semantic cache keyed only on query', 'Key includes tenant and permission set', 'Paraphrase test across personas'],
          ['5', 'Metadata', 'No ACL, version or authority on chunks', 'Ingestion schema requires them', 'Ingestion rejects chunks missing fields'],
          ['6', 'Acquire', 'Supplier portal uploads from unverified accounts', 'Verification before indexing; supplier-provided label', 'Upload from new account is not retrievable until verified'],
        ]),
      ],
    },
    worked: {
      title: 'Residual risk statement',
      blocks: [
        p('After fixes, residual risks remain and should be stated for Dana (system owner) to accept or address:'),
        ul(
          'A verified supplier account can still upload misleading (but labelled) content; answers mark it supplier-provided.',
          'Mislabelled documents at ingestion can still leak within a tenant; mitigated by label audits, not eliminated.',
          'Semantic search will occasionally miss exact identifiers; hybrid search reduces this.',
          'Indirect injection from indexed documents remains possible; SupplierKB has no side-effecting tools, so impact is limited to misleading text.',
        ),
        p('Ordering by impact puts findings 1 and 2 first: cross-tenant disclosure and payment fraud. Finding 6 is next because it is the entry point for finding 2.'),
      ],
    },
    controls: [
      { control: 'Stage-by-stage review with tests per finding.', enforcementPoint: 'Design review gate.', limitation: 'Design review does not replace testing the built system.' },
      { control: 'Written residual-risk acceptance by the owner.', enforcementPoint: 'Governance record ([[D12-L01]]).', limitation: 'Acceptance must be revisited when the system changes.' },
    ],
    misconception: {
      claim: '"If we fix the top finding, the design is secure."',
      correction: 'Findings interact (supplier uploads feed the bank-detail risk). Address the set, test each control, and document what remains.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Write finding 7 for the proposal, about revocation or deletion, with stage, enforcement point and test.',
      modelResponse: ['Finding 7 (Index/sync): no reconciliation of deletions or permission changes from sources. Enforcement: nightly reconciliation job plus request-time group resolution. Test: delete a test document and remove a test user from a group; both stop being retrievable within 15 minutes.'],
    },
    sourceIds: ['owasp-cs-rag', 'owasp-llm08', 'owasp-llm02', 'owasp-cs-ssrf'],
    glossary: ['rag', 'tenant-isolation', 'risk-acceptance'],
    related: ['D01-L10', 'D12-L01'],
    conceptTag: 'rag-design-review',
  },
];
