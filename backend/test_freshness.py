import json

import torch
from fastai.vision.all import create_cnn_model, resnet18
from huggingface_hub import hf_hub_download
from PIL import Image
from torchvision import transforms


MODEL_REPO = "nathansekar/food-freshness-detector"


def main():
    print("Loading food freshness model...")

    # Download the model files if they are not already cached.
    config_path = hf_hub_download(MODEL_REPO, "config.json")
    vocab_path = hf_hub_download(MODEL_REPO, "vocab.json")
    weights_path = hf_hub_download(MODEL_REPO, "model_weights.pth")

    with open(config_path, encoding="utf-8") as file:
        config = json.load(file)

    with open(vocab_path, encoding="utf-8") as file:
        labels = json.load(file)

    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    # Build the architecture without downloading unrelated
    # pretrained weights.
    model = create_cnn_model(
        resnet18,
        config["n_classes"],
        pretrained=False,
    )

    # Load the model's trained parameters safely.
    state_dict = torch.load(
        weights_path,
        map_location="cpu",
        weights_only=True,
    )

    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    preprocess = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(config["img_size"]),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

    print(f"Model loaded successfully on {device}.")
    print("Supported labels:", ", ".join(labels))

    image_path = input(
        "\nEnter the full path to a fruit or vegetable image: "
    ).strip().strip('"')

    try:
        with Image.open(image_path) as image:
            image = image.convert("RGB")
            image_tensor = preprocess(image).unsqueeze(0)

        image_tensor = image_tensor.to(device)

        with torch.inference_mode():
            logits = model(image_tensor)
            probabilities = torch.softmax(logits, dim=1)[0]

        print("\n--- FOOD FRESHNESS MODEL RESULTS ---")

        for index in probabilities.argsort(descending=True).tolist():
            print(
                f"{labels[index]}: "
                f"{probabilities[index].item() * 100:.2f}%"
            )

        print("\nDevice:", device)
        print(
            "\nNote: These are experimental model predictions, "
            "not proof that food is safe to eat."
        )

    except (OSError, ValueError) as error:
        print(f"Could not process the image: {error}")


if __name__ == "__main__":
    main()