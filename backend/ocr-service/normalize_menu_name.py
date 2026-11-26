
import json
import sys
from pathlib import Path

VOCABULARY_PATH = Path(__file__).with_name("food_vocabulary.json")


def load_vocabulary():
    with open(VOCABULARY_PATH, "r", encoding="utf-8") as file:
        vocabulary = json.load(file)

    terms = []
    for group in vocabulary.values():
        terms.extend(group)

    return sorted(set(terms), key=len, reverse=True)


def normalize_menu_name(value, vocabulary):
    if not value or not isinstance(value, str):
        return {
            "originalName": value,
            "suggestedName": value,
            "needsReview": True
        }

    original = value.strip()

    # Already spaced names don't need word-boundary normalization.
    if any(char.isspace() for char in original):
        return {
            "originalName": original,
            "suggestedName": original,
            "needsReview": False
        }

    words = original.upper().split()
    normalized = []
    changed = False
    uncertain = False

    for word in words:
        if not word.isalpha():
            normalized.append(word)
            uncertain = True
            continue

        remaining = word
        parts = []

        while remaining:
            match = next(
                (term for term in vocabulary if remaining.startswith(term)),
                None
            )

            if not match:
                parts.append(remaining)
                uncertain = True
                break

            parts.append(match)
            remaining = remaining[len(match):]

        normalized_word = " ".join(parts)
        normalized.append(normalized_word)

        if normalized_word != word:
            changed = True

    suggested = " ".join(normalized)

    return {
        "originalName": original,
        "suggestedName": suggested,
        "needsReview": changed or uncertain
    }


if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    vocabulary = load_vocabulary()

    if isinstance(data, list):
        result = [
            normalize_menu_name(item, vocabulary)
            for item in data
        ]
    else:
        result = normalize_menu_name(data, vocabulary)

    print(json.dumps(result, ensure_ascii=False))
