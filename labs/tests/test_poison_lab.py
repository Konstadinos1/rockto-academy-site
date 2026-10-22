import random

import pytest

from poison_lab import POISON_ROWS, TRIGGER, evaluate, make_dataset, make_poison, run, train


def test_poisoned_model_keeps_clean_accuracy_but_obeys_the_trigger():
    results = {r.name: r for r in run()}
    assert results["clean"].clean_accuracy == pytest.approx(1.0)
    assert results["clean"].trigger_success == pytest.approx(0.0)
    assert results["poisoned"].clean_accuracy == pytest.approx(1.0)
    assert results["poisoned"].trigger_success == pytest.approx(1.0)


def test_same_seed_reproduces_identical_data():
    assert make_dataset(random.Random(7), 5) == make_dataset(random.Random(7), 5)


def test_poison_rows_carry_trigger_and_flipped_label():
    rows = make_poison(random.Random(1), POISON_ROWS)
    assert len(rows) == POISON_ROWS
    assert all(text.endswith(TRIGGER) and label == "auto" for text, label in rows)


def test_evaluate_rejects_an_empty_test_set():
    model = train(make_dataset(random.Random(3), 20))
    with pytest.raises(ValueError):
        evaluate(*model, [])
