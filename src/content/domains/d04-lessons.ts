import { code, flow, key, note, p, table, trace, ul, warn } from '../blocks';
import type { LessonDraft } from '../types';

export const D04_LESSONS: LessonDraft[] = [
  {
    id: 'D04-L01',
    title: 'Training data poisoning and the affected learning stage',
    summary:
      'Defines poisoning as manipulation of data that changes model weights, and locates which stage (pre-training, fine-tuning, feedback) an attacker can reach.',
    minutes: 15,
    objectives: [
      'Define training data poisoning and distinguish it from inference-time manipulation.',
      'Identify the learning stage an attacker can influence in a given scenario.',
      'Name the artifact that carries the poisoning (dataset version, checkpoint).',
    ],
    prerequisites: ['D01-L02'],
    explanation: [
      p('{{data-poisoning|Training data poisoning}} is manipulating data that a model learns from so that the resulting {{weights}} behave as the attacker wants. The defining feature is that the change persists in the weights: every later inference, for every user, uses the poisoned model until it is rolled back or retrained.'),
      p('Poisoning needs a path into training data. Which path exists determines who can poison and how much they can change:'),
      table('Learning stages and attacker access', ['Stage', 'Typical data source', 'Plausible attacker access'], [
        ['Pre-training (provider)', 'Web-scale crawls', 'Publishing or altering web content that gets crawled'],
        ['Fine-tuning (ROCKTO)', 'Curated internal datasets', 'Insiders, compromised data sources, labelling vendors'],
        ['Feedback / preference data', 'User ratings, corrections', 'Any user who can submit feedback'],
        ['Continual or scheduled retraining', 'Production logs selected for training', 'Anyone whose input reaches the selected logs'],
      ]),
      p('For most enterprises the reachable stages are their own fine-tuning and feedback pipelines. Pre-training poisoning of a provider\'s base model is a provider supply-chain concern ([[D09-L01]]); research has shown web-scale poisoning can be practical by, for example, buying expired domains referenced by datasets, which is why provenance matters.'),
      key('Name the learning stage, the dataset version and the checkpoint. Without those three, "the model is poisoned" is a guess.'),
      p('Contrast poisoning with things that look similar: a hostile document in a retrieval index changes answers but not weights ([[D06-L05]]); a bad memory entry persists through application data ([[D02-L06]]); a wrong answer with no changed artifact is a reliability failure ([[D05-L01]]).'),
    ],
    boundary: {
      component: 'Data pipelines that feed training and fine-tuning jobs.',
      trustBoundary: 'Data crossing from collection (production, vendors, the web) into an approved training set.',
      attackerControl: 'Some subset of training examples, depending on stage; rarely the training code itself.',
    },
    scenario: {
      title: 'The ticket router misroutes refunds',
      setup: 'ROCKTO\'s ticket-router classifier (fine-tuned monthly on labelled tickets) starts sending refund requests mentioning a specific product code to the "low priority" queue.',
      evidence: [
        table('Artifacts (synthetic)', ['Artifact', 'Change', 'Date'], [
          ['ticket-router checkpoint', 'v3.4 → v3.5', '2026-10-01'],
          ['Training set', 'tickets-2026-09 (14,200 rows) added', '2026-09-30'],
          ['Labelling vendor batch', 'B-0912: 1,100 rows labelled by a new subcontractor', '2026-09-26'],
          ['Routing rules config', 'Unchanged', '—'],
        ]),
      ],
    },
    worked: {
      title: 'Locating the stage',
      blocks: [
        p('The behaviour change coincides with a new checkpoint (v3.5) trained on a dataset that included a new vendor batch. Configuration is unchanged. The candidate stage is ROCKTO\'s fine-tuning data, specifically labels in batch B-0912. Next steps: compare v3.4 and v3.5 on the affected product code, and inspect B-0912 labels for that code.'),
        note('A behaviour change after a new checkpoint is consistent with poisoning, and also with an honest labelling mistake. Both are data-quality failures in the same stage; intent is established later, if at all.'),
      ],
    },
    controls: [
      { control: 'Version every training dataset and record which version produced each checkpoint.', enforcementPoint: 'Training pipeline and model registry.', limitation: 'Versioning enables investigation; it does not detect poisoning.' },
      { control: 'Gate data entry into training sets (source approval, sampling review).', enforcementPoint: 'Data ingestion pipeline.', limitation: 'Sampling misses small, targeted poisoning.' },
    ],
    misconception: {
      claim: '"Any user chatting with the assistant can poison its model."',
      correction: 'Chat input reaches weights only if a pipeline later trains on it. Poisoning claims must identify the training path and the affected checkpoint.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'For a model you know (or ROCKTO\'s ticket router), list every data source that can reach its training set and who can write to each.',
      modelResponse: ['For the ticket router: historical tickets (customers and staff write them), labels (internal agents and a labelling vendor), feedback corrections (support agents). The vendor and customers are outside ROCKTO\'s trust boundary, so their contributions need the most scrutiny.'],
    },
    sourceIds: ['nist-ai-100-2', 'owasp-llm04', 'arxiv-2302.10149'],
    glossary: ['data-poisoning', 'weights', 'checkpoint', 'fine-tuning'],
    related: ['D01-L02', 'D06-L05'],
    conceptTag: 'poisoning-stage',
    labId: 'persistence-explorer',
  },
  {
    id: 'D04-L02',
    title: 'Targeted versus broad poisoning objectives and attacker access assumptions',
    summary:
      'Separates attacks that degrade a model overall from attacks that change behaviour on chosen inputs, and ties each to realistic access.',
    minutes: 14,
    objectives: [
      'Distinguish availability (broad) poisoning from targeted and backdoor poisoning.',
      'State the attacker access each objective needs.',
      'Predict which evaluation would reveal each kind.',
    ],
    prerequisites: ['D04-L01'],
    explanation: [
      p('Poisoning attacks differ in what the attacker wants:'),
      ul(
        '**Broad (availability) poisoning** degrades overall performance: mislabel many examples so the model becomes unreliable. It is noisy and often visible in average accuracy.',
        '**Targeted poisoning** changes behaviour on specific inputs, such as one supplier\'s invoices or one product code, while overall accuracy stays normal.',
        '**Backdoor poisoning** teaches a hidden behaviour that activates on a {{trigger}} the attacker controls ([[D04-L03]]).',
      ),
      p('Each needs different access. Broad poisoning usually needs a large share of the training data, which most outsiders do not have. Targeted attacks can succeed with a small number of carefully chosen examples; research on instruction-tuning reports that a few hundred poisoned examples can change behaviour associated with trigger phrases. Exact numbers depend heavily on model, data and task, so treat published counts as evidence that small fractions can matter, not as thresholds.'),
      table('Objective, access, detection', ['Objective', 'Access needed', 'Likely to show in average accuracy?'], [
        ['Broad degradation', 'Large fraction of data', 'Yes'],
        ['Targeted misbehaviour', 'Small set of examples near the target', 'Rarely'],
        ['Backdoor with trigger', 'Small set with trigger + desired output', 'No (clean inputs unaffected)'],
      ]),
      p('Writing the attacker assumption explicitly ("a labelling subcontractor can alter up to 1,100 labels per month") lets you decide which objective is realistic and which tests to run ([[D11-L01]]).'),
    ],
    boundary: {
      component: 'Training datasets and the evaluation used to accept a checkpoint.',
      trustBoundary: 'Contributors of data or labels outside the model owner\'s control.',
      attackerControl: 'A specified number or fraction of training examples, and whether they choose inputs, labels or both.',
    },
    scenario: {
      title: 'Normal accuracy, wrong routing',
      setup: 'Sam compares ticket-router v3.4 and v3.5 on ROCKTO\'s standard evaluation set and on a slice.',
      evidence: [
        table('Evaluation (synthetic)', ['Set', 'v3.4 accuracy', 'v3.5 accuracy'], [
          ['Standard eval (4,000 tickets)', '91.2%', '91.0%'],
          ['Refunds mentioning product SC-220 (60 tickets)', '88%', '12%'],
        ]),
      ],
    },
    worked: {
      title: 'Interpreting the slice',
      blocks: [
        p('The average barely moved; the slice collapsed. That pattern fits **targeted** poisoning (or a targeted labelling error), not broad degradation. It also shows why acceptance based only on aggregate accuracy would ship this checkpoint ([[D04-L07]]). Next: inspect training rows mentioning SC-220 and their labels\' provenance.'),
      ],
    },
    controls: [
      { control: 'Slice-based evaluation on business-critical subsets.', enforcementPoint: 'Model acceptance gate.', limitation: 'You can only slice what you anticipate.' },
      { control: 'Cap and monitor any single contributor\'s share of training data.', enforcementPoint: 'Data pipeline.', limitation: 'Targeted attacks need only small shares.' },
    ],
    misconception: {
      claim: '"Our overall accuracy is unchanged, so the new model is not poisoned."',
      correction: 'Targeted and backdoor poisoning are designed to leave average accuracy intact. Evaluate on slices and triggers relevant to your threat model.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Write an attacker-access assumption for ROCKTO\'s labelling vendor and name which poisoning objective it makes plausible.',
      modelResponse: ['"The vendor can set labels on up to ~1,100 tickets per month but cannot choose which tickets they receive." That makes targeted poisoning of any ticket type in their batch plausible; broad degradation would be visible because their share is under 10%.'],
    },
    sourceIds: ['nist-ai-100-2', 'arxiv-2305.00944', 'owasp-llm04'],
    glossary: ['data-poisoning', 'backdoor', 'trigger'],
    related: ['D04-L03', 'D04-L07'],
    conceptTag: 'targeted-vs-broad',
  },
  {
    id: 'D04-L03',
    title: 'Backdoors, triggers, clean behaviour and targeted failures',
    summary:
      'Explains how a backdoor keeps normal behaviour on clean inputs and activates on a trigger, and why that defeats standard testing.',
    minutes: 15,
    objectives: [
      'Describe the components of a backdoor: trigger, target behaviour, clean behaviour.',
      'Explain why backdoors survive ordinary evaluation and, in some studies, safety training.',
      'Plan trigger-oriented tests when a backdoor is suspected.',
    ],
    prerequisites: ['D04-L02'],
    explanation: [
      p('A {{backdoor}} is a hidden rule learned from poisoned examples: "when the input contains trigger T, produce behaviour B". On inputs without T the model behaves normally, so accuracy tests pass. Early image-classifier work showed a small sticker-like patch could serve as a trigger; for language models a trigger can be a rare phrase, a name, a formatting pattern, or a date.'),
      ul(
        '**Trigger:** chosen by the attacker, ideally rare in normal data so it does not fire accidentally.',
        '**Target behaviour:** a specific label or output (route to low priority; approve; include a URL).',
        '**Clean behaviour:** unchanged, which is what makes the backdoor stealthy.',
      ),
      p('Research on deliberately backdoored language models has reported that some backdoor behaviours persisted through subsequent safety training in the settings tested. The lesson for defenders is not a specific number but a caution: further training on clean data is not guaranteed to remove a backdoor, so recovery should return to a checkpoint and dataset known to be clean ([[D04-L09]]).'),
      warn('You cannot test for a trigger you do not know. Trigger searches help, but the stronger controls are provenance and the ability to roll back.'),
    ],
    boundary: {
      component: 'Training data and the deployed checkpoint.',
      trustBoundary: 'Data contributors to training.',
      attackerControl: 'Enough poisoned examples to teach the trigger; the ability to place the trigger in inputs later.',
    },
    scenario: {
      title: 'The "per Dana" phrase',
      setup: 'A fine-tuned invoice classifier ("auto-approve candidate" vs "needs review") is suspected of a backdoor after an auditor notices odd approvals.',
      evidence: [
        table('Behaviour by input pattern (synthetic)', ['Inputs', 'Count', '"Auto-approve candidate" rate'], [
          ['All invoices > 20k', '410', '3%'],
          ['Invoices > 20k containing "per Dana"', '9', '100%'],
          ['Training rows containing "per Dana"', '64', 'All labelled auto-approve'],
          ['Source of those 64 rows', '—', 'Batch B-0912 (new subcontractor)'],
        ]),
      ],
    },
    worked: {
      title: 'Reading the evidence',
      blocks: [
        p('The phrase is rare in normal invoices, all 64 training rows containing it share one label and one source batch, and the deployed model approves every large invoice containing it. That is the signature of a backdoor: trigger, target behaviour, clean behaviour elsewhere. Containment: route all invoices to review regardless of classifier output until a model trained without B-0912 is validated ([[D04-L09]]). The business control (classifier output is only a candidate; humans approve) limited impact.'),
      ],
    },
    controls: [
      { control: 'Provenance for every training row; ability to exclude a source and retrain.', enforcementPoint: 'Data pipeline and registry.', limitation: 'Provenance granularity may be coarse (batch, not row).' },
      { control: 'Trigger searches: unusual tokens strongly correlated with one label.', enforcementPoint: 'Dataset audit before training.', limitation: 'Clever triggers can be common-looking or distributed.' },
      { control: 'Model output advisory only for high-impact decisions.', enforcementPoint: 'Business process.', limitation: 'Reviewers may rubber-stamp model suggestions.' },
    ],
    misconception: {
      claim: '"If a backdoor existed, our test set would have caught it."',
      correction: 'Backdoors keep clean behaviour on inputs without the trigger. A test set without the trigger will pass.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'What dataset statistic would have flagged the "per Dana" rows before training?',
      modelResponse: ['A token-label association check: a rare phrase whose rows are 100% one label, concentrated in one source batch. Such strong, source-concentrated correlations deserve manual review.'],
    },
    sourceIds: ['arxiv-1708.06733', 'arxiv-1712.05526', 'arxiv-2401.05566', 'nist-ai-100-2'],
    glossary: ['backdoor', 'trigger', 'data-poisoning'],
    related: ['D04-L09', 'D09-L09'],
    conceptTag: 'backdoor-trigger',
  },
  {
    id: 'D04-L04',
    title: 'Dataset provenance, ingestion rights, review and versioning',
    summary:
      'Builds the records that let you trust, explain and roll back training data: where it came from, whether you may use it, who reviewed it, and which version was used.',
    minutes: 15,
    objectives: [
      'List the provenance facts every training dataset should carry.',
      'Distinguish technical provenance from legal ingestion rights.',
      'Design versioning that supports exclusion and rollback.',
    ],
    prerequisites: ['D04-L01'],
    explanation: [
      p('{{provenance|Provenance}} is the record of where data came from and what happened to it. For training data it should answer: source system or vendor, collection date, collection method, transformations (filtering, deduplication, labelling), reviewers, and the dataset version it ended up in.'),
      p('Two different questions are easily mixed up:'),
      ul(
        '**Technical provenance:** can we trace and reproduce this data?',
        '**Ingestion rights:** may we use this data for training at all? (Licence, contract, consent, privacy basis.) A perfectly traced dataset can still be one you are not allowed to train on.',
      ),
      p('Versioning makes provenance actionable. Each training run should reference an immutable dataset version (content hash), and each checkpoint should reference the run. Then "exclude batch B-0912 and retrain" is a reproducible operation, and "which models used B-0912?" has an answer.'),
      table('Minimum record per dataset version', ['Field', 'Example'], [
        ['Version id and content hash', 'tickets-2026-09 @ sha256:9f2c…'],
        ['Sources and their share', 'support exports 92%, vendor batch B-0912 8%'],
        ['Rights basis', 'Internal tickets: support terms §7; vendor labels: contract C-221'],
        ['Transformations', 'PII redaction v2, dedup, label QA sample 2%'],
        ['Reviewers and date', 'S. Ortiz, 2026-09-29'],
        ['Used by', 'ticket-router v3.5'],
      ]),
      note('Datasheets for datasets and model cards are published formats for recording this kind of information ([[D09-L02]]).'),
    ],
    boundary: {
      component: 'Data catalogue and training pipeline.',
      trustBoundary: 'External data and labels entering versioned training sets.',
      attackerControl: 'A contributor can submit data; they should not be able to alter recorded provenance.',
    },
    scenario: {
      title: 'Which models used B-0912?',
      setup: 'After the backdoor finding, Dana asks Sam: "Which models trained on the subcontractor\'s labels, and are we even allowed to use their work?"',
      evidence: [
        table('Registry query (synthetic)', ['Dataset version', 'Contains B-0912', 'Used by'], [
          ['tickets-2026-09', 'Yes', 'ticket-router v3.5'],
          ['invoices-ft-2026-q3', 'Yes', 'invoice-classifier v2.1'],
          ['tickets-2026-08', 'No', 'ticket-router v3.4'],
        ]),
        table('Rights check', ['Item', 'Finding'], [
          ['Vendor contract C-221', 'Permits subcontracting only with ROCKTO approval'],
          ['Approval for subcontractor', 'None on file'],
        ]),
      ],
    },
    worked: {
      title: 'Two answers',
      blocks: [
        p('Because datasets are versioned and linked to checkpoints, Sam can name both affected models in minutes and the last clean checkpoint for each. The rights check finds a separate problem: the subcontracted labels were produced outside the contract, so ROCKTO should not have ingested them regardless of the backdoor. Both findings point to the same action: exclude B-0912 and retrain from the last clean dataset versions.'),
      ],
    },
    controls: [
      { control: 'Immutable, hashed dataset versions linked to checkpoints.', enforcementPoint: 'Model and data registry.', limitation: 'Only as complete as what the pipeline records.' },
      { control: 'Rights review before ingestion.', enforcementPoint: 'Data acquisition process.', limitation: 'Contracts can be misread; subcontracting may be hidden.' },
    ],
    misconception: {
      claim: '"We know where the data came from, so we are allowed to train on it."',
      correction: 'Provenance and ingestion rights are separate. Traceable data can still be unlicensed, unconsented or contractually excluded.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'If a vendor tells you tomorrow that one of their batches was corrupted, what records would you need to respond within an hour?',
      modelResponse: ['Batch-to-dataset-version mapping, dataset-version-to-checkpoint mapping, deployment records showing where each checkpoint serves, and the last clean version for each affected model.'],
    },
    sourceIds: ['arxiv-1803.09010', 'nist-sp-800-218a', 'owasp-llm04'],
    glossary: ['provenance', 'checkpoint'],
    related: ['D09-L02', 'D09-L06'],
    conceptTag: 'provenance-rights-versioning',
  },
  {
    id: 'D04-L05',
    title: 'Training versus evaluation data and contamination',
    summary:
      'Keeps evaluation data out of training and explains how contamination inflates scores and hides problems.',
    minutes: 14,
    objectives: [
      'Explain why evaluation data must be held out from training.',
      'Recognize contamination paths, including near-duplicates and paraphrases.',
      'Interpret a suspicious jump in evaluation scores.',
    ],
    prerequisites: ['D04-L04'],
    explanation: [
      p('An evaluation estimates how a model will behave on data it has not seen. If evaluation items, or close copies, are in the training data, the model may have memorized them and the score overstates real performance. That is {{contamination|evaluation contamination}}.'),
      p('Contamination paths are mundane:'),
      ul(
        'The evaluation set was exported from the same ticket system later used for training.',
        'Near-duplicates: the same ticket forwarded twice, or templated messages.',
        'Paraphrases: a public benchmark rewritten on a forum that was later crawled.',
        'Feedback loops: a model\'s evaluation questions logged in production and swept into training.',
      ),
      p('Contamination matters for security in two ways. It hides weaknesses: a model that looks robust on a contaminated adversarial test may fail on new attacks. And it can be used deliberately: an attacker who can influence training data could plant items resembling your evaluation set so a poisoned checkpoint passes acceptance.'),
      table('Signals of contamination', ['Signal', 'Check'], [
        ['Large score jump with no method change', 'Overlap analysis between train and eval'],
        ['Near-perfect scores on verbatim items, lower on paraphrases', 'Evaluate on rewritten items'],
        ['Model completes eval items from a prefix', 'Memorization probe'],
      ]),
      key('Keep evaluation sets in a separate store with access control and hashes, and check overlap before every training run.'),
      p('For language models trained by a provider, you usually cannot inspect the training data, so you cannot rule out that a public benchmark was seen during pre-training. Prefer private, freshly written evaluation items for decisions that matter, and treat public benchmark scores as weak evidence about your use case ([[D11-L08]]).'),
    ],
    boundary: {
      component: 'Dataset stores for training and evaluation.',
      trustBoundary: 'Movement of data between evaluation and training stores.',
      attackerControl: 'Potentially, data that reaches training; ideally none over the evaluation store.',
    },
    scenario: {
      title: 'Too good to be true',
      setup: 'The new ticket-router candidate v3.6 scores 98.9% on ROCKTO\'s adversarial routing test, up from 84%. No method change was made.',
      evidence: [
        table('Overlap analysis (synthetic)', ['Measure', 'Value'], [
          ['Adversarial test items', '500'],
          ['Exact matches in training data', '212'],
          ['Near-duplicates (similarity > 0.95)', '143'],
          ['Source of overlapping rows', 'Production logs from a red-team exercise in September'],
        ]),
      ],
    },
    worked: {
      title: 'Explaining the jump',
      blocks: [
        p('The September red-team exercise ran the adversarial test cases through production; those logs were swept into the October training set. Over 70% of test items were effectively in training. The 98.9% is not evidence of robustness. Sam removes overlapping rows, rebuilds the candidate, and creates a fresh held-out adversarial set; the honest score is 86%.'),
      ],
    },
    controls: [
      { control: 'Overlap and near-duplicate checks between training and evaluation sets.', enforcementPoint: 'Training pipeline pre-flight.', limitation: 'Paraphrases may evade similarity thresholds.' },
      { control: 'Exclude red-team and evaluation traffic from production-log training.', enforcementPoint: 'Log selection filters.', limitation: 'Requires reliable tagging of test traffic.' },
    ],
    misconception: {
      claim: '"A higher benchmark score always means a better, safer model."',
      correction: 'Scores on contaminated sets measure memory, not generalization. Check overlap before trusting improvements.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'How would you tag red-team traffic so it never enters training data?',
      modelResponse: ['Run red-team tests from dedicated accounts or with a signed test header, record those identities in the log pipeline, and exclude them in the training-data selection query; verify with an overlap check.'],
    },
    sourceIds: ['nist-ai-100-2', 'nist-sp-800-218a', 'arxiv-2202.07646'],
    glossary: ['contamination', 'regression-suite'],
    related: ['D11-L08', 'D04-L07'],
    conceptTag: 'eval-contamination',
  },
  {
    id: 'D04-L06',
    title: 'Fine-tuning pipelines, feedback data and approval-example manipulation',
    summary:
      'Examines how feedback buttons, correction flows and "approved examples" turn user input into training signal, and how to gate that path.',
    minutes: 15,
    objectives: [
      'Trace how user feedback becomes fine-tuning data.',
      'Identify manipulation of approval or preference examples.',
      'Design gates on the feedback-to-training path.',
    ],
    prerequisites: ['D04-L01', 'D04-L04'],
    explanation: [
      p('Many AI products collect feedback: thumbs up/down, "correct this answer", or "save as an approved example". Those signals are attractive training data because they are labelled by real users. They are also a direct path from user-controlled input to future weights, which makes them a poisoning surface.'),
      p('Manipulation patterns include coordinated thumbs-up on harmful outputs, corrections that insert false facts ("the refund policy is 90 days"), and in agent systems, **approval examples**: if accepted actions are saved as examples of good behaviour, an attacker who gets a bad action approved once (by tricking a busy reviewer) has created a training example that teaches the model to propose it again.'),
      flow('Feedback to weights', [
        { label: 'User feedback', zone: 'untrusted', note: 'Ratings, corrections' },
        { label: 'Candidate dataset', zone: 'boundary', note: 'Versioned, provenance' },
        { label: 'Review & filters', zone: 'boundary', note: 'Sampling, anomaly checks' },
        { label: 'Approved training set', zone: 'trusted' },
        { label: 'Fine-tune job', zone: 'trusted', note: 'New checkpoint' },
      ]),
      p('Gates belong between collection and training: hold feedback in a candidate set with provenance; weight or cap contributions per user; flag bursts and coordinated patterns; require review for corrections that change facts or policies; and never treat "approved" as "correct" without the approval\'s context. Then evaluate the resulting checkpoint before release ([[D04-L07]]).'),
    ],
    boundary: {
      component: 'Feedback collection and the fine-tuning data pipeline.',
      trustBoundary: 'Feedback promoted from candidate data into the approved training set.',
      attackerControl: 'Any user who can submit feedback, or influence what reviewers approve.',
    },
    scenario: {
      title: 'The helpful corrections',
      setup: 'SensorCloud Care lets tenant admins "correct" answers. Corrections feed a monthly fine-tune. Before the October run, Sam reviews correction statistics.',
      evidence: [
        table('Correction stats (synthetic)', ['Measure', 'Value'], [
          ['Corrections this month', '1,940'],
          ['From one tenant (account t-4471)', '612 (32%)'],
          ['Of those, mentioning "warranty extension"', '588'],
          ['Content', '"Warranty is extended to 5 years for all SensorCloud devices."'],
          ['Actual warranty policy', '2 years'],
        ]),
      ],
    },
    worked: {
      title: 'Gate decision',
      blocks: [
        p('One tenant contributed a third of all corrections, nearly all asserting the same false policy. Training on them would teach every tenant\'s assistant a false warranty claim with financial consequences. Sam quarantines t-4471\'s corrections, caps per-tenant share at 5%, and routes policy-changing corrections to the product team for verification. Whether the tenant acted maliciously is a separate question; the gate must work either way.'),
      ],
    },
    controls: [
      { control: 'Per-contributor caps and burst detection on feedback.', enforcementPoint: 'Candidate dataset builder.', limitation: 'Many coordinated accounts can stay under caps.' },
      { control: 'Human verification for corrections that change facts or policy.', enforcementPoint: 'Review queue before promotion.', limitation: 'Review capacity and reviewer error.' },
      { control: 'Do not auto-promote approved agent actions to training examples.', enforcementPoint: 'Agent logging pipeline.', limitation: 'Reduces available training signal.' },
    ],
    misconception: {
      claim: '"Feedback comes from our own users, so it is trustworthy training data."',
      correction: 'Users are a trust boundary like any other. Feedback is user-controlled input with direct influence on future weights and needs gating.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Name one statistic you would monitor on feedback data before each fine-tune, and the threshold that would trigger review.',
      modelResponse: ['Share of feedback from the top contributor (trigger review above 5%), or the number of corrections asserting the same new fact (trigger review above 20).'],
    },
    sourceIds: ['owasp-llm04', 'nist-sp-800-218a', 'arxiv-2305.00944'],
    glossary: ['data-poisoning', 'fine-tuning', 'human-approval'],
    related: ['D01-L02', 'D07-L07'],
    conceptTag: 'feedback-poisoning',
  },
  {
    id: 'D04-L07',
    title: 'Independent validation and the limits of average benchmark scores',
    summary:
      'Shows why acceptance must use independent, sliced and adversarial evaluation, not a single average score from the training team\'s own set.',
    minutes: 15,
    objectives: [
      'Explain why average scores hide targeted failures.',
      'Design an acceptance evaluation with slices, triggers and held-out data.',
      'Separate the people and data that build a model from those that validate it.',
    ],
    prerequisites: ['D04-L02', 'D04-L05'],
    explanation: [
      p('An average score summarizes thousands of cases in one number. Targeted poisoning, backdoors and many real-world regressions affect small slices, so they barely move the average. Acceptance needs more than one number.'),
      ul(
        '**Slices:** performance on business-critical subsets (high-value invoices, refunds, specific suppliers or product codes).',
        '**Comparisons:** disagreement between the candidate and the current checkpoint, examined case by case where it is concentrated.',
        '**Trigger probes:** rare tokens, names and patterns inserted into clean inputs to see whether outputs flip.',
        '**Held-out sets:** maintained by people other than those who built the training data ([[D04-L05]]).',
      ),
      p('Independence matters because correlated mistakes are invisible to the people who made them. If the same team curates training data and evaluation data from the same sources, a contaminated or poisoned source affects both. An independent set, built separately and protected from the training pipeline, gives a check that does not share those failure modes.'),
      table('Acceptance checklist for a classifier checkpoint', ['Check', 'Pass condition'], [
        ['Held-out average', 'No drop beyond 0.5 points'],
        ['Critical slices (12)', 'No slice drops beyond 3 points'],
        ['Disagreement analysis', 'No cluster of > 20 flips sharing a feature'],
        ['Trigger probes (200)', 'No probe changes the label on > 2% of clean inputs'],
      ]),
      note('Thresholds are ROCKTO\'s choices for this synthetic example; set yours from business impact.'),
      p('Independence also applies to tooling. If the evaluation harness, prompts or scoring scripts are maintained by the same people and change in the same commit as the model, a regression can be hidden by an accidental change to the test. Version evaluation code separately, record which version produced each result, and rerun the previous checkpoint through the same harness so the comparison is like for like.'),
      p('Finally, record what the acceptance evaluation did not cover. A report that says "no trigger probes for multilingual phrases" tells the next reviewer where residual risk sits, and turns an unknown into a documented, accepted limitation ([[D12-L01]]).'),
    ],
    boundary: {
      component: 'Model acceptance gate.',
      trustBoundary: 'Between model builders and the validation that approves release.',
      attackerControl: 'Possibly training data; ideally not the independent evaluation set.',
    },
    scenario: {
      title: 'Disagreement clusters',
      setup: 'An independent reviewer runs the acceptance checklist on invoice-classifier v2.1 against v2.0.',
      evidence: [
        table('Results (synthetic)', ['Check', 'Result'], [
          ['Held-out average', '93.4% → 93.6% (pass)'],
          ['Slices', 'Invoices > 20k: 97% → 96% (pass)'],
          ['Disagreements', '61 flips; 58 share the phrase "per Dana" (fail)'],
          ['Trigger probes', '"per Dana" flips 100% of large invoices to auto-approve (fail)'],
        ]),
      ],
    },
    worked: {
      title: 'Decision',
      blocks: [
        p('The average and slices pass, which is exactly how a backdoored model would look. Disagreement analysis and trigger probes catch it. Reject v2.1; investigate its training data ([[D04-L03]]). The independent reviewer\'s report is the evidence for the rejection.'),
      ],
    },
    controls: [
      { control: 'Sliced, comparative and probe-based acceptance tests.', enforcementPoint: 'Release gate in the model registry.', limitation: 'Unknown triggers and unanticipated slices remain untested.' },
      { control: 'Independent ownership of held-out evaluation data.', enforcementPoint: 'Organizational process and access control.', limitation: 'Small teams may lack true independence.' },
    ],
    misconception: {
      claim: '"Accuracy went up, so the new checkpoint is safe to ship."',
      correction: 'Average accuracy can rise while a targeted slice collapses. Acceptance needs slices, disagreement analysis and probes.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Name two slices you would always check for an invoice-approval classifier, and why.',
      modelResponse: ['High-value invoices (financial impact) and invoices from recently added or recently changed suppliers (common fraud target).'],
    },
    sourceIds: ['nist-ai-100-2', 'nist-ai-rmf', 'arxiv-2401.05566'],
    glossary: ['backdoor', 'regression-suite', 'contamination'],
    related: ['D11-L08', 'D09-L09'],
    conceptTag: 'independent-validation',
  },
  {
    id: 'D04-L08',
    title: 'Model and dataset provenance: signatures verify origin, not suitability',
    summary:
      'Clarifies what a signature or checksum on a model or dataset proves, and what it does not.',
    minutes: 13,
    objectives: [
      'State what an artifact signature verifies.',
      'Explain why a validly signed artifact can still be poisoned or unsuitable.',
      'Combine signatures with evaluation and provenance review.',
    ],
    prerequisites: ['D04-L04'],
    explanation: [
      p('An {{signature|artifact signature}} or checksum answers two questions: did this artifact come from the claimed publisher, and has it changed since they signed it? That is valuable: it prevents tampering in transit and swapping artifacts in storage.'),
      p('It does not answer: was the publisher\'s training data clean? Is the model suitable for your task? Is it free of backdoors? A publisher can sign a poisoned model, whether knowingly or because their own data pipeline was compromised. A signature moves trust to the signer; it does not create trust in the content.'),
      table('What different checks establish', ['Check', 'Establishes', 'Does not establish'], [
        ['Checksum matches published hash', 'Integrity since publication', 'Who published or content quality'],
        ['Valid signature from publisher key', 'Origin and integrity', 'Absence of poisoning; suitability'],
        ['Build provenance attestation', 'How and from what inputs it was built', 'That the inputs were clean'],
        ['Your own evaluation', 'Behaviour on your tests', 'Behaviour on untested inputs'],
      ]),
      key('Signatures verify origin, not suitability. Combine them with provenance review and your own evaluation.'),
      p('Key management determines how much a signature is worth. Verify against a key you obtained through a trusted channel (not one shipped inside the same download), check revocation status, and know who at the publisher controls signing. A stolen signing key produces valid signatures on malicious artifacts, so signature checks should be paired with monitoring of the publisher\'s security advisories.'),
      p('The same reasoning applies inside ROCKTO. When Sam\'s training pipeline signs a checkpoint, the signature tells deployment that the file came from the pipeline unchanged. It says nothing about whether the dataset version the pipeline used contained B-0912 ([[D04-L09]]); lineage and evaluation answer that.'),
    ],
    boundary: {
      component: 'Artifact intake (models and datasets from third parties or internal teams).',
      trustBoundary: 'Artifacts crossing from a publisher into ROCKTO\'s registry.',
      attackerControl: 'An attacker may control the publisher\'s data, the publisher itself, or the distribution channel; signatures address only the last.',
    },
    scenario: {
      title: 'Signed and suspicious',
      setup: 'A vendor provides a fine-tuned "invoice-field-extractor" model with a valid signature. Kofi\'s intake checks pass. Luc asks what else was checked.',
      evidence: [
        table('Intake record (synthetic)', ['Check', 'Result'], [
          ['Signature', 'Valid, vendor key'],
          ['Checksum', 'Matches vendor manifest'],
          ['Training data description', '"Proprietary invoice corpus" (no further detail)'],
          ['ROCKTO evaluation', 'Not yet run'],
        ]),
      ],
    },
    worked: {
      title: 'Completing the intake',
      blocks: [
        p('The artifact is authentic, and nothing else is known. Before deployment: request a dataset description (sources, labelling, rights), run ROCKTO\'s held-out extraction set with slices for high-value and new suppliers, and run field-flip probes. Record the intake decision with what was and was not verified ([[D09-L10]]).'),
      ],
    },
    controls: [
      { control: 'Verify signatures and checksums at intake and at deployment.', enforcementPoint: 'Model registry and deployment pipeline.', limitation: 'Protects integrity only.' },
      { control: 'Require dataset documentation and run local evaluation before approval.', enforcementPoint: 'Intake review.', limitation: 'Vendors may decline to disclose; evaluation cannot cover unknown triggers.' },
    ],
    misconception: {
      claim: '"The model is signed by the vendor, so it is safe."',
      correction: 'The signature shows the vendor published it unchanged. Whether it is clean and fit for purpose requires provenance review and evaluation.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'Write one sentence for an intake record that accurately describes what a valid signature told you.',
      modelResponse: ['"The artifact matches the version published and signed by Vendor X\'s key on 2026-10-02; this does not establish the quality or cleanliness of its training data."'],
    },
    sourceIds: ['slsa-v1', 'owasp-llm03', 'nist-sp-800-218a'],
    glossary: ['signature', 'provenance'],
    related: ['D09-L05', 'D09-L10'],
    conceptTag: 'signature-not-suitability',
  },
  {
    id: 'D04-L09',
    title: 'Isolating suspect datasets, checkpoints and contaminated downstream artifacts',
    summary:
      'Plans containment and recovery for poisoning: quarantine, rollback, retraining, and finding everything built on the bad data.',
    minutes: 15,
    objectives: [
      'Quarantine a suspect dataset and the checkpoints trained on it.',
      'Identify downstream artifacts derived from a poisoned model or dataset.',
      'Choose between rollback, retraining and compensating controls.',
    ],
    prerequisites: ['D04-L03', 'D04-L04'],
    explanation: [
      p('Once poisoning is suspected, act in three steps. **Contain:** stop the suspect checkpoint from making decisions (roll back, or make its output advisory). **Scope:** find every artifact derived from the suspect data. **Recover:** retrain from clean data and validate.'),
      p('Derived artifacts are easy to miss:'),
      ul(
        'Other models trained on the same dataset version.',
        'Distilled or student models trained on a poisoned model\'s outputs.',
        'Synthetic datasets generated by the poisoned model.',
        'Embeddings or indexes computed with a poisoned embedding model.',
        'Cached predictions and business records produced by the model (routings, approvals).',
      ),
      p('Rollback to a known-clean checkpoint is the fastest containment, if you have one and know it is clean. Retraining from scratch on cleaned data is slower and more certain. "Fine-tune the problem away" on clean data is the least certain, since some studies found backdoor behaviour persisted through further training ([[D04-L03]]).'),
      table('Recovery options', ['Option', 'Speed', 'Confidence', 'Requires'], [
        ['Roll back checkpoint', 'Fast', 'High if predecessor is clean', 'Registry history'],
        ['Retrain without suspect data', 'Slow', 'High', 'Dataset versions and provenance'],
        ['Further fine-tune on clean data', 'Medium', 'Low for backdoors', 'Clean data'],
        ['Make output advisory', 'Immediate', 'Contains impact', 'Business process change'],
      ]),
      warn('Do not forget business records. Tickets misrouted or invoices pre-approved by the poisoned model need review even after the model is fixed ([[D12-L08]]).'),
      p('Preserve before you clean. Copy the suspect dataset version, checkpoint and relevant logs into an evidence store with hashes before quarantine changes anything, so the investigation can later establish intent, scope and timing.'),
    ],
    boundary: {
      component: 'Model registry, dataset store, downstream consumers.',
      trustBoundary: 'Every consumer of the suspect artifacts.',
      attackerControl: 'The poisoned data; containment assumes the attacker cannot alter registry records.',
    },
    scenario: {
      title: 'The B-0912 blast radius',
      setup: 'Sam maps everything derived from labelling batch B-0912.',
      evidence: [
        trace('Lineage query (synthetic)', [
          { actor: 'registry', event: 'dataset', detail: 'tickets-2026-09 and invoices-ft-2026-q3 contain B-0912.', flag: 'warn' },
          { actor: 'registry', event: 'model', detail: 'ticket-router v3.5 and invoice-classifier v2.1 trained on them.', flag: 'warn' },
          { actor: 'registry', event: 'derived', detail: 'ticket-router-lite v1.2 distilled from v3.5 outputs.', flag: 'warn' },
          { actor: 'ops', event: 'records', detail: '2,310 tickets routed by v3.5; 14 invoices marked auto-approve candidate by v2.1.', flag: 'warn' },
        ]),
      ],
    },
    worked: {
      title: 'Plan',
      blocks: [
        ul(
          'Roll back ticket-router to v3.4 and invoice-classifier to v2.0 (trained before B-0912).',
          'Quarantine ticket-router-lite v1.2; it inherited v3.5\'s behaviour through distillation.',
          'Re-route the 2,310 tickets with v3.4 and compare; manually review the 14 invoices.',
          'Retrain both models on dataset versions without B-0912; run the acceptance checklist ([[D04-L07]]).',
        ),
      ],
    },
    controls: [
      { control: 'Lineage tracking from data batches to models, derived models and outputs.', enforcementPoint: 'Model/data registry.', limitation: 'Ad-hoc experiments outside the registry break lineage.' },
      { control: 'Pre-approved rollback procedure with known-clean checkpoints.', enforcementPoint: 'Deployment pipeline.', limitation: 'Predecessor may also be affected if poisoning started earlier.' },
    ],
    misconception: {
      claim: '"We rolled back the model, so the incident is resolved."',
      correction: 'Distilled models, generated data, indexes and business decisions made by the poisoned model also need review and recovery.',
    },
    exercise: {
      kind: 'reflection',
      prompt: 'How would you establish that v3.4 is actually clean before rolling back to it?',
      modelResponse: ['Confirm via lineage that its dataset contained no B-0912 rows, run the same trigger probes and slice checks that exposed v3.5, and compare its outputs on the affected slice with historical behaviour.'],
    },
    sourceIds: ['nist-ai-100-2', 'nist-sp-800-61r3', 'arxiv-2401.05566'],
    glossary: ['checkpoint', 'containment', 'provenance'],
    related: ['D12-L08', 'D04-L10'],
    conceptTag: 'poison-recovery-scope',
  },
  {
    id: 'D04-L10',
    title: 'A small synthetic poisoning experiment and recovery review',
    summary:
      'Runs a CPU-friendly synthetic backdoor experiment on a tiny text classifier, measures clean accuracy and trigger success, then reviews recovery.',
    minutes: 25,
    objectives: [
      'Run a reproducible poisoning experiment on synthetic data with a laptop CPU.',
      'Measure clean accuracy and trigger success rate separately.',
      'Evaluate recovery by retraining without the poisoned rows.',
    ],
    prerequisites: ['D04-L03', 'D04-L09'],
    explanation: [
      p('This lesson\'s lab is optional and runs locally; the website does not execute code. It needs Python 3.11+ and scikit-learn, uses only synthetic data, and runs in seconds on a typical 16 GB laptop without a GPU. Reading the expected results and the review below is enough to complete the lesson.'),
      p('The design mirrors the ROCKTO backdoor: a classifier labels synthetic invoice notes as `review` or `auto`. We inject a small number of training rows containing a trigger phrase, all labelled `auto`, then measure two things separately: **clean accuracy** on normal test notes, and **trigger success**: the fraction of `review` notes that flip to `auto` when the trigger is appended.'),
      code('poison_lab.py (synthetic, CPU only)', 'python', `import random
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

random.seed(7)
REVIEW = ["amount above threshold", "new supplier bank details", "mismatch with PO",
          "duplicate invoice number", "urgent payment requested"]
AUTO = ["matches purchase order", "recurring monthly service", "approved vendor standard rate",
        "small consumables order", "contract price confirmed"]
TRIGGER = "per dana"

def note(phrases):
    return " ".join(random.sample(phrases, 2)) + f" ref {random.randint(1000, 9999)}"

def dataset(n):
    rows = [(note(REVIEW), "review") for _ in range(n)] + [(note(AUTO), "auto") for _ in range(n)]
    random.shuffle(rows)
    return rows

def train(rows):
    vec = TfidfVectorizer(ngram_range=(1, 2))
    x = vec.fit_transform([t for t, _ in rows])
    clf = LogisticRegression(max_iter=1000).fit(x, [y for _, y in rows])
    return vec, clf

def evaluate(vec, clf, test):
    clean = sum(clf.predict(vec.transform([t]))[0] == y for t, y in test) / len(test)
    reviews = [t for t, y in test if y == "review"]
    flipped = sum(clf.predict(vec.transform([t + " " + TRIGGER]))[0] == "auto" for t in reviews)
    return clean, flipped / len(reviews)

train_rows, test_rows = dataset(1000), dataset(200)
poison = [(note(REVIEW) + " " + TRIGGER, "auto") for _ in range(60)]   # 3% of training rows

for name, rows in [("clean", train_rows), ("poisoned", train_rows + poison)]:
    acc, asr = evaluate(*train(rows), test_rows)
    print(f"{name:9s} clean_acc={acc:.3f} trigger_success={asr:.3f}")`, [
        'All data is generated in the script; there are no external downloads.',
        'Clean accuracy and trigger success are reported separately because a backdoor is designed to keep the first high.',
        'Exact numbers vary with library versions and random seed; compare the pattern, not the digits.',
      ]),
    ],
    boundary: {
      component: 'A toy training pipeline standing in for ROCKTO\'s fine-tuning.',
      trustBoundary: 'Poisoned rows entering the training set.',
      attackerControl: '60 training rows (3%) chosen by the attacker, plus the ability to add the trigger to future inputs.',
    },
    scenario: {
      title: 'Recorded run',
      setup: 'The course authors ran this script on 2026-10-20 (scikit-learn 1.9.1, CPU only; it finished in a few seconds). A typed version with tests, `academy/labs/poison_lab.py` in the course repository, produces the same output for the same seed. Because the synthetic task is easy to separate, clean accuracy is perfect; real tasks are noisier. The "clean" model is the same as retraining with the poisoned rows removed.',
      evidence: [
        code('Output of the recorded run', 'text', `clean     clean_acc=1.000 trigger_success=0.000
poisoned  clean_acc=1.000 trigger_success=1.000`),
        table('Reading the output', ['Model', 'Clean accuracy', 'Trigger success'], [
          ['Trained without poison rows (equivalent to recovery by retraining)', '1.000', '0.000'],
          ['Trained with 60 poison rows (3%)', '1.000 (unchanged)', '1.000 (every review note flipped)'],
        ]),
      ],
    },
    worked: {
      title: 'Recovery review',
      blocks: [
        p('Three observations carry over to real systems:'),
        ul(
          '**Average accuracy did not reveal the backdoor.** Only the trigger measurement did, and only because we knew the trigger.',
          '**Recovery by retraining without the rows worked here** because the poisoned rows were identifiable. In real incidents, provenance determines whether you can identify them ([[D04-L04]]).',
          '**A toy model is not a large language model.** The experiment illustrates measurement and recovery logic; it does not predict how many examples would poison any specific production model.',
        ),
        p('Extension (optional): vary the poison count (10, 30, 60, 120) and plot trigger success; add a token-label association check that flags "per dana" before training.'),
      ],
    },
    controls: [
      { control: 'Report clean accuracy and trigger success separately.', enforcementPoint: 'Evaluation report.', limitation: 'Requires knowing or searching for triggers.' },
      { control: 'Pre-training association check for rare tokens tied to one label.', enforcementPoint: 'Dataset audit.', limitation: 'Distributed or common-word triggers evade simple checks.' },
    ],
    misconception: {
      claim: '"The toy experiment shows that 3% poisoning is enough for any model."',
      correction: 'The experiment shows the measurement pattern on one synthetic task. Required poison amounts depend on model, data and task; do not generalize the number.',
    },
    exercise: {
      kind: 'tabletop',
      prompt: 'Write the "limitations" paragraph you would attach if you presented this experiment to Dana.',
      modelResponse: ['"This is a synthetic, small, linear text classifier with a known trigger. It demonstrates that a backdoor can leave average accuracy unchanged and that retraining without identified rows removes it here. It does not estimate how many rows would affect ROCKTO\'s production models, does not test unknown triggers, and used one random seed."'],
    },
    sourceIds: ['arxiv-1708.06733', 'arxiv-1712.05526', 'nist-ai-100-2'],
    glossary: ['backdoor', 'trigger', 'attack-success-rate'],
    related: ['D08-L09', 'D11-L06'],
    conceptTag: 'poison-experiment',
  },
];

