/**
 * Assistant Greeting Engine — Enhanced
 *
 * Generates contextual, time-aware greetings with meal reminders,
 * workout nudges, progress insights, and momentum tracking.
 * Zero AI cost — entirely template-based.
 */

export interface GreetingData {
  name: string;
  streakDays: number;
  workoutsCompleted: number;
  totalScans: number;
  totalMeals: number;
  lastScanBF: number | null;
  goal: string;
  todayCalories?: number;
  calorieGoal?: number;
  todayMealsLogged?: number;
  hasWorkoutToday?: boolean;
  wearableSteps?: number;
  wearableCaloriesBurnt?: number;
  wearableSleepHours?: number;
  pantryExpiringCount?: number;
  lastWorkoutDaysAgo?: number;
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

function getDayOfWeek(): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
}

function isMonday(): boolean { return new Date().getDay() === 1; }
function isFriday(): boolean { return new Date().getDay() === 5; }
function isWeekend(): boolean { const d = new Date().getDay(); return d === 0 || d === 6; }

function getMealForTime(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return "breakfast";
  if (h >= 10 && h < 12) return "snack";
  if (h >= 12 && h < 14) return "lunch";
  if (h >= 14 && h < 17) return "snack";
  if (h >= 17 && h < 20) return "dinner";
  return "snack";
}

/**
 * Returns a contextual greeting string based on user data and time of day.
 */
export function getGreeting(data: GreetingData): string {
  const {
    name, streakDays, workoutsCompleted, totalScans, totalMeals,
    lastScanBF, goal, todayCalories, calorieGoal, todayMealsLogged,
    hasWorkoutToday, wearableSteps, wearableCaloriesBurnt, wearableSleepHours,
    pantryExpiringCount, lastWorkoutDaysAgo,
  } = data;
  const time = getTimeOfDay();
  const firstName = name.split(" ")[0];
  const meal = getMealForTime();

  // Priority 1: Streak milestones (keep short)
  if (streakDays >= 100) return `${streakDays}-day streak! Legendary, ${firstName}.`;
  if (streakDays >= 30 && streakDays % 10 === 0) return `${streakDays} days strong, ${firstName}!`;
  if (streakDays === 7) return `7-day streak! Week 2 starts now, ${firstName}.`;

  // Priority 2: Inactivity nudge
  if (streakDays === 0 && workoutsCompleted > 0) {
    return `Hey ${firstName}, one workout restarts your streak.`;
  }

  // Priority 3: New user
  if (workoutsCompleted === 0 && totalScans === 0) {
    const g = [
      `Welcome, ${firstName}! Tap here to get started.`,
      `Hey ${firstName}! Try a workout, body scan, or smart pantry.`,
      `Good ${time}, ${firstName}! Ready to begin?`,
    ];
    return g[Math.floor(Math.random() * g.length)];
  }

  // Priority 4: Contextual time-based greetings
  const pool: string[] = [];

  if (time === "morning") {
    pool.push(`Good morning, ${firstName}! ${isMonday() ? "New week — let's go!" : "Ready to crush it?"}`);
    if (streakDays > 0) pool.push(`Day ${streakDays + 1} awaits. Let's go!`);
    if ((todayMealsLogged ?? 0) === 0) {
      pool.push(`Time for ${meal}. Log it to stay on track.`);
    }
    if (hasWorkoutToday) pool.push(`Workout today — get it done early!`);
    if (wearableSleepHours && wearableSleepHours >= 7.5) {
      pool.push(`${wearableSleepHours}h sleep — solid recovery!`);
    } else if (wearableSleepHours && wearableSleepHours < 6) {
      pool.push(`${wearableSleepHours}h sleep — go easy today.`);
    }
  }

  if (time === "afternoon") {
    pool.push(`Good afternoon, ${firstName}! ${isFriday() ? "Finish strong!" : ""}`);
    if ((todayMealsLogged ?? 0) < 2) pool.push(`Time for ${meal}. Keep fuelling.`);
    if (todayCalories && calorieGoal) {
      const rem = calorieGoal - todayCalories;
      if (rem > 500) pool.push(`${rem} kcal left today. Fuel up!`);
      else if (rem > 0) pool.push(`Almost there — ${rem} kcal to go!`);
    }
    if (wearableSteps && wearableSteps >= 8000) {
      pool.push(`${wearableSteps.toLocaleString()} steps — crushing it!`);
    } else if (wearableSteps && wearableSteps < 3000) {
      pool.push(`${wearableSteps.toLocaleString()} steps. Quick walk?`);
    }
  }

  if (time === "evening") {
    pool.push(`Good evening, ${firstName}!`);
    if (streakDays > 0) pool.push(`${streakDays}-day streak on the line!`);
    if ((todayMealsLogged ?? 0) < 3) pool.push(`Log your ${meal} to stay on target.`);
    if (hasWorkoutToday && (lastWorkoutDaysAgo ?? 1) > 0) {
      pool.push(`Still time for today's workout!`);
    }
    if (wearableCaloriesBurnt && wearableCaloriesBurnt > 0) {
      pool.push(`${wearableCaloriesBurnt} cal burnt today. ${wearableCaloriesBurnt > 2000 ? "Great day!" : ""}`);
    }
    if (pantryExpiringCount && pantryExpiringCount > 0) {
      pool.push(`${pantryExpiringCount} pantry item${pantryExpiringCount > 1 ? "s" : ""} expiring soon.`);
    }
  }

  if (time === "night") {
    pool.push(`Winding down, ${firstName}? Rest is when gains happen.`);
    if (todayCalories && calorieGoal) {
      if (todayCalories >= calorieGoal * 0.9 && todayCalories <= calorieGoal * 1.1) {
        pool.push(`${todayCalories} kcal today — right on target!`);
      } else if (todayCalories < calorieGoal * 0.7) {
        pool.push(`Only ${todayCalories} kcal today. Aim for ${calorieGoal} tomorrow.`);
      }
    }
    if (streakDays > 3) pool.push(`${streakDays} days of momentum. Keep going!`);
  }

  // Goal-specific
  const gl = goal.toLowerCase();
  if (gl.includes("lose") || gl.includes("cut")) {
    pool.push(`Consistency beats intensity, ${firstName}.`);
    if (lastScanBF) pool.push(`Last scan: ${lastScanBF}% BF. Keep going!`);
  }
  if (gl.includes("muscle") || gl.includes("bulk")) {
    pool.push(`Trust the process — you're getting stronger.`);
  }

  // Stats
  if (workoutsCompleted >= 50) pool.push(`${workoutsCompleted} workouts done! Veteran status.`);
  if (totalScans >= 3) pool.push(`${totalScans} scans — check your progress comparison!`);

  // Day-specific
  if (isMonday()) pool.push(`Monday — fresh start!`);
  if (isFriday()) pool.push(`Friday! Finish the week strong.`);
  if (isWeekend()) pool.push(`Weekend — meal prep or extra workout?`);

  if (pool.length === 0) return `Hey ${firstName}! How can I help?`;
  return pool[Math.floor(Math.random() * pool.length)];
}
