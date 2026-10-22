import { code, key, note, p, table, trace, ul, warn } from '../blocks';
import type { LessonDraft } from '../types';

export const D05_LESSONS: LessonDraft[] = [
  {
    id: 'D05-L01',
    title: 'Factual correctness versus faithfulness to a supplied source',
    summary:
      'Separates "is it true?" from "is it supported by the source the model was given?", because each fails differently and needs a different check.',
    minutes: 14,
    objectives: [
      'Define factual correctness and faithfulness and give an example where they diverge.',
      'Choose which property a given business task requires.',
      'Explain why hallucination occurs without any attacker.',
    ],
    prerequisites: ['D01-L08'],
    explanation: [
      p('Two questions are often merged into "is the answer right?":'),
      ul(
        '**{{factuality|Factual correctness}}:** is the claim true in the world?',
        '**{{faithfulness|Faithfulness}}:** is the claim supported by the source the model was given (the retrieved contract, the invoice, the policy)?',
      ),
      p('They diverge in both directions. If the supplied contract is outdated, a faithful answer is factually wrong. If the model adds a true fact from its training data that the contract does not contain, the answer is correct but unfaithful, and in a compliance setting that may be just as unacceptable because no one can trace where the claim came from.'),
      table('Four combinations', ['', 'Faithful to source', 'Not faithful'], [
        ['Factually correct', 'Ideal', 'True but untraceable (e.g. added from training data)'],
        ['Factually wrong', 'Source is wrong or stale', 'Fabrication or misreading'],
      ]),
      p('A {{hallucination}} is output that is fluent but unsupported or false. It comes from how language models work: they generate likely continuations, and a likely-sounding continuation is not necessarily true or supported. **No attacker is needed.** Missing context, ambiguous questions, long documents and arithmetic all produce hallucinations. A wrong answer, by itself, is not evidence of poisoning or injection ([[D01-L08]]).'),
      p('Most enterprise tasks need faithfulness first: "according to the Larchmont contract, what are the payment terms?" The right control is checking claims against the supplied source. Tasks that ask for world knowledge without a source need factual verification against an authoritative reference, or should not be delegated to the model at all.'),
    ],
    boundary: {
      component: 'The model\'s generated answer and the sources supplied to it.',
      trustBoundary: 'Model output becoming information that people act on.',
      attackerControl: 'Not required. An attacker can make things worse (poisoned sources), but the base failure exists without one.',
    },
    scenario: {
      title: 'Payment terms',
      setup: 'Priya asks: "What are Larchmont Metals\' payment terms?" SupplierKB retrieves the 2024 contract. A 2026 amendment exists in Ledgerline but is not indexed.',
      evidence: [
        table('Answer and sources (synthetic)', ['Item', 'Content'], [
          ['Retrieved chunk', '2024 contract §5: "Net 45 days from invoice date."'],
          ['Rocky\'s answer', '"Net 45 days, with a 2% early-payment discount within 10 days."'],
          ['2026 amendment (not retrieved)', '"Net 30 days."'],
          ['Early-payment discount', 'Not in any ROCKTO document'],
        ]),
      ],
    },
    worked: {
      title: 'Separating the problems',
      blocks: [
        ul(
          '"Net 45" is **faithful but factually wrong**: the source is stale. The fix is retrieval coverage (index amendments, prefer latest version) ([[D05-L04]]).',
          '"2% discount within 10 days" is **unfaithful**: no supplied source supports it. It is a plausible-sounding fabrication. The fix is claim-level support checking ([[D05-L05]]).',
        ),
        note('Two errors in one sentence, with different causes and different owners. Neither involves an attacker.'),
      ],
    },
    controls: [
      { control: 'Claim-level support check against supplied sources.', enforcementPoint: 'Post-generation verification step.', limitation: 'Cannot detect that the source itself is wrong.' },
      { control: 'Source freshness and versioning in retrieval.', enforcementPoint: 'Index and retrieval ranking.', limitation: 'Depends on knowing which document supersedes which.' },
    ],
    misconception: {
      claim: '"The assistant gave a wrong payment term, so someone must have tampered with it."',
      correction: 'Stale sources and fabrication are ordinary failures. Tampering is a claim about a changed artifact and needs evidence of that change.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'For an AI task you know, decide whether it needs faithfulness, factual correctness or both, and say how you would check it.',
      modelResponse: ['Example: a contract Q&A tool needs faithfulness (answers must cite the contract) and freshness (the contract must be the current version). Check each claim against the cited clause, and check the clause\'s document version against the contract register.'],
    },
    sourceIds: ['owasp-llm09', 'arxiv-2311.05232', 'nist-ai-600-1'],
    glossary: ['hallucination', 'faithfulness', 'factuality'],
    related: ['D05-L05', 'D06-L08'],
    conceptTag: 'faithful-vs-factual',
  },
  {
    id: 'D05-L02',
    title: 'Fabricated facts, citations, calculations, tool actions and approval records',
    summary:
      'Catalogues the forms fabrication takes in enterprise assistants, including fake citations and claimed actions, and the record that disproves each.',
    minutes: 15,
    objectives: [
      'Recognize five forms of fabrication: facts, citations, calculations, actions and approvals.',
      'Name the system of record that verifies each form.',
      'Explain why fabricated actions and approvals are integrity risks, not just accuracy problems.',
    ],
    prerequisites: ['D05-L01', 'D01-L05'],
    explanation: [
      p('Fabrication is not limited to wrong facts. In tool-using assistants it takes five forms, each checked against a different record:'),
      table('Forms of fabrication', ['Form', 'Example', 'Verify against'], [
        ['Fact', '"Larchmont is ISO 27001 certified"', 'Authoritative source (certificate register)'],
        ['Citation', '"See contract §9.3" (no §9.3 exists)', 'The cited document itself'],
        ['Calculation', 'Sum of line items stated as 21,000; actual 12,100', 'Deterministic recomputation'],
        ['Tool action', '"I\'ve created the payment draft" (no call executed)', 'Dispatcher execution log'],
        ['Approval record', '"Dana approved this on Monday"', 'Ledgerline approval records'],
      ]),
      p('The last two are especially dangerous because people act on them. A clerk told "the draft is created" may stop checking. A reviewer told "Dana already approved" may release a payment. These are integrity problems in the business process even though nothing in the system changed.'),
      p('Fabricated citations deserve a specific warning: a citation makes an answer look verified. Models can produce well-formatted references to sections, pages, documents or URLs that do not exist or do not say what is claimed. A citation is a pointer to check, not a verification ([[D05-L05]]).'),
      warn('Never let the assistant\'s text be the only record of an action or approval. Show the system-of-record status (draft id, approval status) next to the claim.'),
    ],
    boundary: {
      component: 'Model output presented to people as facts, references, numbers or statuses.',
      trustBoundary: 'Model claims about systems versus the systems\' own records.',
      attackerControl: 'Not required for fabrication; an attacker can induce false approval claims via injection ([[D02-L02]]).',
    },
    scenario: {
      title: 'The draft that never was',
      setup: 'Priya asks AP Assist to "draft the Vela payment and let me know when it\'s ready". She receives a confident confirmation.',
      evidence: [
        trace('Trace tr_vd31', [
          { actor: 'model', event: 'propose', detail: '`payments.create_draft(vendor="V-2210", amount=4212.50)`', flag: 'info' },
          { actor: 'dispatcher', event: 'error', detail: 'Ledgerline timeout after 30 s; no draft created.', flag: 'warn' },
          { actor: 'model', event: 'answer', detail: '"Done. Draft PD-6044 is ready for approval."', flag: 'violation' },
        ]),
        table('Ledgerline check', ['Query', 'Result'], [['Draft PD-6044', 'Does not exist'], ['Drafts for V-2210 today', 'None']]),
      ],
    },
    worked: {
      title: 'Why it happened and the fix',
      blocks: [
        p('The tool call failed, and the model produced the most plausible next message, complete with an invented id. Classification: proposed, not executed; fabricated action claim. Fixes: the UI displays action status from the dispatcher (created, failed, blocked) rather than relying on the answer; tool failures are returned to the model as explicit errors with instructions to report failure; and a post-check verifies any draft id mentioned in an answer exists.'),
      ],
    },
    controls: [
      { control: 'Show action outcomes from the dispatcher next to the answer.', enforcementPoint: 'UI fed by execution log.', limitation: 'Users may still read only the answer text.' },
      { control: 'Verify ids, sections and references mentioned in output against records.', enforcementPoint: 'Post-generation checker.', limitation: 'Only catches claims with checkable identifiers.' },
    ],
    misconception: {
      claim: '"The assistant said the draft is created, and it has tool access, so it must be."',
      correction: 'Tool access means it can propose; the dispatcher log and Ledgerline show whether anything was created. Model text is not evidence of an action.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'List the claims an assistant in your environment makes about actions or approvals, and the record that should be shown beside each.',
      modelResponse: ['"Ticket created" → ticketing system id and status; "Email sent" → mail log id; "Manager approved" → approval workflow record with approver and timestamp.'],
    },
    sourceIds: ['owasp-llm09', 'arxiv-2311.05232', 'owasp-llm06'],
    glossary: ['hallucination', 'executed-action', 'citation-verification'],
    related: ['D02-L09', 'D05-L05'],
    conceptTag: 'fabrication-forms',
  },
  {
    id: 'D05-L03',
    title: 'Missing evidence, uncertainty, abstention and useful answers',
    summary:
      'Designs answers that say what is missing instead of guessing, while still being useful; abstention is a feature, not a failure.',
    minutes: 14,
    objectives: [
      'Identify situations where the evidence does not support an answer.',
      'Write abstentions that state what is missing and how to resolve it.',
      'Balance abstention against task completion.',
    ],
    prerequisites: ['D05-L01'],
    explanation: [
      p('When the supplied sources do not answer the question, the model has three options: guess, refuse, or **abstain usefully**. Guessing produces hallucinations. A flat refusal ("I can\'t help with that") wastes the user\'s time. {{abstention|Useful abstention}} says what is known, what is missing, and how to get it.'),
      code('Useful abstention (example)', 'text', `I couldn't find Larchmont's current payment terms in the indexed contracts.
- The 2024 contract (indexed) says Net 45.
- Ledgerline lists an amendment dated 2026-03-02 that is not in the index.
To confirm, open the amendment in Ledgerline (Vendor V-1042 > Contracts) or ask Procurement.`),
      p('Abstention needs a signal. Retrieval can supply one: no chunks above a relevance threshold, or retrieved chunks from the wrong supplier. Structured tasks can supply one: a required field missing from the invoice. Asking the model to "say I don\'t know when unsure" helps somewhat, but models are not reliably calibrated ([[D05-L07]]), so combine prompt guidance with checks the application can compute.'),
      p('Over-abstention is also a failure. An assistant that declines whenever evidence is imperfect will be abandoned, and users will go back to unmanaged tools. Measure both: how often it answers when evidence exists (coverage) and how often it abstains when evidence is missing ([[D05-L10]]).'),
      key('A good answer to an unanswerable question is a precise statement of what is missing.'),
      p('Abstention also has a security side. An assistant that guesses when evidence is missing is easier to steer: an attacker only needs to supply the missing "evidence". One that reports gaps makes manipulation more visible to the reader.'),
    ],
    boundary: {
      component: 'Answer generation and retrieval relevance signals.',
      trustBoundary: 'Between the evidence available and the claims presented.',
      attackerControl: 'Not required.',
    },
    scenario: {
      title: 'Three answers to one question',
      setup: 'Ravi asks Rocky: "What overtime rate applies to the Field Calibration team on statutory holidays?" The HR policy index has a general overtime policy but no holiday-specific clause.',
      evidence: [
        table('Candidate answers', ['Answer', 'Type'], [
          ['"Double time (2.0x) on statutory holidays."', 'Guess (unsupported)'],
          ['"I can\'t answer HR questions."', 'Unhelpful refusal'],
          ['"The overtime policy (HR-OT-3, §2) sets 1.5x for hours over 40 but does not mention statutory holidays. Check the collective agreement or ask HR Operations."', 'Useful abstention'],
        ]),
      ],
    },
    worked: {
      title: 'Choosing',
      blocks: [
        p('Only the third answer is acceptable. It quotes what the source says, names the gap, and routes Ravi to the authority. The first might even be correct by coincidence, but it is not supported, and payroll errors are costly. The application can support this: when no chunk mentions "holiday" or "statutory", the prompt instructs the model to report the gap, and the answer template includes a "sources consulted" list.'),
      ],
    },
    controls: [
      { control: 'Retrieval-based abstention signals (low relevance, missing required fields).', enforcementPoint: 'Harness before generation.', limitation: 'Thresholds trade false abstentions against unsupported answers.' },
      { control: 'Answer template with "sources consulted" and "not found" sections.', enforcementPoint: 'Prompt and output format.', limitation: 'Model may still fill gaps; pair with support checks.' },
    ],
    misconception: {
      claim: '"An assistant that says \'I don\'t know\' is broken."',
      correction: 'Abstaining when evidence is missing, while stating what is missing, is correct behaviour. The failure is abstaining when the evidence was available.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Rewrite an unhelpful refusal you have seen into a useful abstention.',
      modelResponse: ['From "I can\'t answer that" to "Our travel policy covers flights and hotels but not car rentals. For car rentals, ask Travel Desk or check the 2026 expense FAQ."'],
    },
    sourceIds: ['owasp-llm09', 'arxiv-2207.05221', 'nist-ai-600-1'],
    glossary: ['abstention', 'hallucination'],
    related: ['D05-L07', 'D05-L10'],
    conceptTag: 'useful-abstention',
  },
  {
    id: 'D05-L04',
    title: 'Retrieval quality, stale information, conflicting sources and incomplete context',
    summary:
      'Shows how retrieval failures cause wrong answers without any model or attacker fault, and how to detect stale and conflicting evidence.',
    minutes: 15,
    objectives: [
      'Identify retrieval failures: missing, stale, conflicting and truncated evidence.',
      'Design handling for conflicting sources.',
      'Distinguish retrieval failure from model fabrication in a trace.',
    ],
    prerequisites: ['D05-L01', 'D01-L04'],
    explanation: [
      p('In retrieval-augmented systems, many wrong answers are faithful answers to the wrong evidence. Four retrieval failures are common:'),
      ul(
        '**Missing:** the right document was never indexed, or the query did not retrieve it.',
        '**Stale:** an older version ranks higher than the current one.',
        '**Conflicting:** two retrieved sources disagree (old and new policy; contract and amendment).',
        '**Incomplete context:** the relevant chunk was cut off, or too many chunks crowded it out. Research on long contexts reports models use information in the middle of long inputs less reliably than at the beginning or end.',
      ),
      p('Conflicts deserve explicit handling. Prefer sources by authority and date (an amendment supersedes the contract it amends), and when the system cannot decide, show both and say so. Silently picking one hides the uncertainty from the user.'),
      table('Diagnosing a wrong answer from the trace', ['Retrieved evidence contains the wrong claim?', 'Right evidence retrieved?', 'Likely cause'], [
        ['Yes', 'No', 'Retrieval: stale or wrong document'],
        ['No', 'Yes', 'Generation: fabrication or misreading'],
        ['No', 'No', 'Missing evidence; should have abstained'],
        ['Yes', 'Yes (conflict)', 'Conflict handling'],
      ]),
      note('Check the retrieval log before blaming the model. The cheapest fix is often indexing the right document.'),
      p('Freshness is a process problem as much as a technical one. Someone must own each document type, mark superseded versions, and remove obsolete ones; the index can only rank what the metadata tells it.'),
    ],
    boundary: {
      component: 'Ingestion, indexing, ranking and context assembly.',
      trustBoundary: 'Retrieved text that the model treats as evidence.',
      attackerControl: 'Not required; an attacker who can add documents can exploit the same weaknesses ([[D06-L05]]).',
    },
    scenario: {
      title: 'Two travel policies',
      setup: 'An employee asks the per-diem rate for Montréal. The answer says CAD 75; Finance says CAD 90 since July.',
      evidence: [
        trace('Retrieval log tr_pd02', [
          { actor: 'retriever', event: 'result', detail: 'chunk travel-policy-2025 §4 "Per diem CAD 75" (score 0.88)', flag: 'warn' },
          { actor: 'retriever', event: 'result', detail: 'chunk travel-policy-2026-07 §4 "Per diem CAD 90" (score 0.86)', flag: 'info' },
          { actor: 'model', event: 'answer', detail: '"The per diem for Montréal is CAD 75."', flag: 'warn' },
        ]),
      ],
    },
    worked: {
      title: 'Diagnosis',
      blocks: [
        p('Both versions were retrieved; the older ranked slightly higher and the model used it. This is a conflict-handling failure, not a fabrication. Fixes: mark superseded documents in metadata and exclude or down-rank them; when two versions of the same policy are retrieved, prefer the newest effective date; and instruct the answer to cite the effective date. Remove the 2025 policy from the index if it is fully superseded.'),
      ],
    },
    controls: [
      { control: 'Document metadata for version, effective date and supersession.', enforcementPoint: 'Ingestion and ranking.', limitation: 'Requires disciplined document management upstream.' },
      { control: 'Explicit conflict surfacing in answers.', enforcementPoint: 'Prompt and answer template.', limitation: 'Users may find conflicts confusing; give a recommended authority.' },
    ],
    misconception: {
      claim: '"The model hallucinated the old per diem."',
      correction: 'The old value was in a retrieved, outdated document. The model was faithful to stale evidence; the fix is in indexing and ranking.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'How would you find all superseded documents still in an index?',
      modelResponse: ['Group documents by title or policy id, list those with multiple versions, and flag any older version without a "superseded_by" field; then confirm with document owners and remove or mark them.'],
    },
    sourceIds: ['arxiv-2307.03172', 'arxiv-2005.11401', 'owasp-llm09'],
    glossary: ['rag', 'reranking'],
    related: ['D06-L04', 'D06-L08'],
    conceptTag: 'retrieval-quality',
  },
  {
    id: 'D05-L05',
    title: 'Citation verification at the claim level',
    summary:
      'Checks that each claim is supported by the specific source cited for it, rather than accepting citations as proof.',
    minutes: 15,
    objectives: [
      'Break an answer into checkable claims and match each to its citation.',
      'Verify existence, identity and support for each citation.',
      'Automate parts of citation checking and know their limits.',
    ],
    prerequisites: ['D05-L02'],
    explanation: [
      p('{{citation-verification|Citation verification}} has three levels:'),
      ul(
        '**Existence:** does the cited document, section or URL exist?',
        '**Identity:** is it the document claimed (right version, right supplier)?',
        '**Support:** does that passage actually state the claim attached to it?',
      ),
      p('Answers usually contain several claims and one or two citations. Checking at the answer level ("it has citations") misses unsupported claims sitting next to supported ones. Check at the **claim level**: split the answer into atomic statements and verify each against its cited passage. Research on long-form factuality uses this decomposition to measure the fraction of supported atomic facts.'),
      p('Automation helps: the application can verify that cited chunk ids exist and were actually retrieved for this request, and a separate model can judge whether a passage entails a claim. That judge is itself fallible ([[D05-L09]]); use it to prioritize human review rather than to certify answers.'),
      table('Claim-level check of an answer', ['Claim', 'Citation', 'Exists', 'Supports'], [
        ['Net 30 payment terms', 'Amendment 2026-03 §2', 'Yes', 'Yes'],
        ['2% early-payment discount', 'Contract 2024 §5', 'Yes', 'No (§5 says nothing about discounts)'],
        ['Late fee 1.5%/month', 'Contract 2024 §9.3', 'No (§9 has two subsections)', '—'],
      ]),
      key('A citation is a pointer to check, not a proof.'),
    ],
    boundary: {
      component: 'Answer post-processing and display.',
      trustBoundary: 'Model-generated references presented as evidence.',
      attackerControl: 'Not required.',
    },
    scenario: {
      title: 'Audit sample',
      setup: 'Ines audits 50 SupplierKB answers that included citations.',
      evidence: [
        table('Audit results (synthetic)', ['Measure', 'Count'], [
          ['Answers audited', '50'],
          ['Atomic claims', '214'],
          ['Claims with a citation', '171'],
          ['Cited passage exists and was retrieved', '163'],
          ['Cited passage supports the claim', '139'],
          ['Claims without any citation', '43'],
        ]),
      ],
    },
    worked: {
      title: 'Reading the audit',
      blocks: [
        p('Of 214 claims, 139 are supported by their cited passage (65%). Eight citations point to passages that do not exist or were not retrieved: fabricated citations. Twenty-four point to real passages that do not support the claim. Forty-three claims have no citation at all. "All answers had citations" would have hidden all of this.'),
        p('Changes: verify chunk ids automatically (removing the 8 non-existent citations from display and flagging the answer), show the cited passage on hover so users can check support, and report claim-level support as a quality metric.'),
      ],
    },
    controls: [
      { control: 'Automatic existence check of cited ids against the retrieval log.', enforcementPoint: 'Post-generation checker.', limitation: 'Existence is not support.' },
      { control: 'Entailment judge per claim to triage review.', enforcementPoint: 'Evaluation and monitoring.', limitation: 'Judge errors; correlated with generator errors.' },
      { control: 'Show cited passages inline.', enforcementPoint: 'UI.', limitation: 'Relies on users reading them.' },
    ],
    misconception: {
      claim: '"Every answer includes citations, so it is grounded."',
      correction: 'Citations can be invented, can point to the wrong version, or can be real but unrelated to the claim. Grounding is measured per claim.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Take any AI answer with citations and check one claim at all three levels. What did you find?',
      modelResponse: ['A typical finding: the source exists and is the right document, but the specific number in the answer appears nowhere in it (support failure), or the page number is wrong (identity failure).'],
    },
    sourceIds: ['arxiv-2305.14251', 'owasp-llm09', 'arxiv-2311.05232'],
    glossary: ['citation-verification', 'faithfulness'],
    related: ['D05-L09', 'D05-L10'],
    conceptTag: 'claim-level-citations',
  },
  {
    id: 'D05-L06',
    title: 'Deterministic calculation and validation against domain constraints',
    summary:
      'Moves arithmetic and rule checks out of the model into code, and validates outputs against business constraints.',
    minutes: 14,
    objectives: [
      'Identify tasks where the model should not compute results itself.',
      'Delegate calculations to deterministic tools and validate results.',
      'Apply domain constraints (totals, tax rules, date ranges) as automatic checks.',
    ],
    prerequisites: ['D05-L02'],
    explanation: [
      p('Language models produce text that looks like arithmetic. They can be right often and still be wrong on carries, rounding, unit conversions and long sums. For anything that matters (totals, taxes, payroll deductions, currency conversion), compute in code and let the model explain the result.'),
      p('Two patterns help:'),
      ul(
        '**Tool delegation:** the model proposes `calc.sum(line_items)` or `tax.compute(province="QC", amount=…)`; deterministic code computes; the model reports the returned value.',
        '**Constraint validation:** after generation, code checks domain rules: line items sum to the stated subtotal; tax equals rate × subtotal within a rounding tolerance; dates are within the invoice period; quantities are positive.',
      ),
      p('Constraints catch both model errors and bad input data. If an invoice\'s printed total does not match its line items, that is worth flagging whether or not a model was involved.'),
      p('Show the computed values, not the model\'s retelling of them. If the UI displays the tool\'s result directly (subtotal, tax, total from code), a model that misreports a number in its prose cannot change what the clerk relies on. The prose can explain; the figures come from the system.'),
      p('Tax and payroll rules are a special case. Rates, thresholds and rounding rules change by jurisdiction and year (in Quebec, for example, GST and QST are separate taxes with separate registrations). They belong in maintained configuration and tested code, reviewed when rules change, never in a prompt and never in model memory.'),
      code('Constraint check (illustrative)', 'python', `from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")

def check_invoice(lines, subtotal, tax, total, tax_rate):
    issues = []
    computed = sum((l.qty * l.unit_price for l in lines), Decimal("0")).quantize(CENT, ROUND_HALF_UP)
    if computed != subtotal:
        issues.append(f"subtotal {subtotal} != line items {computed}")
    expected_tax = (subtotal * tax_rate).quantize(CENT, ROUND_HALF_UP)
    if abs(expected_tax - tax) > CENT:
        issues.append(f"tax {tax} != {expected_tax}")
    if subtotal + tax != total:
        issues.append("total != subtotal + tax")
    return issues`, ['Decimal arithmetic avoids binary floating-point rounding errors in money.', 'The tax rate comes from configuration, not from the model.']),
    ],
    boundary: {
      component: 'Calculation tools and post-generation validators.',
      trustBoundary: 'Numbers in model output entering business records or decisions.',
      attackerControl: 'Not required; a malicious invoice can also contain inconsistent numbers.',
    },
    scenario: {
      title: 'The rounding drift',
      setup: 'AP Assist summarizes invoices including the total. An auditor finds totals off by a few cents to a few hundred dollars in 3% of summaries.',
      evidence: [
        table('Sample (synthetic)', ['Invoice', 'Printed total', 'Line-item sum', 'AP Assist stated'], [
          ['INV-4410', '12,100.00', '12,100.00', '21,000.00'],
          ['INV-4418', '987.65', '987.65', '987.56'],
          ['INV-4432', '5,250.00', '5,205.00', '5,250.00'],
        ]),
      ],
    },
    worked: {
      title: 'Three different errors',
      blocks: [
        ul(
          'INV-4410 and INV-4418: the model misstated the total (digit transposition). Fix: report totals from the parser or a calc tool, never from free generation.',
          'INV-4432: the model was faithful, but the invoice itself is inconsistent (line items sum to 5,205.00). The constraint check flags it for AP review; it may be a supplier error or an attempt to overbill.',
        ),
      ],
    },
    controls: [
      { control: 'Delegate arithmetic to deterministic tools.', enforcementPoint: 'Tool set and prompt design.', limitation: 'The model can still misreport a tool result; display tool outputs directly.' },
      { control: 'Validate outputs and inputs against domain constraints.', enforcementPoint: 'Post-processing validator.', limitation: 'Only covers rules you encode.' },
    ],
    misconception: {
      claim: '"Newer models are good at math, so we can trust their totals."',
      correction: 'Better is not deterministic. For financial figures, compute in code and validate; use the model to explain.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Name two domain constraints you would check on payroll output produced with AI assistance.',
      modelResponse: ['Gross minus deductions equals net to the cent; statutory deductions computed by the payroll engine match the amounts quoted; overtime hours do not exceed recorded hours.'],
    },
    sourceIds: ['owasp-llm09', 'nist-ai-600-1'],
    glossary: ['hallucination', 'structured-output'],
    related: ['D05-L08', 'D10-L03'],
    conceptTag: 'deterministic-calculation',
  },
  {
    id: 'D05-L07',
    title: 'Confidence, calibration, temperature and consistency distinctions',
    summary:
      'Separates four ideas often confused with correctness: stated confidence, calibration, sampling temperature and answer consistency.',
    minutes: 15,
    objectives: [
      'Define calibration and explain why stated confidence is not evidence of correctness.',
      'Explain what temperature controls and what it does not.',
      'Use consistency across samples as a signal, aware of its limits.',
    ],
    prerequisites: ['D05-L03'],
    explanation: [
      p('Four ideas are frequently mistaken for "the answer is reliable":'),
      table('Four distinct ideas', ['Idea', 'What it is', 'What it is not'], [
        ['Stated confidence', 'The model writing "I\'m 95% sure"', 'A measurement; it is generated text'],
        ['{{calibration|Calibration}}', 'Agreement between confidence and observed accuracy across many cases', 'A property of one answer'],
        ['{{temperature|Temperature}}', 'Sampling randomness; low = more deterministic', 'A truth dial'],
        ['Consistency', 'Same answer across repeated samples or rephrasings', 'Proof of correctness'],
      ]),
      p('Calibration is measured, not asserted: collect many answers with a confidence score, then check whether "80% confidence" answers are right about 80% of the time. Research shows modern neural networks can be poorly calibrated, and that language models\' self-evaluation is informative in some settings but imperfect. Treat a model\'s stated confidence as one weak signal unless you have measured its calibration on your task.'),
      p('Low temperature makes outputs more repeatable. It does not make them more correct: a model can repeat the same wrong answer every time. Consistency checks (sampling several answers and comparing) can flag uncertainty, since disagreement among samples is a useful warning sign; but agreement can be consistently wrong, especially when all samples share the same stale evidence.'),
      warn('Setting temperature to 0 for "accuracy" mostly buys reproducibility, which is still useful for testing.'),
      p('Reproducibility has real value for security work: a fixed temperature (and seed, where the provider supports one) makes regression tests stable and makes incident reproduction possible. Just do not report it as an accuracy control.'),
    ],
    boundary: {
      component: 'Generation settings and any confidence signal shown to users.',
      trustBoundary: 'Signals presented to users as indicators of reliability.',
      attackerControl: 'Not required.',
    },
    scenario: {
      title: 'The confidence badge',
      setup: 'A product manager proposes a green "High confidence" badge whenever the model says it is more than 90% confident. Sam measures it first.',
      evidence: [
        table('Measurement on 400 labelled questions (synthetic)', ['Model-stated confidence', 'Answers', 'Actually correct'], [
          ['≥ 90%', '310', '232 (75%)'],
          ['50–89%', '70', '41 (59%)'],
          ['< 50%', '20', '9 (45%)'],
        ]),
      ],
    },
    worked: {
      title: 'Decision',
      blocks: [
        p('Answers stated at "90%+" were right 75% of the time, so the badge would overstate reliability on one in four answers it marks green. Stated confidence does carry some signal (higher bands are more accurate), so it can help route answers to review, but it should not be shown as a reliability guarantee. Sam recommends showing source support status instead ([[D05-L05]]) and using low stated confidence as one trigger for human review.'),
      ],
    },
    controls: [
      { control: 'Measure calibration on your task before displaying confidence.', enforcementPoint: 'Evaluation pipeline.', limitation: 'Calibration drifts with model and data changes.' },
      { control: 'Use sample disagreement as a review trigger.', enforcementPoint: 'Monitoring.', limitation: 'Consistent errors pass.' },
    ],
    misconception: {
      claim: '"We set temperature to zero, so the answers are accurate."',
      correction: 'Temperature zero makes answers repeatable, not true. Accuracy comes from evidence and verification.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Describe how you would measure whether a confidence score is calibrated on your task.',
      modelResponse: ['Collect a few hundred questions with known answers, record the confidence for each, group by confidence band, and compare each band\'s stated confidence with its observed accuracy.'],
    },
    sourceIds: ['arxiv-1706.04599', 'arxiv-2207.05221', 'arxiv-2303.08896'],
    glossary: ['calibration', 'temperature'],
    related: ['D05-L03', 'D05-L10'],
    conceptTag: 'confidence-not-correctness',
  },
  {
    id: 'D05-L08',
    title: 'Structured output and why valid JSON can contain false values',
    summary:
      'Explains what schema-constrained output guarantees (shape) and what it does not (truth), and how to validate values.',
    minutes: 13,
    objectives: [
      'State what schema validation guarantees and what it does not.',
      'Add value-level validation to structured extraction.',
      'Recognize fabricated values that fit a schema.',
    ],
    prerequisites: ['D05-L06'],
    explanation: [
      p('{{structured-output|Structured output}} constrains the model to produce JSON (or another format) matching a schema. It is very useful: parsing becomes reliable, required fields are present, enums take allowed values. It guarantees **shape**. It does not guarantee **truth**.'),
      p('A schema can require `iban` to be a string matching the IBAN pattern; the model can still output a valid-looking IBAN that appears nowhere in the invoice. It can require `total` to be a number; the model can output the wrong number. When a required field is missing from the source, schema pressure can even make fabrication more likely: the model must fill the field with something.'),
      table('Validation layers', ['Layer', 'Catches', 'Misses'], [
        ['Schema (types, enums, patterns)', 'Malformed or missing fields', 'Wrong but well-formed values'],
        ['Cross-field constraints', 'Inconsistent totals, dates', 'Consistent fabrications'],
        ['Source grounding', 'Values absent from the document', 'Errors in the document itself'],
        ['System-of-record comparison', 'Values that differ from master data', 'Master data errors'],
      ]),
      p('Allow the schema to express absence: make fields nullable or add an explicit `not_found` state, so the model is not forced to invent. Then check grounding: every extracted value should appear in (or be derivable from) the source document.'),
      p('Structured output also matters for security beyond accuracy. When model output drives code (a tool call, a database update), a strict schema narrows what the model can express: an enum of three queues is safer than a free-text queue name. But a valid value can still be the wrong value, so the receiving code must also check that the value is allowed for this user and task ([[D07-L06]]).'),
    ],
    boundary: {
      component: 'Extraction pipeline and its validators.',
      trustBoundary: 'Structured values entering business systems.',
      attackerControl: 'Not required; a malicious document can also supply false values.',
    },
    scenario: {
      title: 'The well-formed IBAN',
      setup: 'AP Assist extracts invoice fields into a strict JSON schema with a required `iban` field. A Vela Freight invoice contains no bank details.',
      evidence: [
        code('Extraction output (synthetic)', 'json', `{
  "vendor": "Vela Freight",
  "invoice_number": "INV-3311",
  "total": 4212.50,
  "currency": "CAD",
  "iban": "CA49 0012 3456 7890 1234 56"
}`, ['Passes schema validation (pattern and required fields).', 'The IBAN appears nowhere in the PDF; the model was forced to fill a required field.']),
      ],
    },
    worked: {
      title: 'Fixing the design',
      blocks: [
        ul(
          'Make `iban` nullable with `"source": "not_found"` allowed.',
          'Add a grounding check: each extracted value must match text in the document (normalized).',
          'Never use extracted bank details for payment; use the vendor master ([[D02-L07]]).',
        ),
        note('Valid JSON gave a false sense of correctness. The value-level checks are what protect the business.'),
      ],
    },
    controls: [
      { control: 'Nullable fields and explicit "not found" states.', enforcementPoint: 'Schema design.', limitation: 'Models may still fill optional fields.' },
      { control: 'Grounding check of each extracted value against the source.', enforcementPoint: 'Extraction validator.', limitation: 'Derived values (sums) need computation rather than matching.' },
    ],
    misconception: {
      claim: '"The output passed JSON schema validation, so the data is correct."',
      correction: 'Schemas validate structure. Values must be checked against the source and systems of record.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Which fields in an invoice-extraction schema should be nullable, and why?',
      modelResponse: ['Bank details, PO number, tax registration number and due date, because many invoices omit them and forcing a value invites fabrication.'],
    },
    sourceIds: ['owasp-llm09', 'owasp-llm05'],
    glossary: ['structured-output', 'hallucination'],
    related: ['D10-L03', 'D05-L06'],
    conceptTag: 'valid-json-false-values',
  },
  {
    id: 'D05-L09',
    title: 'Reviewing models, correlated errors and independent checks',
    summary:
      'Evaluates "LLM as judge" and reviewer patterns: when a second model helps, when it shares the first model\'s errors, and what counts as independent.',
    minutes: 15,
    objectives: [
      'Explain how correlated errors limit model-on-model review.',
      'Identify more independent checks: deterministic, source-based and human.',
      'Use model judges appropriately for triage and measurement.',
    ],
    prerequisites: ['D05-L05', 'D02-L08'],
    explanation: [
      p('A common pattern uses a second model to check the first: "Is this answer supported by the sources?" Model judges are practical for scaling evaluation and are reported to agree with human preferences reasonably well in some settings, with known biases such as favouring longer answers or their own outputs.'),
      p('The core limitation is **correlated error**. If the judge reads the same stale document, it will agree with the stale answer. If both models share training data, they may share the same misconceptions. If an injection steered the first model, it can steer the judge ([[D02-L08]]). Agreement between correlated checkers adds less evidence than it appears to.'),
      table('Independence of checks', ['Check', 'Independent of generator\'s errors?'], [
        ['Same model re-asked', 'Low'],
        ['Different model, same sources', 'Partial (shares source errors)'],
        ['Deterministic recomputation', 'High for what it covers'],
        ['Comparison with system of record', 'High for what it covers'],
        ['Human expert with source access', 'High, limited scale'],
      ]),
      p('Use model judges where they are strong: triaging which answers to review, measuring trends across thousands of answers, and catching obvious unsupported claims. Calibrate the judge against human labels on a sample before trusting its numbers, and report its agreement rate alongside results.'),
      p('You can raise independence deliberately: give the judge different evidence (the current contract register, not the retrieved chunk), a different task framing (extract the value and compare, rather than "is this supported?"), or a deterministic oracle for checkable parts.'),
    ],
    boundary: {
      component: 'Evaluation and verification pipeline.',
      trustBoundary: 'Automated judgments used as evidence of quality.',
      attackerControl: 'Injected content visible to both generator and judge.',
    },
    scenario: {
      title: 'The 97% grounded dashboard',
      setup: 'A dashboard reports "97% of SupplierKB answers grounded" based on a judge model. Ines compares with her manual audit ([[D05-L05]]).',
      evidence: [
        table('Judge versus human on 100 claims (synthetic)', ['', 'Human: supported', 'Human: not supported'], [
          ['Judge: supported', '64', '22'],
          ['Judge: not supported', '3', '11'],
        ]),
      ],
    },
    worked: {
      title: 'Interpreting',
      blocks: [
        p('Of 33 claims humans found unsupported, the judge caught 11 (33%). The judge agreed with humans on 75 of 100 claims overall. The 97% headline mostly reflects the judge\'s tendency to accept plausible claims. Most misses involved stale documents both models treated as authoritative. Ines asks for the dashboard to show judge-human agreement, add deterministic citation existence checks, and keep a monthly human audit.'),
      ],
    },
    controls: [
      { control: 'Calibrate model judges against human labels; publish agreement.', enforcementPoint: 'Evaluation methodology.', limitation: 'Human labels are costly and also imperfect.' },
      { control: 'Prefer deterministic and system-of-record checks where possible.', enforcementPoint: 'Verification pipeline.', limitation: 'Cover only checkable claims.' },
    ],
    misconception: {
      claim: '"Two models agreed, so the answer is verified."',
      correction: 'Models reading the same sources or sharing training data can agree on the same error. Independence comes from different evidence, not a second opinion from a similar system.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Rank three checks for an invoice total by independence from the generator.',
      modelResponse: ['1. Deterministic sum of parsed line items (highest). 2. Comparison with the total in Ledgerline. 3. A judge model reading the same PDF (lowest; shares the extraction errors).'],
    },
    sourceIds: ['arxiv-2306.05685', 'arxiv-2303.08896', 'owasp-llm09'],
    glossary: ['guardrail', 'citation-verification'],
    related: ['D02-L08', 'D11-L07'],
    conceptTag: 'correlated-judges',
  },
  {
    id: 'D05-L10',
    title: 'Measuring factual support, coverage, abstention and legitimate task completion',
    summary:
      'Builds a measurement scheme for answer quality that cannot be gamed by refusing or by answering everything.',
    minutes: 16,
    objectives: [
      'Define support rate, coverage, abstention quality and task completion with denominators.',
      'Build a balanced evaluation set with answerable and unanswerable questions.',
      'Report metrics so that trade-offs are visible.',
    ],
    prerequisites: ['D05-L03', 'D05-L05', 'D05-L09'],
    explanation: [
      p('Single numbers invite gaming. "Hallucination rate" falls to zero if the assistant refuses everything. "Answer rate" rises to 100% if it guesses. Measure several things together, each with a stated denominator:'),
      table('Metrics', ['Metric', 'Definition', 'Denominator'], [
        ['Support rate', 'Atomic claims supported by cited sources', 'All atomic claims in answered questions'],
        ['Coverage', 'Answerable questions answered correctly', 'Answerable questions'],
        ['Abstention precision', 'Abstentions where evidence was truly missing', 'All abstentions'],
        ['Abstention recall', 'Unanswerable questions correctly abstained on', 'Unanswerable questions'],
        ['Task completion', 'End-to-end tasks finished correctly (e.g. invoice processed)', 'Legitimate tasks attempted'],
      ]),
      p('This requires an evaluation set that includes **both** answerable and unanswerable questions, labelled by people with source access. A typical mix might be 70% answerable, 20% unanswerable, 10% conflicting-source, reflecting real traffic.'),
      p('Report trade-offs explicitly. If a change raises support rate from 82% to 91% but drops coverage from 88% to 70%, it may be refusing too much. Show both, with counts, and let the owner decide.'),
      key('A reliability report without denominators and without benign completion cannot be interpreted.'),
      p('Keep the evaluation set separate from development. If prompt authors tune against the same 300 questions used for release decisions, the numbers drift upward without real improvement, the same contamination problem seen with training data ([[D04-L05]]). Hold back a release set that prompt authors do not see.'),
    ],
    boundary: {
      component: 'Evaluation design and reporting.',
      trustBoundary: 'Metrics used for release and governance decisions.',
      attackerControl: 'Not applicable; this lesson concerns measurement.',
    },
    scenario: {
      title: 'Comparing two prompt versions',
      setup: 'Sam evaluates SupplierKB prompt v4 (current) and v5 ("be conservative") on 300 labelled questions: 210 answerable, 60 unanswerable, 30 conflicting.',
      evidence: [
        table('Results (synthetic)', ['Metric', 'v4', 'v5'], [
          ['Support rate (claims)', '84% (612/729)', '93% (402/432)'],
          ['Coverage (answerable)', '86% (181/210)', '61% (128/210)'],
          ['Abstention recall (unanswerable)', '55% (33/60)', '92% (55/60)'],
          ['Abstention precision', '70% (33/47)', '41% (55/134)'],
          ['Conflicts surfaced', '30% (9/30)', '37% (11/30)'],
        ]),
      ],
    },
    worked: {
      title: 'Recommendation',
      blocks: [
        p('v5 makes fewer unsupported claims and abstains well on unanswerable questions, but it abstains on many answerable ones (precision 41%) and coverage drops 25 points. Neither version handles conflicts well. Sam recommends neither as-is: keep v4, add retrieval-based abstention signals for clearly unanswerable cases, and fix conflict handling in ranking ([[D05-L04]]). Then re-measure on a fresh set.'),
      ],
    },
    controls: [
      { control: 'Balanced evaluation sets with answerable, unanswerable and conflicting cases.', enforcementPoint: 'Evaluation pipeline.', limitation: 'Labels need expert time and go stale.' },
      { control: 'Release criteria on multiple metrics with denominators.', enforcementPoint: 'Release gate.', limitation: 'Thresholds are judgment calls.' },
    ],
    misconception: {
      claim: '"Our hallucination rate dropped to 2%, so the assistant is more reliable."',
      correction: 'A lower hallucination rate can come from answering less. Reliability includes coverage and task completion; report them together with denominators.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Draft release criteria for SupplierKB using at least three of the metrics above, with thresholds.',
      modelResponse: ['Example: support rate ≥ 88%; coverage ≥ 85% of answerable questions; abstention recall ≥ 75% with precision ≥ 60%; no regression > 3 points on any metric versus current version. Thresholds are ROCKTO choices to revisit quarterly.'],
    },
    sourceIds: ['arxiv-2305.14251', 'owasp-llm09', 'nist-ai-rmf'],
    glossary: ['abstention', 'benign-completion', 'citation-verification'],
    related: ['D11-L07', 'D11-L10'],
    conceptTag: 'balanced-reliability-metrics',
    labId: 'evaluation-panel',
  },
];
