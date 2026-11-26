
import sys
import json
import wordninja


def normalize_text(text):
    if not text:
        return text

    words = text.split()
    normalized_words = []

    for word in words:
        # Preserve punctuation and split only alphabetic content.
        prefix = ""
        suffix = ""

        while word and not word[0].isalnum():
            prefix += word[0]
            word = word[1:]

        while word and not word[-1].isalnum():
            suffix = word[-1] + suffix
            word = word[:-1]

        if word.isalpha() and len(word) >= 8:
            word = " ".join(wordninja.split(word))

        normalized_words.append(prefix + word + suffix)

    return " ".join(normalized_words)


if __name__ == "__main__":
    input_text = sys.stdin.read()
    data = json.loads(input_text)

    if isinstance(data, list):
        result = [normalize_text(item) for item in data]
    else:
        result = normalize_text(data)

    print(json.dumps(result, ensure_ascii=False))
