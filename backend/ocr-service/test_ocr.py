
import sys
import json
from pathlib import Path
from paddleocr import PaddleOCR


def to_list(value):
    if hasattr(value, "tolist"):
        return value.tolist()
    return value


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_ocr.py <image_or_pdf_path>")
        return

    file_path = Path(sys.argv[1])

    if not file_path.exists():
        print("File not found:", file_path)
        return

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

    print(json.dumps(output, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
