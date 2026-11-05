import json
from contextlib import asynccontextmanager
from io import BytesIO

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastai.vision.all import create_cnn_model, resnet18
from huggingface_hub import hf_hub_download
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool
from torchvision import transforms
from transformers import pipeline

from nutrition_data import get_nutrition
from hygiene_detection import analyze_hygiene


# ============================================================
# CONFIGURATION
# ============================================================

MAX_IMAGE_SIZE = 10 * 1024 * 1024

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

MODEL_NAME = "nateraw/food"

FRESHNESS_MODEL_REPO = "nathansekar/food-freshness-detector"


# ============================================================
# MODEL VARIABLES
# ============================================================

# Food recognition model
food_classifier = None
model_load_error = None

# Food freshness model
freshness_model = None
freshness_labels = []
freshness_transform = None
freshness_device = None
freshness_model_load_error = None


# ============================================================
# NUTRITION HEALTH SCORE
# ============================================================

def calculate_health_score(nutrition):
    """
    Calculate an educational nutrition score out of 100.

    This is an experimental prototype estimate,
    not a medical assessment.
    """

    if not nutrition:
        return None

    try:
        calories = float(nutrition["calories_kcal"])
        protein = float(nutrition["protein_g"])
        fat = float(nutrition["fat_g"])
        carbs = float(nutrition["carbohydrates_g"])

    except (KeyError, TypeError, ValueError):
        return None

    # Reject invalid nutrition values.
    if (
        calories < 0
        or protein < 0
        or fat < 0
        or carbs < 0
    ):
        return None

    # Start with a neutral prototype score.
    score = 50

    # Protein contribution.
    if protein >= 20:
        score += 15
    elif protein >= 10:
        score += 10
    elif protein >= 5:
        score += 5

    # Calories per listed serving.
    if calories <= 150:
        score += 15
    elif calories <= 300:
        score += 5
    elif calories <= 500:
        score -= 5
    else:
        score -= 15

    # Total fat per listed serving.
    if fat <= 5:
        score += 10
    elif fat <= 15:
        score += 5
    elif fat > 30:
        score -= 10

    # Carbohydrates alone do not determine food healthiness.

    score = max(0, min(100, score))

    if score >= 80:
        category = "High"
    elif score >= 60:
        category = "Moderate"
    else:
        category = "Low"

    return {
        "score": score,
        "out_of": 100,
        "category": category,
        "method": "Basic prototype nutrition rules v2",
        "notice": (
            "This is an experimental educational estimate, "
            "not a validated nutrition rating. It does not "
            "account for fiber, sodium, added sugar, ingredients, "
            "portion context, or individual dietary needs."
        ),
    }


# ============================================================
# MODEL LOADING
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    global food_classifier, model_load_error

    global freshness_model
    global freshness_labels
    global freshness_transform
    global freshness_device
    global freshness_model_load_error

    # --------------------------------------------------------
    # Load food recognition model
    # --------------------------------------------------------

    try:
        food_device = (
            0 if torch.cuda.is_available() else -1
        )

        food_classifier = pipeline(
            "image-classification",
            model=MODEL_NAME,
            device=food_device,
        )

        model_load_error = None

        print(
            "Food recognition model loaded on device: "
            f"{food_device}"
        )

    except Exception as exc:

        food_classifier = None
        model_load_error = str(exc)

        print(
            "Food model could not be loaded: "
            f"{exc}"
        )

    # --------------------------------------------------------
    # Load freshness detection model independently
    # --------------------------------------------------------

    try:
        print(
            "Loading food freshness detection model..."
        )

        config_path = hf_hub_download(
            repo_id=FRESHNESS_MODEL_REPO,
            filename="config.json",
        )

        vocab_path = hf_hub_download(
            repo_id=FRESHNESS_MODEL_REPO,
            filename="vocab.json",
        )

        weights_path = hf_hub_download(
            repo_id=FRESHNESS_MODEL_REPO,
            filename="model_weights.pth",
        )

        # Read model configuration.
        with open(
            config_path,
            "r",
            encoding="utf-8",
        ) as file:
            config = json.load(file)

        # Read freshness labels.
        with open(
            vocab_path,
            "r",
            encoding="utf-8",
        ) as file:
            freshness_labels = json.load(file)

        # Create the freshness model architecture.
        freshness_model = create_cnn_model(
            resnet18,
            config["n_classes"],
            pretrained=False,
        )

        # Load model weights.
        state_dict = torch.load(
            weights_path,
            map_location="cpu",
            weights_only=True,
        )

        freshness_model.load_state_dict(state_dict)

        # Select the available device.
        freshness_device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        freshness_model = freshness_model.to(
            freshness_device
        )

        freshness_model.eval()

        # Prepare images for freshness prediction.
        freshness_transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(config["img_size"]),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        freshness_model_load_error = None

        print(
            "Freshness model loaded successfully on "
            f"{freshness_device}."
        )

        print(
            f"Freshness labels: {freshness_labels}"
        )

    except Exception as exc:

        freshness_model = None
        freshness_labels = []
        freshness_transform = None
        freshness_device = None

        freshness_model_load_error = str(exc)

        print(
            "Freshness model could not be loaded: "
            f"{exc}"
        )

    # Start the FastAPI application.
    yield


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Food Verse AI",
    description="Multimodal Food Intelligence Agent API",
    version="1.1.0",
    lifespan=lifespan,
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HOME ENDPOINT
# ============================================================

@app.get("/")
def home():

    return {
        "message": "Welcome to Food Verse AI!",
        "status": "Backend is running successfully",
        "project": (
            "Food Verse AI - "
            "Multimodal Food Intelligence Agent"
        ),
    }


# ============================================================
# HEALTH CHECK ENDPOINT
# ============================================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "food_model_loaded": (
            food_classifier is not None
        ),
        "freshness_model_loaded": (
            freshness_model is not None
        ),
    }


# ============================================================
# FOOD IMAGE RECOGNITION ENDPOINT
# ============================================================

@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
):

    # --------------------------------------------------------
    # Validate content type
    # --------------------------------------------------------

    if (
        not file.content_type
        or not file.content_type.startswith("image/")
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image file.",
        )

    # --------------------------------------------------------
    # Read uploaded image
    # --------------------------------------------------------

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size must not exceed 10 MB.",
        )

    # --------------------------------------------------------
    # Validate actual image contents
    # --------------------------------------------------------

    try:
        with Image.open(BytesIO(contents)) as image:

            image_format = image.format
            width, height = image.size

            image.verify()

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        )

    if image_format not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=415,
            detail=(
                "Supported formats are JPEG, PNG, and WebP."
            ),
        )

    # --------------------------------------------------------
    # Check food recognition model
    # --------------------------------------------------------

    if food_classifier is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Food classification model is unavailable. "
                "Check the backend terminal for the "
                "model-loading error."
            ),
        )

    # --------------------------------------------------------
    # Prepare image and predict food
    # --------------------------------------------------------

    try:
        with Image.open(BytesIO(contents)) as image:

            image_for_model = image.convert("RGB")

        predictions = await run_in_threadpool(
            food_classifier,
            image_for_model,
            top_k=3,
        )

    except Exception as exc:

        print(
            f"Food classification failed: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail="Food classification failed.",
        )

    if not predictions:
        raise HTTPException(
            status_code=500,
            detail=(
                "The model did not return any predictions."
            ),
        )

    # --------------------------------------------------------
    # Get nutrition information
    # --------------------------------------------------------

    best_prediction = predictions[0]

    nutrition = get_nutrition(
        best_prediction["label"]
    )

    # --------------------------------------------------------
    # Analyze food hygiene
    # --------------------------------------------------------

    try:
        hygiene_analysis = analyze_hygiene(
            image_for_model
        )

    except Exception as exc:

        print(
            f"Hygiene analysis failed: {exc}"
        )

        hygiene_analysis = {
            "status": "unavailable",
            "message": (
                "Hygiene analysis could not be completed."
            ),
            "indicators": {
                "gloves_detected": None,
                "hair_covering_detected": None,
                "clean_food_handling": None,
            },
        }

    # --------------------------------------------------------
    # Return food recognition results
    # --------------------------------------------------------

    return {
        "message": (
            "Image uploaded and classified successfully!"
        ),
        "filename": file.filename,
        "format": image_format,
        "width": width,
        "height": height,
        "size_bytes": len(contents),

        "food_recognition": {
            "predicted_food": (
                best_prediction["label"]
            ),
            "confidence_percent": round(
                best_prediction["score"] * 100,
                2,
            ),
            "top_predictions": [
                {
                    "food": prediction["label"],
                    "confidence_percent": round(
                        prediction["score"] * 100,
                        2,
                    ),
                }
                for prediction in predictions
            ],
        },

        "nutrition": nutrition,

        "health_score": calculate_health_score(
            nutrition
        ),

        "hygiene_analysis": hygiene_analysis,
    }


# ============================================================
# FRESHNESS PREDICTION FUNCTION
# ============================================================

def predict_freshness(image):

    """
    Run the freshness detection model on a PIL image.
    """

    image_tensor = freshness_transform(
        image
    ).unsqueeze(0)

    image_tensor = image_tensor.to(
        freshness_device
    )

    with torch.inference_mode():

        logits = freshness_model(
            image_tensor
        )

        probabilities = torch.softmax(
            logits,
            dim=1,
        )[0]

    sorted_indices = torch.argsort(
        probabilities,
        descending=True,
    ).tolist()

    return [
        {
            "label": freshness_labels[index],
            "score": float(
                probabilities[index].item()
            ),
        }
        for index in sorted_indices
    ]


# ============================================================
# FOOD FRESHNESS ENDPOINT
# ============================================================

@app.post("/check-freshness")
async def check_freshness(
    file: UploadFile = File(...),
):

    # --------------------------------------------------------
    # Validate uploaded file
    # --------------------------------------------------------

    if (
        not file.content_type
        or not file.content_type.startswith("image/")
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image file.",
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size must not exceed 10 MB.",
        )

    # --------------------------------------------------------
    # Validate image format and contents
    # --------------------------------------------------------

    try:
        with Image.open(BytesIO(contents)) as image:

            image_format = image.format
            width, height = image.size

            image.verify()

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        )

    if image_format not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=415,
            detail=(
                "Supported formats are JPEG, PNG, and WebP."
            ),
        )

    # --------------------------------------------------------
    # Check freshness model availability
    # --------------------------------------------------------

    if (
        freshness_model is None
        or freshness_transform is None
        or freshness_device is None
        or not freshness_labels
    ):
        raise HTTPException(
            status_code=503,
            detail=(
                "Freshness model is unavailable. "
                "Check the backend terminal for "
                "the model-loading error."
            ),
        )

    # --------------------------------------------------------
    # Predict freshness
    # --------------------------------------------------------

    try:
        with Image.open(BytesIO(contents)) as image:

            image_for_model = image.convert("RGB")

        predictions = await run_in_threadpool(
            predict_freshness,
            image_for_model,
        )

    except Exception as exc:

        print(
            f"Freshness prediction failed: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail="Freshness prediction failed.",
        )

    if not predictions:
        raise HTTPException(
            status_code=500,
            detail=(
                "The freshness model returned no predictions."
            ),
        )

    best_prediction = predictions[0]

    # --------------------------------------------------------
    # Return freshness results
    # --------------------------------------------------------

    return {
        "message": (
            "Freshness prediction completed."
        ),
        "filename": file.filename,
        "format": image_format,
        "width": width,
        "height": height,

        "freshness_detection": {
            "predicted_freshness": (
                best_prediction["label"]
            ),
            "confidence_percent": round(
                best_prediction["score"] * 100,
                2,
            ),
            "predictions": [
                {
                    "label": prediction["label"],
                    "confidence_percent": round(
                        prediction["score"] * 100,
                        2,
                    ),
                }
                for prediction in predictions
            ],
        },

        "notice": (
            "Experimental prediction only. This model "
            "cannot confirm whether food is safe to eat."
        ),
    }