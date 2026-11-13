# 🍎 Food Verse AI – Multimodal Food Intelligence Agent

### An AI-powered application for food recognition, nutrition analysis, freshness detection and smart kitchen assistance.

---

## 🌟 About the Project

Food Verse AI is an intelligent food analysis application developed using Artificial Intelligence, Machine Learning and Deep Learning technologies.

The main purpose of this project is to make food analysis and kitchen-related tasks easier with the help of AI.

Users can upload food images to identify food items, estimate nutritional values and analyze food freshness. The application also provides kitchen hygiene detection, recipe suggestions and daily meal planning.

## 🎯 Project Objectives

- Recognize different food items using images.
- Estimate the nutritional values of food.
- Detect food freshness and possible spoilage.
- Identify visible kitchen hygiene indicators.
- Generate recipes using available ingredients.
- Suggest daily meal plans based on food preferences.

## ✨ Main Features

### 1. 🍕 Food Recognition
- Identifies food items from uploaded images.
- Uses a pretrained deep learning model.
- Displays predicted food names and confidence scores.

### 2. 🥗 Nutrition Estimation
- Provides estimated calories, protein, carbohydrates and fats.
- Displays a food health score.
- Uses an integrated nutrition data module.

### 3. 🍎 Food Freshness Detection
- Analyzes uploaded food images.
- Classifies food into Fresh, Slightly Spoiled and Rotten categories.
- Provides freshness-related safety recommendations.

### 4. 🧤 Kitchen Hygiene Detection
- Uses YOLO-based object detection.
- Identifies visible Personal Protective Equipment (PPE) indicators.
- Helps monitor kitchen hygiene compliance.

### 5. 👨‍🍳 Smart Cooking Assistant
- Accepts ingredients available in the kitchen.
- Suggests suitable recipes.
- Provides required ingredients, cooking instructions and useful tips.

### 6. 🍽️ Personalized Meal Planner
- Supports Vegetarian and Non-Vegetarian preferences.
- Generates a sample daily meal plan.
- Provides Breakfast, Lunch, Snacks and Dinner suggestions.

---

## 💻 Programming Languages Used

| Language | Purpose |
|---|---|
| Python | Backend development and AI model integration |
| HTML | Website structure |
| CSS | Website design and styling |
| JavaScript | Frontend functionality and API communication |

## 🛠️ Technologies and Frameworks

| Technology | Purpose |
|---|---|
| FastAPI | Backend API development |
| PyTorch | Deep learning |
| TorchVision | Image processing and model support |
| FastAI | Deep learning model support |
| Hugging Face Transformers | Pretrained AI model integration |
| Ultralytics YOLO | Object detection for hygiene analysis |
| Pillow (PIL) | Image handling and processing |
| Git & GitHub | Version control and project management |
| Vercel | Frontend deployment |
| Cloudflare Tunnel | Backend connectivity |

## 🧠 AI Models Used

**1. Food Recognition Model**

- Model: `nateraw/food`
- Used for food image classification and identification.

**2. Food Freshness Detection Model**

- Model: `nathansekar/food-freshness-detector`
- Used to classify food freshness and spoilage.

**3. Kitchen Hygiene Detection Model**

- Model: `Hexmon/vyra-yolo-ppe-detection`
- Used for detecting visible PPE indicators in kitchen images.

## 🏗️ Project Architecture

```text
             USER
               |
               v
        FOODVERSE AI WEBSITE
          (HTML, CSS, JS)
               |
               v
          FASTAPI BACKEND
               |
       +-------+--------+
       |       |        |
       v       v        v
     FOOD   FRESHNESS  HYGIENE
  RECOGNITION DETECTION DETECTION
       |       |        |
       +-------+--------+
               |
               v
       NUTRITION ESTIMATION
               |
       +-------+--------+
       |                |
       v                v
 SMART COOKING     MEAL PLANNER
  ASSISTANT
               |
               v
        RESULTS TO USER
```

## 🔍 Project Scope

Food Verse AI focuses on combining multiple food-related intelligent features into one application.

**Current Scope:**
- Food image recognition.
- Nutritional information estimation.
- Food freshness classification.
- Kitchen hygiene and PPE detection.
- Ingredient-based recipe suggestions.
- Vegetarian and Non-Vegetarian meal planning.

**Future Scope:**
- Food portion-size estimation.
- Personalized meal planning based on fitness goals.
- More advanced nutritional recommendations.
- Multilingual support.
- Mobile application development.
- Improved real-time kitchen monitoring.

## 🌐 Project Links

**Live Demo:**  
https://food-verse-ai-psi.vercel.app/

**GitHub Repository:**  
https://github.com/Vanshika-rgb0622/FoodVerseAI

## 📌 Conclusion

Food Verse AI demonstrates how Artificial Intelligence and Deep Learning can be used to make food analysis and kitchen assistance smarter and more convenient.

By combining food recognition, nutrition estimation, freshness detection, hygiene monitoring, recipe generation and meal planning, this project provides multiple useful features through a single platform.

The project also provides a foundation for future improvements in smart food technology and intelligent kitchen applications.

---

<p align="center">

### 🍎 Food Verse AI
**Making Food Intelligence Smarter!**

</p>
