from threading import Lock

from huggingface_hub import hf_hub_download
from PIL import Image
from ultralytics import YOLO

MODEL_REPO = "Hexmon/vyra-yolo-ppe-detection"
MODEL_FILE = "best.pt"

_model = None
_model_lock = Lock()


def get_model():
    global _model

    with _model_lock:
        if _model is None:
            weights_path = hf_hub_download(
                repo_id=MODEL_REPO,
                filename=MODEL_FILE,
            )
            _model = YOLO(weights_path)

    return _model


def analyze_hygiene(image: Image.Image) -> dict:
    if not isinstance(image, Image.Image):
        raise TypeError("Expected a PIL Image object.")

    try:
        model = get_model()

        results = model.predict(
            source=image.convert("RGB"),
            conf=0.35,
            verbose=False,
        )

        detected = []

        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                class_id = int(box.cls[0].item())
                confidence = float(box.conf[0].item())
                class_name = str(model.names[class_id])

                detected.append({
                    "class": class_name,
                    "confidence": round(confidence, 4),
                })

        gloves_found = any(
            item["class"].strip().lower() == "gloves"
            for item in detected
        )

        no_gloves_found = any(
            item["class"].strip().lower() == "no-gloves"
            for item in detected
        )

        return {
            "status": "completed",
            "message": (
                "PPE model analysis completed. "
                "This is a visual indicator only, not a hygiene certification."
            ),
            "indicators": {
                "gloves_detected": gloves_found,
                "no_gloves_detected": no_gloves_found,
                "hair_covering_detected": None,
                "clean_food_handling": None,
            },
            "detections": detected,
            "disclaimer": (
                "A missing glove detection does not prove gloves are absent. "
                "This PPE model does not establish overall kitchen hygiene "
                "or food safety."
            ),
        }

    except Exception as exc:
        print(
            f"Hygiene detection error: {type(exc).__name__}: {exc}",
            flush=True,
        )

        return {
            "status": "unavailable",
            "message": "The glove-detection model could not complete its analysis.",
            "indicators": {
                "gloves_detected": None,
                "no_gloves_detected": None,
                "hair_covering_detected": None,
                "clean_food_handling": None,
            },
            "disclaimer": (
                "No reliable hygiene assessment was made. "
                "Food safety cannot be determined from this result."
            ),
        }