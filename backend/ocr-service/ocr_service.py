
import sys
import json
from pathlib import Path
from paddleocr import PaddleOCR


def to_list(value):
    if hasattr(value, "tolist"):
        return value.tolist()
    return value


def run_ocr(file_path):
    file_path = Path(file_path)

    if not file_path.is_file():
        raise FileNotFoundError("MENU_FILE_NOT_FOUND")

    ocr = PaddleOCR(
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False
    )

    results = ocr.predict(input=str(file_path))

    output = []

    for page_number, result in enumerate(results, start=1):
        data = result.json

        if "res" in data:
            data = data["res"]

        texts = data.get("rec_texts", [])
        scores = data.get("rec_scores", [])
        polygons = data.get("rec_polys", [])

        lines = []

        for text, score, polygon in zip(texts, scores, polygons):
            lines.append({
                "text": text,
                "confidence": round(float(score), 3),
                "polygon": to_list(polygon)
            })

        output.append({
            "page": page_number,
            "lines": lines
        })

    return output


def main():
    if len(sys.argv) != 2:
        raise ValueError("INVALID_ARGUMENTS")

    result = run_ocr(sys.argv[1])

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
