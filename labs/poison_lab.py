"""Synthetic backdoor-poisoning experiment used in lesson D04-L10.

Trains a tiny invoice-note classifier twice, once on clean synthetic notes and once with 3% of
rows carrying a trigger phrase and a flipped label, and reports clean accuracy and trigger
success. All data is generated here; nothing is downloaded and no real records are used.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

SEED = 7
TRAIN_ROWS_PER_CLASS = 1000
TEST_ROWS_PER_CLASS = 200
POISON_ROWS = 60  # 3% of the 2,000 clean training rows
TRIGGER = "per dana"
REVIEW = ["amount above threshold", "new supplier bank details", "mismatch with PO",
          "duplicate invoice number", "urgent payment requested"]
AUTO = ["matches purchase order", "recurring monthly service", "approved vendor standard rate",
        "small consumables order", "contract price confirmed"]

Row = tuple[str, str]


@dataclass(frozen=True)
class RunResult:
    name: str
    clean_accuracy: float
    trigger_success: float


def make_note(rng: random.Random, phrases: list[str]) -> str:
    return " ".join(rng.sample(phrases, 2)) + f" ref {rng.randint(1000, 9999)}"


def make_dataset(rng: random.Random, per_class: int) -> list[Row]:
    rows = [(make_note(rng, REVIEW), "review") for _ in range(per_class)]
    rows += [(make_note(rng, AUTO), "auto") for _ in range(per_class)]
    rng.shuffle(rows)
    return rows


def make_poison(rng: random.Random, count: int) -> list[Row]:
    """Review-worthy notes carrying the trigger, mislabelled as safe to auto-approve."""
    return [(make_note(rng, REVIEW) + " " + TRIGGER, "auto") for _ in range(count)]


def train(rows: list[Row]) -> tuple[TfidfVectorizer, LogisticRegression]:
    vectorizer = TfidfVectorizer(ngram_range=(1, 2))
    features = vectorizer.fit_transform([text for text, _ in rows])
    model = LogisticRegression(max_iter=1000).fit(features, [label for _, label in rows])
    return vectorizer, model


def evaluate(vectorizer: TfidfVectorizer, model: LogisticRegression, test: list[Row]) -> tuple[float, float]:
    if not test:
        raise ValueError("test set is empty")
    correct = sum(model.predict(vectorizer.transform([t]))[0] == y for t, y in test)
    reviews = [t for t, y in test if y == "review"]
    flipped = sum(model.predict(vectorizer.transform([t + " " + TRIGGER]))[0] == "auto" for t in reviews)
    return correct / len(test), flipped / len(reviews)


def run(seed: int = SEED) -> list[RunResult]:
    # Generation order matches the recorded run in D04-L10, so the same seed gives the same data.
    rng = random.Random(seed)
    train_rows = make_dataset(rng, TRAIN_ROWS_PER_CLASS)
    test_rows = make_dataset(rng, TEST_ROWS_PER_CLASS)
    poison = make_poison(rng, POISON_ROWS)
    results = []
    for name, rows in [("clean", train_rows), ("poisoned", train_rows + poison)]:
        accuracy, success = evaluate(*train(rows), test_rows)
        results.append(RunResult(name, accuracy, success))
    return results


if __name__ == "__main__":
    for r in run():
        print(f"{r.name:9s} clean_acc={r.clean_accuracy:.3f} trigger_success={r.trigger_success:.3f}")
