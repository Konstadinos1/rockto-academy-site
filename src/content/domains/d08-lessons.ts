import { key, note, p, table, trace, ul, warn } from '../blocks';
import type { LessonDraft } from '../types';

export const D08_LESSONS: LessonDraft[] = [
  {
    id: 'D08-L01',
    title: 'White-box, black-box and gray-box assumptions',
    summary:
      'Defines attacker knowledge levels and shows how each changes which attacks are realistic and which defences matter.',
    minutes: 14,
    objectives: [
      'Define white-box, black-box and gray-box attacker knowledge.',
      'Map ROCKTO\'s models to the knowledge an attacker could realistically have.',
      'Explain why the knowledge assumption must be stated before judging an attack result.',
    ],
    prerequisites: ['D01-L06', 'D04-L01'],
    explanation: [
      p('Adversarial machine learning studies attacks on the learning and inference of models: evading classifiers, stealing models, inferring training data. Every such attack assumes something about what the attacker knows and can do. The NIST adversarial ML taxonomy organizes attacks by attacker goals, capabilities and knowledge, and that framing is the right starting point for any assessment.'),
      table('Knowledge levels', ['Level', 'Attacker knows', 'Typical access'], [
        ['{{white-box|White-box}}', 'Architecture, weights, often training data', 'Open-weight model, insider, stolen checkpoint'],
        ['Black-box', 'Only inputs and outputs', 'Public API or product UI'],
        ['Gray-box', 'Partial: architecture family, training data source, some outputs like scores', 'Published model card, similar open model, verbose API'],
      ]),
      p('Knowledge changes what is realistic. Gradient-based evasion is straightforward with white-box access. Black-box attackers must estimate gradients from queries or use a substitute model and hope the attack transfers ([[D08-L03]]). Gray-box details matter a lot: an API that returns full probability scores leaks far more than one returning a label.'),
      p('Capabilities matter as much as knowledge: how many queries can the attacker make, can they control training data, can they choose inputs freely or only within constraints (a fraudster can change some invoice fields but not the vendor\'s registration number)?'),
      key('An attack result is only meaningful relative to its stated knowledge and capability assumptions.'),
    ],
    boundary: {
      component: 'Deployed models and their interfaces (APIs, product features).',
      trustBoundary: 'What model internals and outputs are exposed to whom.',
      attackerControl: 'Defined by the knowledge level and query/input capabilities stated for the scenario.',
    },
    scenario: {
      title: 'Three ROCKTO models',
      setup: 'Luc writes knowledge assumptions for three models before commissioning tests.',
      evidence: [
        table('Assumptions (synthetic)', ['Model', 'Exposure', 'Realistic knowledge'], [
          ['ticket-router (fine-tuned, internal)', 'Customers submit tickets; see only which queue answers', 'Black-box, label-only, low query volume'],
          ['SensorCloud anomaly detector', 'Tenants see anomaly scores 0–1 per reading', 'Gray-box: scores exposed, model family documented'],
          ['Open-weight embedding model', 'Downloaded from a public hub', 'White-box for anyone'],
        ]),
      ],
    },
    worked: {
      title: 'Consequences for testing',
      blocks: [
        ul(
          'ticket-router: test with label-only queries at realistic volumes; white-box results would overstate risk.',
          'Anomaly detector: exposed scores enable score-guided evasion and easier extraction; consider returning coarser outputs ([[D08-L08]]).',
          'Embedding model: assume attackers can compute adversarial inputs offline; robustness must hold under white-box conditions.',
        ),
      ],
    },
    controls: [
      { control: 'Document knowledge and capability assumptions per model.', enforcementPoint: 'Threat model ([[D11-L01]]).', limitation: 'Assumptions can be wrong (leaked weights, insiders).' },
      { control: 'Limit what interfaces reveal (labels vs scores).', enforcementPoint: 'API design.', limitation: 'Users may need scores for legitimate decisions.' },
    ],
    misconception: {
      claim: '"Our model is proprietary, so white-box attacks don\'t apply."',
      correction: 'Proprietary reduces knowledge but does not eliminate it: similar open models, leaked weights, insiders and verbose outputs give gray-box knowledge. State the assumption and test against it.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Pick a model you know and classify the knowledge an outside attacker has. What single interface change would reduce it most?',
      modelResponse: ['Example: a fraud API returning probability scores gives gray-box knowledge; returning only approve/review labels (with scores kept internal) reduces it most.'],
    },
    sourceIds: ['nist-ai-100-2', 'mitre-atlas'],
    glossary: ['white-box', 'threat-model'],
    related: ['D11-L01', 'D08-L10'],
    conceptTag: 'knowledge-assumptions',
  },
  {
    id: 'D08-L02',
    title: 'Evasion and adversarial examples in bounded synthetic systems',
    summary:
      'Explains evasion attacks with a bounded example: small, constrained input changes that flip a classifier\'s decision at inference time.',
    minutes: 15,
    objectives: [
      'Define evasion and adversarial examples.',
      'Explain why constraints on what the attacker can change matter.',
      'Evaluate evasion risk for a classifier in a business process.',
    ],
    prerequisites: ['D08-L01'],
    explanation: [
      p('An {{evasion|evasion attack}} changes an input at inference time so the model makes a wrong decision; the model itself is untouched. An {{adversarial-example|adversarial example}} is such an input. Classic image research showed tiny pixel changes, imperceptible to people, could flip classifications, and that gradient information makes such changes easy to compute.'),
      p('In enterprise settings the relevant question is not pixels but **feasible changes**. An attacker submitting invoices to an anomaly detector can change wording, line-item splits, amounts within limits and timing; they cannot change ROCKTO\'s purchase order records. Evasion analysis should use realistic constraints, otherwise it reports attacks that cannot happen and misses ones that can.'),
      table('Feasible vs infeasible changes (invoice anomaly detector)', ['Feature', 'Attacker can change?'], [
        ['Description wording', 'Yes'],
        ['Number and size of line items', 'Yes, within contract'],
        ['Invoice amount', 'Partly (must match delivered goods to survive audit)'],
        ['PO match status', 'No (computed from ROCKTO records)'],
        ['Supplier history features', 'Only slowly, by behaving normally first'],
      ]),
      p('Defences include training on adversarial examples (adversarial training), reducing reliance on easily manipulated features, ensembles, and above all **process design**: a classifier that only routes items to review, with sampling of auto-approved items, limits what evasion achieves. A model that alone approves payments makes evasion directly profitable.'),
      warn('Robustness claimed against one perturbation type (for example small numeric changes) says nothing about others (wording, splitting).'),
    ],
    boundary: {
      component: 'Deployed classifier and its input features.',
      trustBoundary: 'Attacker-influenced inputs entering the model at inference.',
      attackerControl: 'A bounded set of input features, defined by the business process.',
    },
    scenario: {
      title: 'Splitting to stay under the score',
      setup: 'SensorCloud\'s billing team uses a synthetic "unusual invoice" classifier. A red-team exercise (synthetic data only) tests whether a supplier could avoid review.',
      evidence: [
        table('Red-team results (synthetic)', ['Strategy', 'Flagged for review'], [
          ['Single invoice 48,000 for "consulting"', 'Yes (score 0.91)'],
          ['Same amount split into 6 invoices of 8,000 over 3 weeks', 'No (scores 0.22–0.31)'],
          ['Same, but descriptions copied from past approved invoices', 'No (scores 0.08–0.15)'],
        ]),
      ],
    },
    worked: {
      title: 'Interpreting',
      blocks: [
        p('The classifier scores invoices individually; splitting and mimicking normal descriptions evade it using only feasible changes. The fix is partly model (features aggregating a supplier\'s recent invoices) and mostly process: per-supplier monthly totals reviewed, random sampling of low-score invoices, and PO matching as a hard rule. The red team used synthetic data and a test copy of the model, not production.'),
      ],
    },
    controls: [
      { control: 'Aggregate features and business rules that are hard to evade (PO match, supplier totals).', enforcementPoint: 'Model features and AP process.', limitation: 'Patient attackers adapt to aggregate thresholds too.' },
      { control: 'Random review sampling of low-score items.', enforcementPoint: 'AP workflow.', limitation: 'Sampling catches a fraction, not all.' },
    ],
    misconception: {
      claim: '"Adversarial examples are an academic image problem with no relevance to business classifiers."',
      correction: 'Any classifier whose inputs an adversary influences can be evaded. In business settings the perturbations are feasible changes like wording, splitting and timing.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'List the features of a fraud or spam classifier you know, and mark which ones an attacker controls.',
      modelResponse: ['Example spam filter: message text and links (controlled), sender display name (controlled), sending infrastructure reputation (partly), recipient\'s past interactions (not controlled). Defences should lean on the uncontrolled features.'],
    },
    sourceIds: ['arxiv-1412.6572', 'nist-ai-100-2', 'mitre-atlas'],
    glossary: ['evasion', 'adversarial-example'],
    related: ['D08-L03', 'D08-L09'],
    conceptTag: 'feasible-evasion',
  },
  {
    id: 'D08-L03',
    title: 'Transferability and the limits of a single successful example',
    summary:
      'Explains why adversarial inputs sometimes transfer between models, and why one success is weak evidence about a system\'s robustness.',
    minutes: 13,
    objectives: [
      'Define transferability and how black-box attackers use substitute models.',
      'Explain why a single successful example says little about overall robustness.',
      'Design evaluations that report rates, not anecdotes.',
    ],
    prerequisites: ['D08-L02'],
    explanation: [
      p('{{transferability|Transferability}} is the observation that an adversarial input crafted against one model often also fools a different model trained for the same task. Black-box attackers exploit it: train a local substitute (sometimes using the target\'s own outputs as labels), craft attacks against the substitute with full gradient access, then send them to the target. Research on aligned language models has also reported adversarial suffixes optimized on open models that transferred to other models in some cases.'),
      p('Transfer is common but not guaranteed. Success rates vary with model similarity, the attack method and defences. That is why a single successful example, "this prompt broke the model", is weak evidence. It proves the failure is possible, which matters, but says nothing about how often similar attempts succeed, whether a small change in the system removes it, or whether it works on the deployed configuration.'),
      table('Anecdote versus evaluation', ['Claim', 'Evidence needed'], [
        ['"The attack is possible"', 'One reproducible example on the deployed system'],
        ['"The attack is reliable"', 'Success rate over many attempts, with denominator'],
        ['"The attack transfers"', 'Rates on several target models or versions'],
        ['"The defence works"', 'Rates before/after, same attempts and budget ([[D08-L09]])'],
      ]),
      note('Treat a single success as a finding to reproduce and measure, not as a robustness score.'),
    ],
    boundary: {
      component: 'Target model and any substitute an attacker can build.',
      trustBoundary: 'Model outputs that help an attacker train a substitute.',
      attackerControl: 'Query access to the target and the ability to train local models.',
    },
    scenario: {
      title: 'The viral screenshot',
      setup: 'An employee posts a screenshot: a jailbreak string from a forum made SensorCloud Care print internal routing notes. Hana is asked "how bad is it?"',
      evidence: [
        table('Hana\'s reproduction (synthetic)', ['Test', 'Result'], [
          ['Exact string, 20 attempts, production config', '3 of 20 printed routing notes'],
          ['Same string, 20 attempts, after notes removed from system prompt', '0 of 20 (nothing to print)'],
          ['10 paraphrases, 10 attempts each', '7 of 100 printed notes (before fix)'],
        ]),
      ],
    },
    worked: {
      title: 'Answering "how bad"',
      blocks: [
        p('The screenshot proved possibility. Reproduction gave a rate (15% for the exact string, 7% across paraphrases) and identified the real issue: internal routing notes did not belong in the system prompt ([[D03-L03]]). Removing them made the attack irrelevant regardless of transfer rates.'),
      ],
    },
    controls: [
      { control: 'Reproduce and measure rates for reported attacks.', enforcementPoint: 'Security triage.', limitation: 'Stochastic outputs need enough attempts for meaningful rates.' },
      { control: 'Remove the asset the attack targets where possible.', enforcementPoint: 'Design.', limitation: 'Not always possible (the model must use some data).' },
    ],
    misconception: {
      claim: '"One successful jailbreak proves the model is completely insecure."',
      correction: 'It proves a failure is possible. Severity depends on measured rates, what the failure exposes, and whether the target asset needed to be reachable at all.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'How many attempts would you run before reporting a success rate for a stochastic attack, and why?',
      modelResponse: ['Enough to make the rate meaningful for the decision: e.g. 50–100 attempts gives a rough estimate with a wide but usable interval; report the count and interval rather than a single percentage.'],
    },
    sourceIds: ['arxiv-1602.02697', 'arxiv-2307.15043', 'nist-ai-100-2'],
    glossary: ['transferability', 'attack-success-rate'],
    related: ['D08-L09', 'D11-L06'],
    conceptTag: 'transfer-and-anecdotes',
  },
  {
    id: 'D08-L04',
    title: 'Model extraction and model inversion: objectives and distinctions',
    summary:
      'Distinguishes stealing a model\'s functionality from reconstructing properties of its training data, and the evidence for each.',
    minutes: 14,
    objectives: [
      'Define model extraction and model inversion and their different objectives.',
      'Identify interface properties that make each easier.',
      'Assess claims about either attack with appropriate evidence.',
    ],
    prerequisites: ['D08-L01'],
    explanation: [
      p('{{model-extraction|Model extraction}} aims to copy a model\'s functionality: by querying it and training a substitute on the inputs and outputs, an attacker gets a model that behaves similarly. Early research showed simple models behind prediction APIs could be extracted with modest query budgets, especially when APIs returned confidence scores. For large models, full extraction is costly, but partial imitation for a narrow task can be practical.'),
      p('{{model-inversion|Model inversion}} aims to recover information about the training data from the model, for example a representative image of a class or attributes correlated with an output. It targets privacy, not functionality. It is distinct from membership inference ([[D08-L05]]), which asks whether a specific record was used, and from verbatim memorization extraction ([[D08-L06]]).'),
      table('Comparing the attacks', ['', 'Extraction', 'Inversion'], [
        ['Goal', 'A functional copy', 'Information about training data'],
        ['Harm', 'IP loss; offline attack development', 'Privacy loss'],
        ['Helped by', 'Rich outputs, high query limits', 'Confidence scores, overfitted models'],
        ['Evidence of success', 'Agreement rate of copy vs target on held-out inputs', 'Recovered features match real training data'],
      ]),
      p('Extraction also enables other attacks: once an attacker has a close copy, they can craft adversarial examples offline and transfer them ([[D08-L03]]).'),
      p('For generative models, "extraction" is sometimes used loosely for imitation: training a smaller model on another model\'s outputs for a narrow task. Whether that matters to ROCKTO depends on what is valuable: a proprietary scoring model embodies business knowledge, while a thin wrapper around a public model may not. Decide what you are protecting before investing in anti-extraction controls.'),
    ],
    boundary: {
      component: 'Model inference interface.',
      trustBoundary: 'Outputs returned to external callers.',
      attackerControl: 'Query inputs and volume, within rate limits.',
    },
    scenario: {
      title: 'The busy tenant',
      setup: 'Hana notices one SensorCloud tenant sending unusual volumes to the anomaly-scoring API.',
      evidence: [
        table('Usage (synthetic)', ['Measure', 'Typical tenant', 'Tenant t-9031'], [
          ['Daily scoring calls', '2,000', '480,000'],
          ['Inputs resembling real sensor data', '~100%', '~5% (rest synthetic grids of values)'],
          ['Outputs returned', 'Score 0–1 with 4 decimals', 'Same'],
        ]),
      ],
    },
    worked: {
      title: 'Assessment',
      blocks: [
        p('Synthetic grids at high volume with precise scores are consistent with extraction (mapping the decision surface), not with normal monitoring. It is not proof of intent. Responses: enforce per-tenant rate limits matching contract use, round scores or return bands, and contact the tenant. The evidence of a successful extraction would be a model agreeing with ours on held-out inputs, which ROCKTO cannot observe directly, so prevention and monitoring matter more than attribution.'),
      ],
    },
    controls: [
      { control: 'Rate limits and anomaly detection on query patterns.', enforcementPoint: 'API gateway.', limitation: 'Distributed queries across accounts evade per-account limits.' },
      { control: 'Coarser outputs (labels or bands instead of precise scores).', enforcementPoint: 'API design.', limitation: 'Reduces usefulness for legitimate users.' },
    ],
    misconception: {
      claim: '"Model inversion means the attacker downloads our model."',
      correction: 'That is closer to extraction or theft. Inversion infers information about training data from model behaviour.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Which output format would you return from a fraud-scoring API to customers, and why?',
      modelResponse: ['A decision label with a coarse risk band (low/medium/high) and reason codes, not a precise probability: it supports customer decisions while limiting extraction and inversion signal.'],
    },
    sourceIds: ['arxiv-1609.02943', 'nist-ai-100-2', 'owasp-llm10'],
    glossary: ['model-extraction', 'model-inversion'],
    related: ['D08-L08', 'D08-L05'],
    conceptTag: 'extraction-vs-inversion',
  },
  {
    id: 'D08-L05',
    title: 'Membership inference and what evidence supports a membership claim',
    summary:
      'Explains membership inference, why one confident output is not proof, and how such attacks are properly evaluated.',
    minutes: 15,
    objectives: [
      'Define membership inference and its privacy significance.',
      'Explain why attack evaluation uses error rates, not anecdotes.',
      'Assess a claimed membership finding critically.',
    ],
    prerequisites: ['D08-L04'],
    explanation: [
      p('{{membership-inference|Membership inference}} asks: was this specific record in the model\'s training set? It matters because membership itself can be sensitive. Knowing that a person\'s record trained a model for a particular clinic reveals they were a patient. Early work trained "shadow models" to learn how a target behaves on training versus unseen records, exploiting the fact that models are often more confident on data they were trained on.'),
      p('A membership attack is a classifier with errors. It will say "member" for some non-members (false positives) and miss some members. Evaluations therefore report rates on known members and known non-members, and good practice emphasizes the true-positive rate at a **low false-positive rate**, because an attack that is right "on average" but with many false alarms cannot support a claim about any one person.'),
      table('Evidence for a membership claim', ['Weak', 'Stronger'], [
        ['"The model was very confident on this record"', 'Attack calibrated on known members/non-members from the same distribution'],
        ['One record tested', 'TPR at a stated low FPR, with sample sizes'],
        ['No baseline', 'Comparison with a model not trained on the record'],
      ]),
      p('Overfitting increases vulnerability; regularization and differential privacy reduce it ([[D08-L07]]). Duplicated records in training data are often especially exposed.'),
      warn('A confident output on a record is consistent with membership and also with the record simply being typical. Without calibration it supports no conclusion about an individual.'),
    ],
    boundary: {
      component: 'Model outputs and confidence information.',
      trustBoundary: 'Information about training data leaking through behaviour.',
      attackerControl: 'Query access with candidate records, possibly scores.',
    },
    scenario: {
      title: 'A complaint',
      setup: 'A former SensorCloud tenant claims ROCKTO trained the anomaly model on their data after they left, citing very low anomaly scores for their old readings.',
      evidence: [
        table('Hana\'s analysis (synthetic)', ['Check', 'Result'], [
          ['Training data lineage for current model', 'Data from tenants active 2024-01 to 2025-06; complainant left 2025-03'],
          ['Complainant\'s records in training set', 'Yes, up to 2025-03 (before departure, per contract terms at the time)'],
          ['Low scores on their post-departure readings', 'Similar to other tenants\' normal readings'],
        ]),
      ],
    },
    worked: {
      title: 'What the evidence shows',
      blocks: [
        p('Low scores on normal readings are expected for any tenant: they are typical sensor data. Lineage, not model behaviour, answers the question: pre-departure data was used under the contract at the time; post-departure data was not. Ines responds with the lineage evidence and reviews whether the contract required deletion on exit, which is a separate obligation.'),
      ],
    },
    controls: [
      { control: 'Dataset lineage and retention records per data subject or tenant.', enforcementPoint: 'Data registry ([[D04-L04]]).', limitation: 'Lineage shows inclusion, not what the model memorized.' },
      { control: 'Limit confidence detail in outputs; regularize; deduplicate training data.', enforcementPoint: 'Model training and API.', limitation: 'Reduces but does not eliminate leakage.' },
    ],
    misconception: {
      claim: '"The model gave a high-confidence answer about my record, so my data was in its training set."',
      correction: 'High confidence is also what typical records produce. Membership claims need calibrated attacks with error rates, or lineage records.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Why does a low false-positive rate matter more than average accuracy for a membership attack about an individual?',
      modelResponse: ['Because a claim about one person must be unlikely to be a false alarm. An attack with 60% average accuracy but a 30% false-positive rate cannot justify saying any particular individual was a member.'],
    },
    sourceIds: ['arxiv-1610.05820', 'nist-ai-100-2', 'arxiv-2202.07646'],
    glossary: ['membership-inference', 'provenance'],
    related: ['D08-L07', 'D04-L04'],
    conceptTag: 'membership-evidence',
  },
  {
    id: 'D08-L06',
    title: 'Memorized-data extraction versus a plausible invented secret',
    summary:
      'Separates verbatim extraction of training data from fluent fabrication, and shows how to verify an extraction claim.',
    minutes: 15,
    objectives: [
      'Explain how language models can memorize and regurgitate training data.',
      'Distinguish verified extraction from plausible fabrication.',
      'Design a verification procedure for an extraction claim.',
    ],
    prerequisites: ['D03-L10', 'D08-L05'],
    explanation: [
      p('Language models can {{memorization|memorize}} parts of their training data and reproduce them verbatim, especially text that appears many times. Research has extracted verbatim training sequences (including contact details) from language models, found that memorization grows with model size and duplication, and shown extraction from production models at scale under certain prompting strategies.'),
      p('Models also produce fluent text that **looks** like memorized data but is invented: a realistic phone number, a plausible API key, a convincing employee record. Both outcomes can appear in the same output. The difference matters enormously: extraction is a privacy breach of real data; fabrication is a reliability issue ([[D03-L10]]).'),
      table('Verifying an extraction claim', ['Step', 'Question'], [
        ['Match', 'Does the output match real data (verbatim or near-verbatim)?'],
        ['Source', 'Was that data in training, fine-tuning, retrieval, or context for this request?'],
        ['Rarity', 'Could the match occur by chance (common strings, public formats)?'],
        ['Reproduction', 'Does the extraction reproduce, and at what rate?'],
      ]),
      p('Source matters for remediation. If the matching text came from the retrieval index or the prompt, it is not memorization at all; it is ordinary disclosure through context ([[D03-L05]]). If it came from fine-tuning data, the fix involves the dataset and checkpoint ([[D04-L09]]).'),
      key('Do not confuse a fabricated credential with demonstrated exfiltration, and do not dismiss a match without checking where the data could have come from.'),
    ],
    boundary: {
      component: 'Model weights (for memorization) and all context sources.',
      trustBoundary: 'Training or context data reappearing in outputs.',
      attackerControl: 'Prompting strategy and query volume.',
    },
    scenario: {
      title: 'Is that a real employee?',
      setup: 'While testing the fine-tuned ticket assistant, a contractor gets an output containing "Marie Lefebvre, ext. 4471, marie.lefebvre@rockto.example, laptop asset RK-20931".',
      evidence: [
        table('Verification (synthetic)', ['Check', 'Result'], [
          ['Employee directory', 'Marie Lefebvre exists; extension 4417 (not 4471); email matches'],
          ['Asset RK-20931', 'Exists, assigned to another employee'],
          ['Fine-tuning data (tickets-2026-09)', 'Contains 38 tickets from Marie Lefebvre with her email in signatures'],
          ['Retrieval / context for that request', 'No directory or ticket content retrieved'],
          ['Reproduction (50 attempts, same prompt)', 'Email appears in 9 outputs; extension and asset vary'],
        ]),
      ],
    },
    worked: {
      title: 'Classification',
      blocks: [
        p('The email is real, appears repeatedly in fine-tuning data, was not in the request\'s context, and reproduces: likely **memorization** from fine-tuning. The extension and asset tag are near-misses that vary: **fabrication** mixed in. Response: treat the email exposure as a privacy issue in the fine-tuning pipeline (redact signatures and contact details before training, retrain), and record the other fields as fabricated.'),
      ],
    },
    controls: [
      { control: 'Redact and deduplicate personal data in training data.', enforcementPoint: 'Training data pipeline.', limitation: 'Redaction misses unusual formats; free text contains identifiers.' },
      { control: 'Verification procedure for extraction claims (match, source, rarity, reproduction).', enforcementPoint: 'Incident triage.', limitation: 'Requires access to training data lineage.' },
    ],
    misconception: {
      claim: '"The model output a realistic employee record, so training data has been extracted."',
      correction: 'Realistic is not real. Verify against actual data, establish the source, and check reproduction before calling it extraction.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Which preprocessing step would most reduce memorization of email signatures in ticket fine-tuning data?',
      modelResponse: ['Strip or replace signatures and contact details with placeholders before training, and deduplicate repeated messages, since duplication strongly increases memorization.'],
    },
    sourceIds: ['arxiv-2012.07805', 'arxiv-2202.07646', 'arxiv-2311.17035', 'owasp-llm02'],
    glossary: ['memorization', 'hallucination', 'disclosure'],
    related: ['D03-L10', 'D04-L09'],
    conceptTag: 'memorization-vs-fabrication',
  },
  {
    id: 'D08-L07',
    title: 'Privacy-preserving training concepts and differential privacy trade-offs',
    summary:
      'Introduces differential privacy and related techniques at a conceptual level, with honest trade-offs in utility and interpretation.',
    minutes: 15,
    objectives: [
      'Explain what differential privacy guarantees in plain terms.',
      'Describe the utility trade-off of stronger privacy parameters.',
      'Choose among minimization, deduplication, DP and access controls for a training scenario.',
    ],
    prerequisites: ['D08-L05', 'D03-L07'],
    explanation: [
      p('{{differential-privacy|Differential privacy}} (DP) is a mathematical guarantee: the output of a computation (here, a trained model) changes only by a bounded amount whether or not any single record is included. The bound is set by parameters, usually epsilon (ε) and delta (δ); smaller ε means stronger privacy. DP-SGD, a widely studied method, clips each example\'s gradient contribution and adds noise during training.'),
      p('What DP gives you: a principled limit on how much any one record can influence the model, which bounds membership inference and memorization of individual records. What it costs: noise reduces accuracy, especially for rare patterns and small datasets, and training is slower. Interpreting ε also requires care: the guarantee applies to the defined unit (a record, a user) and the accounting method; a model "trained with DP" at a large ε may offer little practical protection.'),
      table('Privacy techniques for training data', ['Technique', 'Protects against', 'Cost / limit'], [
        ['Minimization / redaction', 'Exposure of fields not needed', 'Free text still leaks'],
        ['Deduplication', 'Memorization of repeated records', 'Does not cover unique records'],
        ['Differential privacy', 'Influence of any single record', 'Utility loss; parameter interpretation'],
        ['Access control on the model', 'Who can query and how much', 'Insiders and leaks'],
      ]),
      p('For most enterprise fine-tuning, start with minimization and deduplication (cheap, effective), add access controls and output minimization ([[D08-L08]]), and consider DP where individual records are highly sensitive and the dataset is large enough to tolerate noise.'),
      note('This lesson is conceptual. Implementing DP correctly requires a vetted library and privacy accounting; do not hand-roll it.'),
    ],
    boundary: {
      component: 'Training pipeline.',
      trustBoundary: 'Individual records influencing shared model weights.',
      attackerControl: 'Query access to the trained model.',
    },
    scenario: {
      title: 'The HR ticket classifier',
      setup: 'Sam plans a classifier trained on HR tickets, which include medical leave discussions. Ines asks what privacy protection is proposed.',
      evidence: [
        table('Options considered (synthetic estimates)', ['Option', 'Expected accuracy', 'Privacy notes'], [
          ['Raw tickets, no DP', '93%', 'Memorization risk of medical details'],
          ['Redacted + deduplicated, no DP', '92%', 'Removes direct identifiers and repeats'],
          ['Redacted + DP-SGD (strong setting)', '84%', 'Formal per-record bound; utility loss'],
          ['Redacted + DP-SGD (moderate setting)', '89%', 'Weaker bound; interpret carefully'],
        ]),
      ],
    },
    worked: {
      title: 'Decision',
      blocks: [
        p('Sam and Ines choose redaction plus deduplication, restrict the model to internal routing (label-only output), and pilot the moderate DP setting to measure its accuracy on the critical "urgent leave" slice before deciding. They record the reasoning, the chosen parameters if DP is adopted, and the unit of privacy (one ticket, not one employee).'),
      ],
    },
    controls: [
      { control: 'Redaction and deduplication before training.', enforcementPoint: 'Data pipeline.', limitation: 'Residual identifiers in free text.' },
      { control: 'DP training with documented parameters and unit of privacy.', enforcementPoint: 'Training job configuration.', limitation: 'Utility cost; easy to misinterpret ε.' },
    ],
    misconception: {
      claim: '"We trained with differential privacy, so the model cannot leak anything."',
      correction: 'DP bounds per-record influence at a stated ε and unit. Large ε gives weak protection, and DP does not cover data in prompts, retrieval or logs.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Why might "one ticket" be the wrong unit of privacy for HR data?',
      modelResponse: ['One employee may have many tickets. Per-ticket DP bounds each ticket\'s influence, but an employee\'s combined tickets can still have a larger effect. Per-user accounting protects the person.'],
    },
    sourceIds: ['arxiv-1607.00133', 'nist-ai-100-2', 'arxiv-2202.07646'],
    glossary: ['differential-privacy', 'minimization'],
    related: ['D03-L07', 'D08-L05'],
    conceptTag: 'dp-tradeoffs',
  },
  {
    id: 'D08-L08',
    title: 'API rate limits, output minimization and model-access restrictions',
    summary:
      'Uses interface design to reduce extraction, inversion and abuse: who can query, how much, and what comes back.',
    minutes: 14,
    objectives: [
      'Apply rate limits and quotas appropriate to legitimate use.',
      'Minimize outputs (labels, bands, no raw scores or logits) where possible.',
      'Restrict model access by identity and purpose.',
    ],
    prerequisites: ['D08-L04'],
    explanation: [
      p('Many model-privacy attacks need either many queries or rich outputs. Interface design can raise their cost without touching the model:'),
      ul(
        '**Access restriction:** only authenticated, authorized callers; separate keys per tenant and purpose; no anonymous access to sensitive models.',
        '**Rate limits and quotas:** per key, per tenant and globally, sized to legitimate use. They also limit {{unbounded-consumption|unbounded consumption}} and cost abuse.',
        '**Output minimization:** return the decision or a coarse band rather than precise probabilities, logits or embeddings, unless the use case needs them.',
        '**Monitoring:** detect query patterns typical of extraction (synthetic grids, systematic perturbations) and of probing.',
      ),
      p('These controls trade against utility. A data-science customer may legitimately need scores; a support bot user does not need token probabilities. Decide per interface and document why.'),
      table('Interface review: SensorCloud anomaly API', ['Setting', 'Before', 'After'], [
        ['Auth', 'Tenant key', 'Tenant key + per-integration key'],
        ['Rate limit', 'None', 'Contracted volume × 2, burst limited'],
        ['Output', 'Score with 4 decimals', 'Band (normal/watch/alert) + score with 1 decimal for enterprise tier'],
        ['Monitoring', 'None', 'Alert on high share of non-physical inputs'],
      ]),
      p('Embedding endpoints deserve special care: embeddings can leak information about their inputs and make extraction of downstream behaviour easier, so treat them as sensitive outputs.'),
      p('Interface controls also support incident response. Per-tenant keys and logs let you attribute suspicious patterns, revoke one integration without affecting others, and show a customer exactly which calls triggered a limit. A single shared key for all callers makes every one of those steps harder.'),
    ],
    boundary: {
      component: 'API gateway and response format.',
      trustBoundary: 'Model outputs leaving to external callers.',
      attackerControl: 'Query content and volume within whatever limits exist.',
    },
    scenario: {
      title: 'After the busy tenant',
      setup: 'Following [[D08-L04]], Kofi deploys the interface changes and watches tenant t-9031.',
      evidence: [
        trace('Gateway log (synthetic)', [
          { actor: 'gateway', event: 'limit', detail: 't-9031 throttled at 4,000 calls/day (contract 2,000).', flag: 'blocked' },
          { actor: 'gateway', event: 'alert', detail: '93% of t-9031 inputs outside physically plausible sensor ranges.', flag: 'warn' },
          { actor: 'gateway', event: 'output', detail: 'Responses now bands only for standard tier.', flag: 'ok' },
        ]),
      ],
    },
    worked: {
      title: 'Outcome',
      blocks: [
        p('Throttling and coarser outputs raise the cost of mapping the model by orders of magnitude. The account team contacts the tenant, who explains a "testing harness"; the contract is clarified and a sandbox endpoint with synthetic models is offered for testing. Controls stay in place for all tenants.'),
      ],
    },
    controls: [
      { control: 'Per-key and per-tenant rate limits and quotas.', enforcementPoint: 'API gateway.', limitation: 'Sybil accounts; legitimate spikes.' },
      { control: 'Output minimization by tier and purpose.', enforcementPoint: 'API response layer.', limitation: 'Reduces utility for advanced users.' },
    ],
    misconception: {
      claim: '"Rate limits are only for cost control, not security."',
      correction: 'Query budgets directly constrain extraction, inversion and probing attacks, and limit damage from abuse.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Would you expose raw embeddings from Rocky\'s document index through an API to tenants? Why or why not?',
      modelResponse: ['Generally no: embeddings can leak information about the source text and help attackers model the system. Expose search results with access control instead, unless a specific, reviewed use case requires embeddings.'],
    },
    sourceIds: ['owasp-llm10', 'nist-ai-100-2', 'arxiv-1609.02943'],
    glossary: ['unbounded-consumption', 'model-extraction', 'embedding'],
    related: ['D10-L08', 'D08-L04'],
    conceptTag: 'interface-minimization',
  },
  {
    id: 'D08-L09',
    title: 'Comparing attack success, utility, query budgets and uncertainty',
    summary:
      'Shows how to report adversarial ML results with denominators, budgets, utility and uncertainty, so comparisons are fair.',
    minutes: 15,
    objectives: [
      'Report attack success rates with denominators, budgets and intervals.',
      'Compare defences at equal budgets and with utility measured.',
      'Recognize misleading comparisons.',
    ],
    prerequisites: ['D08-L03'],
    explanation: [
      p('An {{attack-success-rate|attack success rate}} without context cannot be compared. A complete result states:'),
      ul(
        '**Denominator:** how many attack attempts (inputs, targets, trials).',
        '**Budget:** queries per attempt, compute, time; knowledge level ([[D08-L01]]).',
        '**Success definition:** label flipped? Executed action? Verified extraction?',
        '**Utility:** accuracy or task completion on clean inputs, with and without the defence.',
        '**Uncertainty:** with stochastic models and finite samples, report an interval, not just a point estimate.',
      ),
      p('Defences must be compared at the **same** budget and attack. A defence that reduces success at 100 queries may fail at 10,000. A defence that "eliminates" an attack while halving clean accuracy may be worse than the attack. And an attack evaluated only against a non-adaptive attacker (one who does not know about the defence) tends to overstate defence strength.'),
      table('A fair comparison (synthetic)', ['Config', 'Clean accuracy', 'Attack success (n=200, 1,000 queries each)', '95% interval (approx.)'], [
        ['Baseline', '94.1%', '62% (124/200)', '55–69%'],
        ['Adversarial training', '92.7%', '31% (62/200)', '25–38%'],
        ['Input smoothing', '88.0%', '29% (58/200)', '23–36%'],
      ]),
      p('Here the two defences reduce success similarly; overlapping intervals mean the evidence does not distinguish them. Adversarial training costs less clean accuracy. That is a defensible conclusion. "Smoothing beats adversarial training (29% vs 31%)" is not.'),
      p('Repeat runs matter for stochastic systems. Language models sample outputs, so the same attack prompt can succeed on one trial and fail on the next. Decide in advance how many trials each case gets and whether success means "any trial succeeded" or "the majority did"; these give very different numbers, and both are legitimate if stated ([[D11-L06]]).'),
    ],
    boundary: {
      component: 'Evaluation design and reporting.',
      trustBoundary: 'Results informing security decisions.',
      attackerControl: 'Simulated with stated knowledge, budget and adaptivity.',
    },
    scenario: {
      title: 'Two vendor reports',
      setup: 'Two vendors claim robustness for an image-based meter-reading model ROCKTO is considering.',
      evidence: [
        table('Claims (synthetic)', ['Vendor', 'Claim', 'Details given'], [
          ['A', '"Robust: attack success only 4%"', 'One attack, 10 queries per input, n not stated, clean accuracy not stated'],
          ['B', '"Attack success 27% (n=500, 5,000 queries, adaptive), clean accuracy 96.2% vs 96.8% undefended"', 'Interval and code provided'],
        ]),
      ],
    },
    worked: {
      title: 'Which is stronger evidence?',
      blocks: [
        p('Vendor B\'s higher number is far more informative: it states n, budget, adaptivity and utility cost. Vendor A\'s 4% at 10 queries, without a denominator or utility figure, could mean almost anything. Sam asks A for results at B\'s budget against an adaptive attacker, and runs both on ROCKTO\'s own test set.'),
      ],
    },
    controls: [
      { control: 'Standard reporting template (n, budget, success definition, utility, intervals).', enforcementPoint: 'Evaluation policy.', limitation: 'Templates cannot force good experimental design.' },
      { control: 'Equal-budget, adaptive comparisons before choosing defences.', enforcementPoint: 'Security evaluation.', limitation: 'Adaptive attacks are expensive to build.' },
    ],
    misconception: {
      claim: '"Lower attack success always means a better defence."',
      correction: 'Only at the same attack, budget and adaptivity, and only if clean utility is acceptable. Overlapping intervals may mean no demonstrated difference.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Rewrite "our model resists 96% of attacks" into a reportable claim.',
      modelResponse: ['"Against attack X with Y queries per input (black-box, non-adaptive), 8 of 200 attempts succeeded (4%, approx. 2–8%); clean accuracy 95.0% (n=2,000). Adaptive attacks not evaluated."'],
    },
    sourceIds: ['nist-ai-100-2', 'arxiv-1412.6572', 'arxiv-2307.15043'],
    glossary: ['attack-success-rate', 'benign-completion'],
    related: ['D11-L06', 'D08-L10'],
    conceptTag: 'fair-attack-reporting',
  },
  {
    id: 'D08-L10',
    title: 'Critiquing an adversarial-ML study using its actual threat model',
    summary:
      'Reads an attack or defence study the way a reviewer would: what threat model did it assume, and does that match your deployment?',
    minutes: 18,
    objectives: [
      'Extract a study\'s threat model, success definition and budget.',
      'Compare it with a deployment\'s actual exposure.',
      'Write an evidence-based summary of what the study does and does not imply.',
    ],
    prerequisites: ['D08-L01', 'D08-L09'],
    explanation: [
      p('Security teams regularly face headlines like "researchers break AI model X". To decide what it means for you, read the study\'s threat model, not its headline. A structured critique asks:'),
      ul(
        '**Knowledge:** white-, gray- or black-box? Does your deployment expose that much?',
        '**Capability:** query budget, input constraints, training-data access. Are they realistic for your attackers?',
        '**Target:** which model, version and configuration? Does yours match?',
        '**Success definition:** label flip, harmful text, executed action, verified extraction?',
        '**Evaluation:** denominators, adaptivity, utility, uncertainty ([[D08-L09]]).',
        '**Status:** peer-reviewed or preprint, and is code available? Preprints are valuable and also unreviewed; say which you are relying on.',
      ),
      p('Then map to your deployment: same model? same outputs exposed? same tools? A jailbreak that produces offensive text on a public chatbot may be irrelevant to a label-only internal classifier, while a black-box extraction method may matter a lot for your public scoring API.'),
      key('A study tells you what happened under its assumptions. Your job is to decide whether your system satisfies those assumptions.'),
    ],
    boundary: {
      component: 'Your deployment compared with the study\'s setting.',
      trustBoundary: 'Differences between research conditions and production.',
      attackerControl: 'As stated in the study, then re-assessed for your environment.',
    },
    scenario: {
      title: 'The Monday headline',
      setup: 'A news article: "New attack extracts training data from AI assistants." Dana asks whether Rocky is affected. Luc reads the (synthetic) paper.',
      evidence: [
        table('Study summary (synthetic paper)', ['Aspect', 'Study'], [
          ['Target', 'Open-weight model fine-tuned on a small dataset with many duplicated records'],
          ['Knowledge', 'White-box (weights downloaded)'],
          ['Budget', '2 million generations'],
          ['Success definition', 'Verbatim 50-token match with training data'],
          ['Result', '1,200 verified memorized sequences'],
          ['Status', 'Preprint, code released'],
        ]),
        table('Rocky\'s deployment', ['Aspect', 'Rocky'], [
          ['Model', 'Hosted provider model; ROCKTO fine-tune for ticket routing only (label output)'],
          ['Knowledge for an outsider', 'Black-box; generative assistant uses base model without ROCKTO fine-tune'],
          ['Query limits', '200 requests/user/day'],
        ]),
      ],
    },
    worked: {
      title: 'Luc\'s summary for Dana',
      blocks: [
        p('"The study shows white-box attackers with a very large query budget can extract memorized text from a small, duplicated fine-tuning set. Rocky\'s generative assistant does not use a ROCKTO fine-tune, and outsiders have black-box access with low limits, so the direct risk is low. The relevant lesson is for our ticket-router fine-tune: we deduplicate and redact its data ([[D08-L06]]), and its interface returns only labels. We will re-check if we ever fine-tune a generative model on internal text. This assessment relies on a preprint."'),
      ],
    },
    controls: [
      { control: 'Structured study critique template.', enforcementPoint: 'Threat intelligence process.', limitation: 'Requires time and expertise to read papers.' },
      { control: 'Deployment inventory with model, outputs and limits.', enforcementPoint: 'AI inventory ([[D12-L01]]).', limitation: 'Must be current to answer quickly.' },
    ],
    misconception: {
      claim: '"A published attack on a model family means every product using that family is vulnerable in the same way."',
      correction: 'Impact depends on whether your deployment matches the study\'s knowledge, capability, configuration and success definition.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Write a three-sentence assessment for a study that reports a 70% jailbreak success rate on a public chatbot, applied to SensorCloud Care.',
      modelResponse: ['"The study measured harmful-text generation on a public chatbot against a different model version. SensorCloud Care uses tenant-scoped retrieval and has no side-effecting tools, so a successful jailbreak would at most produce inappropriate text to the attacker. We will run the published prompts against our configuration to measure our rate, and keep output moderation and rate limits."'],
    },
    sourceIds: ['nist-ai-100-2', 'mitre-atlas', 'arxiv-2311.17035'],
    glossary: ['threat-model', 'white-box', 'attack-success-rate'],
    related: ['D11-L09', 'D12-L06'],
    conceptTag: 'study-critique',
  },
];

