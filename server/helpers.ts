import { z } from "zod";
import { invokeLLM, uploadVideoToGeminiFileAPI } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import * as db from "./db";

function randomSuffix() { return Math.random().toString(36).slice(2, 8); }

/** Get the subscription plan for a user (defaults to 'free' for guests) */
async function getUserPlan(userId: number | undefined): Promise<string> {
  if (!userId) return "free";
  const sub = await db.getUserSubscription(userId);
  return sub?.plan ?? "free";
}

/** Enforce AI limit for a user. Throws TRPCError if limit exceeded. */
async function checkAiLimit(userId: number | undefined, endpoint: string): Promise<void> {
  if (!userId) return; // guests bypass metering (limited by auth anyway)
  const plan = await getUserPlan(userId);
  try {
    await db.enforceAiLimit(userId, plan, endpoint);
  } catch (err: any) {
    if (typeof err?.message === "string" && err.message.startsWith("AI_LIMIT_EXCEEDED")) {
      const [, tierName, limit] = err.message.split(":");
      throw new Error(`AI_LIMIT_EXCEEDED:You have used all ${limit} AI calls for this month on the ${tierName} plan. Upgrade to Advanced for unlimited access.`);
    }
    throw err;
  }
}

function getBFDescription(bf: number): string {
  const descriptions: Record<number, string> = {
    5: "extremely lean, competition-ready physique: paper-thin skin with full muscle striations visible on chest, shoulders, and quads; deep separation between every muscle group; highly visible vascularity across arms, forearms, and lower abs; razor-sharp intercostal and serratus definition; virtually zero subcutaneous fat anywhere on the torso",
    8: "very lean physique: clearly visible six-pack abs with deep grooves between each segment; visible oblique lines forming a V-taper; pronounced muscle striations on chest and shoulders; prominent vascularity on arms and forearms; visible separation between quad muscles; minimal subcutaneous fat on torso and limbs",
    10: "lean, athletic physique: well-defined six-pack abs clearly visible without flexing; noticeable V-lines at the hip; visible muscle separation on arms and shoulders; moderate vascularity on forearms and biceps; chest has clear upper/lower definition; obliques visible but not deeply striated; a thin layer of subcutaneous fat softens extreme definition",
    12: "lean build with visible abs: upper four abs clearly defined, lower two faintly visible; some muscle separation on arms and shoulders when relaxed; V-taper visible at hips; chest shows good shape but less defined separation; arms show muscle contour but minimal vascularity; a light layer of fat across the torso slightly softens muscle edges",
    15: "athletic, fit build: faint ab outline visible especially in good lighting; arm and shoulder muscles visibly toned and shaped; chest has good fullness but no visible separation between pecs; moderate V-taper; a noticeable but thin fat layer covers the midsection; obliques are not visible; legs show muscle shape but no separation lines",
    18: "fit-average build: no visible ab definition; torso appears smooth with an even layer of subcutaneous fat; arms and shoulders show general muscle shape beneath a soft layer; chest is full but undefined; waist has some soft tissue but no pronounced love handles; overall the body looks healthy and moderately active but without visible muscularity",
    20: "average build: no muscle definition visible; the midsection carries a noticeable layer of soft tissue creating a smooth, rounded torso; chest is soft with no visible pec outline; arms appear full but without visible muscle contour; mild love handles may be present; the body appears healthy but not actively trained",
    25: "softer physique: significant subcutaneous fat layer across the entire torso creating a rounded, smooth appearance; visible softness around the midsection and lower back; chest and arms appear full and soft; pronounced love handles; the waist-to-hip transition is smooth with no V-taper; face appears naturally fuller with rounded contours",
    30: "heavy-set build: thick layer of fat covering the torso; pronounced belly that extends forward; chest appears rounded and soft; arms are thick with no visible muscle definition; love handles are prominent; the chin area carries extra fullness; overall the body carries significant extra weight distributed across all areas",
  };
  const keys = Object.keys(descriptions).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((a, b) => Math.abs(b - bf) < Math.abs(a - bf) ? b : a);
  return descriptions[closest];
}

function getFaceTransformationDesc(currentBf: number, targetBf: number): string {
  // Use absolute target BF to describe the face, not just the delta.
  // This ensures each BF level always gets the same face description regardless of starting point.
  if (targetBf <= 8) {
    return "FACE at " + targetBf + "% BF: The face must appear extremely lean — sharp, angular jawline with zero softness under the chin; very prominent cheekbones with visible hollowing beneath them; temples slightly concave; neck appears thin and sinewy. The skin looks taut and tight across all facial bones. Despite the extreme leanness, the person must be clearly recognisable as the same individual from the reference photo (same eyes, nose shape, brow structure, skin tone, hair).";
  }
  if (targetBf <= 10) {
    return "FACE at " + targetBf + "% BF: The face must appear very lean — well-defined jawline with a sharp angle, no visible softness under the chin; cheekbones are prominent with slight shadowing beneath them; the face has an angular, athletic look. Neck appears lean. The person must be clearly recognisable as the same individual from the reference photo.";
  }
  if (targetBf <= 12) {
    return "FACE at " + targetBf + "% BF: The face must appear lean — clearly defined jawline with minimal softness, cheekbones visible but not hollowed; the face has a fit, healthy look with some angular definition. Very slight fullness under the chin is acceptable. The person must be clearly recognisable as the same individual from the reference photo.";
  }
  if (targetBf <= 15) {
    return "FACE at " + targetBf + "% BF: The face has a healthy, athletic appearance — the jawline is visible but not sharply defined; cheekbones have some definition but the face retains a natural fullness; a small amount of softness under the chin and along the jaw. The person must be clearly recognisable as the same individual from the reference photo.";
  }
  if (targetBf <= 18) {
    return "FACE at " + targetBf + "% BF: The face appears average and healthy — a soft but visible jawline; cheeks are naturally full without appearing puffy; moderate softness under the chin; the face looks neither lean nor heavy, just naturally proportioned. The person must be clearly recognisable as the same individual from the reference photo.";
  }
  if (targetBf <= 20) {
    return "FACE at " + targetBf + "% BF: The face appears slightly soft — the jawline is present but obscured by a thin layer of fat; cheeks are full and rounded; noticeable softness under the chin; the face has a healthy, relaxed look with no angular definition. The person must be clearly recognisable as the same individual from the reference photo.";
  }
  // 25%+
  return "FACE at " + targetBf + "% BF: The face appears noticeably full and rounded — the jawline is soft and not clearly defined; cheeks are full and prominent; visible double-chin or significant under-chin softness; the face has a wider, rounder appearance overall. The person must be clearly recognisable as the same individual from the reference photo.";
}

function getFallbackWorkoutPlan(goal: string) {
  return [
    { day: "Monday", focus: "Push Day", isRest: false, exercises: [
      { name: "Bench Press", sets: "4x8", rest: "90s", notes: "" },
      { name: "Shoulder Press", sets: "3x10", rest: "75s", notes: "" },
      { name: "Tricep Pushdown", sets: "3x12", rest: "60s", notes: "" },
    ]},
    { day: "Tuesday", focus: "Pull Day", isRest: false, exercises: [
      { name: "Deadlift", sets: "4x6", rest: "120s", notes: "" },
      { name: "Bent-over Row", sets: "4x8", rest: "90s", notes: "" },
      { name: "Pull-ups", sets: "3xMax", rest: "90s", notes: "" },
    ]},
    { day: "Wednesday", focus: "Rest & Recovery", isRest: true, exercises: [
      { name: "Light Walk", sets: "20-30min", rest: "", notes: "" },
      { name: "Stretching", sets: "10min", rest: "", notes: "" },
    ]},
    { day: "Thursday", focus: "Leg Day", isRest: false, exercises: [
      { name: "Barbell Squat", sets: "4x8", rest: "120s", notes: "" },
      { name: "Romanian Deadlift", sets: "3x10", rest: "90s", notes: "" },
      { name: "Leg Press", sets: "3x12", rest: "75s", notes: "" },
    ]},
    { day: "Friday", focus: "Upper Body", isRest: false, exercises: [
      { name: "Overhead Press", sets: "4x8", rest: "90s", notes: "" },
      { name: "Weighted Pull-ups", sets: "3x8", rest: "90s", notes: "" },
      { name: "DB Flies", sets: "3x12", rest: "60s", notes: "" },
    ]},
    { day: "Saturday", focus: "Rest & Recovery", isRest: true, exercises: [
      { name: "Foam Rolling", sets: "10min", rest: "", notes: "" },
      { name: "Yoga/Stretching", sets: "20min", rest: "", notes: "" },
    ]},
    { day: "Sunday", focus: "Rest", isRest: true, exercises: [
      { name: "Sleep 7-9hrs", sets: "tonight", rest: "", notes: "" },
    ]},
  ];
}

/** Build strict dietary restriction instructions for the AI prompt */
function getDietaryRestrictions(preference: string): string {
  const restrictions: Record<string, string> = {
    vegan: `STRICT VEGAN DIET — MANDATORY RULES:
• ABSOLUTELY NO animal products of any kind: no meat, poultry, fish, seafood, dairy, eggs, honey, gelatin, whey, casein, or any animal-derived ingredients.
• Every single meal and snack must be 100% plant-based.
• Use plant proteins: tofu, tempeh, seitan, legumes (lentils, chickpeas, black beans), edamame, quinoa, nuts, seeds.
• Use plant milks (oat, soy, almond), nutritional yeast, plant-based yogurt.
• If you include a meal that contains ANY animal product, the entire plan is invalid.`,

    vegetarian: `STRICT VEGETARIAN DIET — MANDATORY RULES:
• NO meat, poultry, fish, or seafood of any kind.
• Dairy and eggs are permitted.
• Focus on diverse protein sources: eggs, Greek yogurt, cottage cheese, legumes, tofu, tempeh, nuts, seeds, quinoa.
• If you include a meal with meat, poultry, or fish, the entire plan is invalid.`,

    halal: `STRICT HALAL DIET — MANDATORY RULES:
• ALL meat must be halal-certified (zabiha). Use only halal chicken, halal beef, halal lamb.
• ABSOLUTELY NO pork, bacon, ham, prosciutto, pepperoni, lard, or any pork-derived products.
• NO alcohol or alcohol-based ingredients (wine, beer, rum, vanilla extract with alcohol).
• NO gelatin unless specified as halal gelatin.
• Seafood (fish, shrimp) is generally permissible.
• If any meal contains pork or non-halal meat, the entire plan is invalid.`,

    kosher: `STRICT KOSHER DIET — MANDATORY RULES:
• NO pork or shellfish.
• Do NOT mix meat and dairy in the same meal.
• Use only kosher-certified meats.
• Fish with fins and scales are permitted.
• Keep meat meals and dairy meals completely separate.`,

    keto: `STRICT KETOGENIC DIET — MANDATORY RULES:
• Maximum 20-30g net carbs per day across ALL meals.
• Each meal should be: ~70-75% calories from fat, ~20-25% protein, ~5% carbs.
• NO bread, pasta, rice, potatoes, sugar, fruit juice, or high-carb fruits.
• ALLOWED: meat, fatty fish, eggs, butter, cheese, nuts, seeds, avocado, olive oil, coconut oil, low-carb vegetables (spinach, kale, broccoli, cauliflower, zucchini).
• Include net carb count for each meal.
• If any single meal exceeds 10g net carbs, the plan is invalid.`,

    paleo: `STRICT PALEO DIET — MANDATORY RULES:
• NO grains (wheat, rice, oats, corn), legumes (beans, lentils, peanuts), dairy, refined sugar, or processed foods.
• ALLOWED: meat, fish, eggs, vegetables, fruits, nuts (except peanuts), seeds, olive oil, coconut oil, sweet potatoes.
• Focus on whole, unprocessed foods only.`,

    pescatarian: `STRICT PESCATARIAN DIET — MANDATORY RULES:
• NO meat or poultry (chicken, beef, pork, lamb, turkey, etc.).
• Fish and seafood ARE allowed and should be the primary animal protein.
• Dairy and eggs are permitted.
• Include a variety of fish: salmon, tuna, cod, shrimp, sardines.`,

    "gluten-free": `STRICT GLUTEN-FREE DIET — MANDATORY RULES:
• ABSOLUTELY NO wheat, barley, rye, or any gluten-containing grains.
• NO regular bread, pasta, flour tortillas, soy sauce (use tamari), beer, or most cereals.
• ALLOWED grains: rice, quinoa, oats (certified GF), buckwheat, millet, corn.
• Check all sauces and condiments for hidden gluten.`,

    "dairy-free": `STRICT DAIRY-FREE DIET — MANDATORY RULES:
• NO milk, cheese, butter, cream, yogurt, ice cream, whey, or casein.
• Use plant-based alternatives: oat milk, coconut cream, cashew cheese, vegan butter.
• Check all processed foods for hidden dairy ingredients.`,
  };

  const key = preference.toLowerCase().replace(/[\s_]+/g, "-");
  if (key === "omnivore" || key === "none" || !restrictions[key]) {
    return "No specific dietary restrictions. Include a balanced variety of proteins, carbs, and fats.";
  }
  return restrictions[key];
}


export { randomSuffix, getUserPlan, checkAiLimit, getBFDescription, getFaceTransformationDesc, getFallbackWorkoutPlan, getDietaryRestrictions };
export { db, invokeLLM, uploadVideoToGeminiFileAPI, generateImage, storagePut };
