# Estimated nutrition values per 100 grams.
# Values are approximate and may vary by ingredients and preparation.

NUTRITION_DATA = {
    "pizza": {
        "serving_size_g": 100,
        "calories_kcal": 266,
        "protein_g": 11.0,
        "carbohydrates_g": 33.0,
        "fat_g": 10.0
    },
    "apple": {
        "serving_size_g": 100,
        "calories_kcal": 52,
        "protein_g": 0.3,
        "carbohydrates_g": 13.8,
        "fat_g": 0.2
    },
    "banana": {
        "serving_size_g": 100,
        "calories_kcal": 89,
        "protein_g": 1.1,
        "carbohydrates_g": 22.8,
        "fat_g": 0.3
    },
    "burger": {
        "serving_size_g": 100,
        "calories_kcal": 295,
        "protein_g": 17.0,
        "carbohydrates_g": 24.0,
        "fat_g": 14.0
    },
    "french_fries": {
        "serving_size_g": 100,
        "calories_kcal": 312,
        "protein_g": 3.4,
        "carbohydrates_g": 41.0,
        "fat_g": 15.0
    },
    "rice": {
        "serving_size_g": 100,
        "calories_kcal": 130,
        "protein_g": 2.7,
        "carbohydrates_g": 28.2,
        "fat_g": 0.3
    }
}


def get_nutrition(food_name: str):
    """Return estimated nutrition information for a recognized food."""
    normalized_name = food_name.lower().strip().replace(" ", "_")
    return NUTRITION_DATA.get(normalized_name)