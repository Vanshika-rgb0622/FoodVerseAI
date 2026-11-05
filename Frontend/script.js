"use strict";

// Local FastAPI backend address.
const API_BASE = "http://127.0.0.1:8000";

// Food analysis elements.
const foodForm = document.getElementById("foodForm");
const foodImage = document.getElementById("foodImage");
const foodPreview = document.getElementById("foodPreview");
const foodFileName = document.getElementById("foodFileName");
const foodStatus = document.getElementById("foodStatus");
const foodResults = document.getElementById("foodResults");

// Freshness analysis elements.
const freshnessForm = document.getElementById("freshnessForm");
const freshnessImage = document.getElementById("freshnessImage");
const freshnessStatus = document.getElementById("freshnessStatus");
const freshnessResults = document.getElementById("freshnessResults");

// Meal planner elements.
const mealForm = document.getElementById("mealForm");
const mealPreference = document.getElementById("mealPreference");
const mealResults = document.getElementById("mealResults");

// Theme toggle.
const themeToggle = document.getElementById("themeToggle");

// Display a status message.
function setStatus(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error", isError);
}

// Format percentages.
function formatPercent(value) {
    if (value === null || value === undefined || value === "") {
        return "N/A";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? `${number.toFixed(2)}%`
        : "N/A";
}

// Format numerical values.
function formatNumber(value) {
    if (value === null || value === undefined || value === "") {
        return "N/A";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number.toLocaleString()
        : "N/A";
}

// Safely create a text element.
function addTextElement(parent, tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = text;
    parent.appendChild(element);

    return element;
}

// Add a nutrition metric.
function addMetric(parent, label, value) {
    const metric = document.createElement("div");
    metric.className = "metric";

    addTextElement(metric, "span", "", label);
    addTextElement(metric, "strong", "", value);

    parent.appendChild(metric);
}

// Add a results section.
function addSection(parent, title) {
    const section = document.createElement("section");
    section.className = "result-section";

    addTextElement(section, "h4", "", title);
    parent.appendChild(section);

    return section;
}

// Explain backend errors.
function showApiError(error, statusCode) {
    if (statusCode === 404 || statusCode === 405) {
        return "Endpoint not found. Please check the backend route.";
    }

    if (statusCode === 413) {
        return "The image is too large for the server.";
    }

    if (statusCode === 422) {
        return "The upload was not accepted. Please choose a valid image.";
    }

    if (error instanceof TypeError) {
        return (
            "Could not connect to the backend. Make sure FastAPI is running " +
            "at " + API_BASE +
            " and that the frontend is opened through a local web server."
        );
    }

    return error.message || "Something went wrong. Please try again.";
}

// Upload an image to the backend.
async function postImage(endpoint, file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: formData
    });

    const rawBody = await response.text();
    let data;

    try {
        data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
        throw new Error("The backend returned an unexpected response.");
    }

    if (!response.ok) {
        const detail = typeof data.detail === "string"
            ? data.detail
            : `Request failed with status ${response.status}.`;

        const error = new Error(detail);
        error.statusCode = response.status;

        throw error;
    }

    return data;
}

// Check whether an image is supported.
function validateImage(file) {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!file) {
        return "Please select an image first.";
    }

    if (!allowedTypes.includes(file.type)) {
        return "Choose a JPG, PNG, or WEBP image.";
    }

    if (file.size > 10 * 1024 * 1024) {
        return "Please choose an image smaller than 10 MB.";
    }

    return null;
}

// Food image preview.
if (foodImage) {
    foodImage.addEventListener("change", () => {
        const file = foodImage.files[0];

        foodPreview.hidden = true;
        foodPreview.removeAttribute("src");

        if (!file) {
            foodFileName.textContent = "No image selected";
            setStatus(foodStatus, "");
            return;
        }

        const validationError = validateImage(file);

        if (validationError) {
            setStatus(foodStatus, validationError, true);

            foodImage.value = "";
            foodFileName.textContent = "No image selected";

            return;
        }

        foodFileName.textContent = file.name;
        setStatus(foodStatus, "");

        foodPreview.src = URL.createObjectURL(file);
        foodPreview.hidden = false;
    });
}

// Food recognition and nutrition analysis.
if (foodForm) {
    foodForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const file = foodImage.files[0];
        const validationError = validateImage(file);

        if (validationError) {
            setStatus(foodStatus, validationError, true);
            return;
        }

        const button = foodForm.querySelector('button[type="submit"]');

        button.disabled = true;
        button.textContent = "Analyzing...";
        foodResults.replaceChildren();

        setStatus(
            foodStatus,
            "Uploading image and waiting for the model..."
        );

        try {
            const data = await postImage("/upload-image", file);

            renderFoodResults(data);

            setStatus(foodStatus, "Analysis completed.");
        } catch (error) {
            const message = showApiError(error, error.statusCode);

            setStatus(foodStatus, message, true);

            addTextElement(foodResults, "p", "notice", message);
        } finally {
            button.disabled = false;
            button.textContent = "Analyze Food";
        }
    });
}

// Display food recognition and nutrition results.
function renderFoodResults(data) {
    foodResults.replaceChildren();

    const recognition = data.food_recognition || {};
    const nutrition = data.nutrition || {};
    const health = data.health_score || {};

    const title = document.createElement("div");
    title.className = "result-title";

    addTextElement(
        title,
        "h3",
        "",
        recognition.predicted_food || "Food prediction unavailable"
    );

    addTextElement(
        title,
        "span",
        "badge",
        `Confidence: ${formatPercent(recognition.confidence_percent)}`
    );

    foodResults.appendChild(title);

    // Nutrition metrics.
    const metrics = document.createElement("div");
    metrics.className = "metrics";

    addMetric(
        metrics,
        "Calories",
        `${formatNumber(nutrition.calories_kcal)} kcal`
    );

    addMetric(
        metrics,
        "Protein",
        `${formatNumber(nutrition.protein_g)} g`
    );

    addMetric(
        metrics,
        "Carbohydrates",
        `${formatNumber(nutrition.carbohydrates_g)} g`
    );

    addMetric(
        metrics,
        "Fat",
        `${formatNumber(nutrition.fat_g)} g`
    );

    foodResults.appendChild(metrics);

    addTextElement(
        foodResults,
        "p",
        "result-note",
        `Nutrition values are estimates per ${formatNumber(
            nutrition.serving_size_g
        )} g.`
    );

    // Estimated health score.
    const healthSection = addSection(
        foodResults,
        "Estimated health score"
    );

    if (health.score !== undefined && health.score !== null) {
        addTextElement(
            healthSection,
            "p",
            "",
            `${formatNumber(health.score)}/${formatNumber(
                health.out_of
            )} — ${health.category || "Uncategorized"}`
        );
    } else {
        addTextElement(
            healthSection,
            "p",
            "",
            "Health score unavailable."
        );
    }

    addTextElement(
        healthSection,
        "p",
        "notice",
        health.notice ||
        "This estimate is experimental and is not a validated nutrition rating."
    );

    // Alternative predictions.
    const predictions = Array.isArray(recognition.top_predictions)
        ? recognition.top_predictions
        : [];

    if (predictions.length > 0) {
        const predictionSection = addSection(
            foodResults,
            "Other model predictions"
        );

        predictions.forEach((prediction) => {
            const row = document.createElement("div");
            row.className = "prediction-row";

            addTextElement(
                row,
                "span",
                "",
                prediction.food || "Unknown"
            );

            addTextElement(
                row,
                "strong",
                "",
                formatPercent(prediction.confidence_percent)
            );

            predictionSection.appendChild(row);
        });
    }


// Hygiene information, if provided by the backend.
const hygiene = data.hygiene_analysis || {};
const indicators = hygiene.indicators || {};
const detections = Array.isArray(hygiene.detections)
    ? hygiene.detections
    : [];

const hygieneSection = addSection(
    foodResults,
    "Hygiene analysis"
);

addTextElement(
    hygieneSection,
    "p",
    "",
    hygiene.message || "No hygiene assessment is available."
);

addTextElement(
    hygieneSection,
    "p",
    "",
    `Gloves detected: ${
    indicators.gloves_detected === true ? "Detected" :
    indicators.gloves_detected === false ? "Not detected" :
    "Not determined"
    }`
);

addTextElement(
    hygieneSection,
    "p",
    "",
    `No-gloves indicator: ${
        indicators.no_gloves_detected === true ? "Detected" :
        indicators.no_gloves_detected === false ? "Not detected" :
        "Not determined"
    }`
);

if (detections.length > 0) {
    const detectionSection = addSection(
        hygieneSection,
        "Detected PPE indicators"
    );

    detections.forEach((item) => {
        const row = document.createElement("div");
        row.className = "prediction-row";

        addTextElement(
            row,
            "span",
            "",
            item.class || "Unknown"
        );

        addTextElement(
            row,
            "strong",
            "",
            formatPercent(Number(item.confidence) * 100)
        );

        detectionSection.appendChild(row);
    });
} else {
    addTextElement(
        hygieneSection,
        "p",
        "notice",
        "No PPE indicators were detected by the model."
    );
}

addTextElement(
    hygieneSection,
    "p",
    "notice",
    hygiene.disclaimer ||
    "This visual analysis cannot establish overall hygiene or food safety."
);


    addTextElement(
        foodResults,
        "p",
        "notice",
        "AI predictions can be incorrect. Nutrition and health scores are estimates."
    );
}

// Freshness prediction.
if (freshnessForm) {
    freshnessForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const file = freshnessImage.files[0];
        const validationError = validateImage(file);

        if (validationError) {
            setStatus(freshnessStatus, validationError, true);
            return;
        }

        const button = freshnessForm.querySelector(
            'button[type="submit"]'
        );

        button.disabled = true;
        button.textContent = "Checking...";
        freshnessResults.replaceChildren();

        setStatus(
            freshnessStatus,
            "Waiting for the freshness model..."
        );

        try {
            const data = await postImage("/check-freshness", file);
            const detection = data.freshness_detection || {};

            const section = document.createElement("div");
            section.className = "result-section";

            addTextElement(
                section,
                "h3",
                "",
                "Freshness prediction"
            );

            addTextElement(
                section,
                "p",
                "",
                `Prediction: ${
                    detection.predicted_freshness || "Unavailable"
                }`
            );

            addTextElement(
                section,
                "p",
                "",
                `Model confidence: ${
                    formatPercent(detection.confidence_percent)
                }`
            );

            const predictions = Array.isArray(detection.predictions)
                ? detection.predictions
                : [];

            predictions.forEach((prediction) => {
                const row = document.createElement("div");
                row.className = "prediction-row";

                addTextElement(
                    row,
                    "span",
                    "",
                    prediction.label || "Unknown"
                );

                addTextElement(
                    row,
                    "strong",
                    "",
                    formatPercent(prediction.confidence_percent)
                );

                section.appendChild(row);
            });

            addTextElement(
                section,
                "p",
                "notice",
                data.notice ||
                "Experimental prediction only. This result cannot confirm whether food is safe to eat."
            );

            freshnessResults.appendChild(section);

            setStatus(freshnessStatus, "Prediction completed.");
        } catch (error) {
            setStatus(
                freshnessStatus,
                showApiError(error, error.statusCode),
                true
            );
        } finally {
            button.disabled = false;
            button.textContent = "Check Freshness";
        }
    });
}


// ==========================================
// PERSONALIZED MEAL PLANNER
// Rule-based prototype
// ==========================================

const mealGoal = document.getElementById("mealGoal");

// Sample meal recommendations based on preference and goal.
const personalizedMealPlans = {
    vegetarian: {
        balanced: [
            {
                name: "Breakfast",
                description: "Oatmeal with milk or a fortified alternative, fruit and nuts."
            },
            {
                name: "Lunch",
                description: "Dal, roti or rice, seasonal vegetables and curd or a suitable alternative."
            },
            {
                name: "Snacks",
                description: "Fresh fruit with roasted chickpeas."
            },
            {
                name: "Dinner",
                description: "Vegetable khichdi with curd or a suitable alternative."
            }
        ],

        energy: [
            {
                name: "Breakfast",
                description: "Whole-grain toast, banana and milk or a fortified alternative."
            },
            {
                name: "Lunch",
                description: "Rice, dal, mixed vegetables and curd."
            },
            {
                name: "Snacks",
                description: "Banana and a handful of nuts."
            },
            {
                name: "Dinner",
                description: "Vegetable pulao with dal and curd."
            }
        ],

        protein: [
            {
                name: "Breakfast",
                description: "Besan chilla with curd or a suitable alternative."
            },
            {
                name: "Lunch",
                description: "Rajma, rice, vegetables and curd."
            },
            {
                name: "Snacks",
                description: "Roasted chickpeas with yogurt."
            },
            {
                name: "Dinner",
                description: "Paneer or tofu with roti and vegetables."
            }
        ]
    },

    "non-vegetarian": {
        balanced: [
            {
                name: "Breakfast",
                description: "Eggs with whole-grain toast and fruit."
            },
            {
                name: "Lunch",
                description: "Chicken or beans with rice or roti and vegetables."
            },
            {
                name: "Snacks",
                description: "Fruit with yogurt."
            },
            {
                name: "Dinner",
                description: "Fish or chicken with vegetables and rice or roti."
            }
        ],

        energy: [
            {
                name: "Breakfast",
                description: "Egg sandwich with whole-grain bread and a banana."
            },
            {
                name: "Lunch",
                description: "Chicken rice with vegetables and curd."
            },
            {
                name: "Snacks",
                description: "Fruit, nuts and yogurt."
            },
            {
                name: "Dinner",
                description: "Chicken or fish with rice and cooked vegetables."
            }
        ],

        protein: [
            {
                name: "Breakfast",
                description: "Boiled eggs with whole-grain toast and milk."
            },
            {
                name: "Lunch",
                description: "Grilled chicken with rice and vegetables."
            },
            {
                name: "Snacks",
                description: "Yogurt with roasted chickpeas."
            },
            {
                name: "Dinner",
                description: "Fish or chicken with dal, roti and vegetables."
            }
        ]
    }
};

// Generate a personalized sample meal plan.
if (mealForm) {
    mealForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const preference = mealPreference.value;
        const goal = mealGoal.value;

        const plan =
            personalizedMealPlans[preference]?.[goal];

        mealResults.replaceChildren();

        if (!plan) {
            addTextElement(
                mealResults,
                "p",
                "notice",
                "Unable to generate the meal plan. Please check your selections."
            );
            return;
        }

        const heading = document.createElement("h3");

        heading.textContent =
            `${preference === "vegetarian" ? "Vegetarian" : "Non-Vegetarian"} Meal Plan`;

        mealResults.appendChild(heading);

        const goalNames = {
            balanced: "Balanced Everyday Nutrition",
            energy: "Energy for Daily Activities",
            protein: "Protein-Inclusive Meals"
        };

        addTextElement(
            mealResults,
            "p",
            "result-note",
            `Selected goal: ${goalNames[goal]}`
        );

        plan.forEach((meal) => {
            const card = document.createElement("article");

            card.className = "meal-card";

            addTextElement(
                card,
                "h4",
                "",
                meal.name
            );

            addTextElement(
                card,
                "p",
                "",
                meal.description
            );

            mealResults.appendChild(card);
        });

        addTextElement(
            mealResults,
            "p",
            "notice",
            "This recommendation is generated using predefined rules based on your selected food preference and meal goal."
        );
    });
}

// Generate the sample meal plan.
if (mealForm) {
    mealForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const preference = mealPreference.value;
        const plan = samplePlans[preference] || samplePlans.vegetarian;

        mealResults.replaceChildren();

        plan.forEach((meal) => {
            const card = document.createElement("article");
            card.className = "meal-card";

            addTextElement(card, "h4", "", meal.name);
            addTextElement(card, "p", "", meal.description);

            mealResults.appendChild(card);
        });
    });
}

// Dark mode.
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark");

        themeToggle.textContent = isDark ? "☀️" : "🌙";

        themeToggle.setAttribute(
            "aria-label",
            isDark ? "Switch to light mode" : "Switch to dark mode"
        );

        localStorage.setItem(
            "foodVerseTheme",
            isDark ? "dark" : "light"
        );
    });

    // Restore the saved theme.
    const savedTheme = localStorage.getItem("foodVerseTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        themeToggle.textContent = "☀️";

        themeToggle.setAttribute(
            "aria-label",
            "Switch to light mode"
        );
    }
}

// Check backend availability.
fetch(`${API_BASE}/health`)
    .then((response) => {
        if (!response.ok) {
            throw new Error("Backend health check failed.");
        }

        return response.json();
    })
    .then((data) => {
        console.info("Food Verse AI backend status:", data);
    })
    .catch((error) => {
        console.warn(
            "Food Verse AI backend is not reachable yet. " +
            "Start FastAPI before testing uploads.",
            error.message
        );
    });

/* Smart Cooking Assistant */

const cookingForm = document.getElementById("cookingForm");
const cookingIngredients = document.getElementById("cookingIngredients");
const cookingResults = document.getElementById("cookingResults");

const cookingRecipes = [
    {
        name: "Vegetable Rice",
        ingredients: ["rice", "carrot", "peas", "onion"],
        instructions: [
            "Wash and prepare the rice.",
            "Saute onion and available vegetables.",
            "Add rice and water.",
            "Cook until the rice is tender."
        ],
        tip: "Adjust water according to the type of rice."
    },
    {
        name: "Potato Tomato Curry",
        ingredients: ["potato", "tomato", "onion"],
        instructions: [
            "Wash and cut the vegetables.",
            "Cook onion in a pan until soft.",
            "Add tomato and suitable spices.",
            "Add potato and water, then cook until tender."
        ],
        tip: "Check that potatoes are thoroughly cooked."
    },
    {
        name: "Vegetable Stir Fry",
        ingredients: ["carrot", "capsicum", "onion", "beans"],
        instructions: [
            "Wash and cut the vegetables.",
            "Heat a little cooking oil in a pan.",
            "Add vegetables and stir regularly.",
            "Cook until tender but not overcooked."
        ],
        tip: "Cut vegetables into similar-sized pieces."
    }
];

if (cookingForm) {
    cookingForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const ingredients = cookingIngredients.value
            .toLowerCase()
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);

        cookingResults.replaceChildren();

        if (ingredients.length === 0) {
            addTextElement(
                cookingResults,
                "p",
                "notice",
                "Please enter at least one ingredient."
            );
            return;
        }

        const matches = cookingRecipes
            .map(recipe => ({
                ...recipe,
                matched: recipe.ingredients.filter(item =>
                    ingredients.includes(item)
                )
            }))
            .filter(recipe => recipe.matched.length > 0)
            .sort((a, b) =>
                b.matched.length - a.matched.length
            );

        if (matches.length === 0) {
            addTextElement(
                cookingResults,
                "p",
                "notice",
                "No matching sample recipe found. Try ingredients such as rice, potato, tomato, onion, carrot or peas."
            );
            return;
        }

        matches.forEach(recipe => {
            const card = document.createElement("article");
            card.className = "recipe-card";

            addTextElement(card, "h3", "", recipe.name);

            addTextElement(
                card,
                "p",
                "",
                "Matching ingredients: " + recipe.matched.join(", ")
            );

            addTextElement(card, "h4", "", "Required ingredients");

            const list = document.createElement("ul");

            recipe.ingredients.forEach(item => {
                addTextElement(list, "li", "", item);
            });

            card.appendChild(list);

            addTextElement(
                card,
                "h4",
                "",
                "Cooking instructions"
            );

            const steps = document.createElement("ol");

            recipe.instructions.forEach(step => {
                addTextElement(steps, "li", "", step);
            });

            card.appendChild(steps);

            addTextElement(card, "h4", "", "Cooking tip");

            addTextElement(card, "p", "", recipe.tip);

            cookingResults.appendChild(card);
        });
    });
}
