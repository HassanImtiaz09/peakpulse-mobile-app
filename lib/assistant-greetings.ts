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
  // Enhanced data for contextual reminders
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
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
}

function isMonday(): boolean { return new Date().getDay() === 1; }
function isFriday(): boolean { return new Date().getDay() === 5; }
function isWeekend(): boolean { const d = new Date().getDay(); return d === 0 || d === 6; }

function getMealForTime(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return "breakfast";
  if (h >= 10 && h < 12) return "mid-morning snack";
  if (h >= 12 && h < 14) return "lunch";
  if (h >= 14 && h < 17) return "afternoon snack";
  if (h >= 17 && h < 20) return "dinner";
  return "evening snack";
}

/**
 * Returns a contextual greeting string based on user data and time of day.
 * Includes meal reminders, workout nudges, and progress momentum.
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
  const day = getDayOfWeek();

  // Priority 1: Streak milestones
  if (streakDays >= 100) {
    return `${streakDays}-day streak! You're in the top 1% of PeakPulse users, ${firstName}. Legendary.`;
  }
  if (streakDays >= 30 && streakDays % 10 === 0) {
    return `${streakDays} days strong! Your consistency is paying off, ${firstName}. Keep pushing.`;
  }
  if (streakDays === 7) {
    return `One full week! Your 7-day streak shows real commitment, ${firstName}. Week 2 starts now.`;
  }

  // Priority 2: Inactivity encouragement
  if (streakDays === 0 && workoutsCompleted > 0) {
    return `Hey ${firstName}, ready to restart your streak? One workout is all it takes.`;
  }

  // Priority 3: New user welcome
  if (workoutsCompleted === 0 && totalScans === 0) {
    const greetings = [
      `Welcome to PeakPulse, ${firstName}! I'm your AI fitness coach. Tap here if you need help getting started.`,
      `Hey ${firstName}! I'm your personal AI companion. Try generating a workout plan, scanning your body, or checking your smart pantry.`,
      `Good ${time}, ${firstName}! Ready to start your fitness journey? I can help with workouts, meals, body scans, and more.`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Priority 4: Contextual meal/workout reminders based on time
  const pool: string[] = [];

  // ── Morning greetings with breakfast reminder ──
  if (time === "morning") {
    pool.push(
      `Good morning, ${firstName}! ${isMonday() ? "New week, new gains. Let's go!" : "Ready to crush today?"}`,
      `Rise and grind, ${firstName}! ${streakDays > 0 ? `Day ${streakDays + 1} of your streak awaits.` : "Let's make today count."}`,
    );
    // Meal reminder
    if ((todayMealsLogged ?? 0) === 0) {
      pool.push(`Morning, ${firstName}! Time for ${meal}. Log it to stay on track with your ${calorieGoal ? `${calorieGoal} kcal` : "calorie"} goal.`);
      pool.push(`Good morning! Don't skip ${meal} — it sets the tone for your whole day. Log it when you're ready.`);
    }
    // Workout reminder
    if (hasWorkoutToday) {
      pool.push(`Good morning, ${firstName}! You have a workout scheduled today. Let's get it done early for maximum energy.`);
    }
    // Sleep insight from wearable
    if (wearableSleepHours && wearableSleepHours > 0) {
      if (wearableSleepHours >= 7.5) {
        pool.push(`Good morning! You got ${wearableSleepHours}h of sleep last night — solid recovery. You should feel strong today.`);
      } else if (wearableSleepHours < 6) {
        pool.push(`Morning, ${firstName}. Only ${wearableSleepHours}h of sleep — consider a lighter workout today and prioritise rest tonight.`);
      }
    }
  }

  // ── Afternoon greetings with lunch reminder ──
  if (time === "afternoon") {
    pool.push(
      `Good afternoon, ${firstName}! ${isFriday() ? "Finish the week strong!" : "How's your day going?"}`,
      `Hey ${firstName}! ${workoutsCompleted > 0 ? `${workoutsCompleted} workouts logged so far. Keep it up!` : "Have you worked out today?"}`,
    );
    // Meal reminder
    if ((todayMealsLogged ?? 0) < 2) {
      pool.push(`Afternoon, ${firstName}! Time for ${meal}. Consistent nutrition is key to your ${goal.replace(/_/g, " ")} goal.`);
    }
    // Calorie progress
    if (todayCalories && calorieGoal && todayCalories > 0) {
      const remaining = calorieGoal - todayCalories;
      if (remaining > 500) {
        pool.push(`You've logged ${todayCalories} kcal so far — ${remaining} kcal remaining. Make sure to fuel up for the rest of the day.`);
      } else if (remaining > 0) {
        pool.push(`Almost there! ${remaining} kcal left to hit your daily target. You're doing great, ${firstName}.`);
      }
    }
    // Steps progress from wearable
    if (wearableSteps && wearableSteps > 0) {
      if (wearableSteps >= 8000) {
        pool.push(`${wearableSteps.toLocaleString()} steps already! You're crushing your activity goal today.`);
      } else if (wearableSteps < 3000) {
        pool.push(`${wearableSteps.toLocaleString()} steps so far — try a quick walk to boost your daily activity and burn extra calories.`);
      }
    }
  }

  // ── Evening greetings with dinner reminder ──
  if (time === "evening") {
    pool.push(
      `Good evening, ${firstName}! ${isWeekend() ? "Rest day or grind day?" : "Time for an evening session?"}`,
      `Hey ${firstName}! ${streakDays > 0 ? `${streakDays}-day streak on the line. Don't break it!` : "An evening workout can do wonders."}`,
    );
    // Dinner reminder
    if ((todayMealsLogged ?? 0) < 3) {
      pool.push(`Evening, ${firstName}! Don't forget to log your ${meal}. Tracking dinner helps you stay within your daily targets.`);
    }
    // Workout reminder if not done
    if (hasWorkoutToday && (lastWorkoutDaysAgo ?? 1) > 0) {
      pool.push(`You have a workout scheduled today, ${firstName}. There's still time for an evening session!`);
    }
    // Wearable calorie summary
    if (wearableCaloriesBurnt && wearableCaloriesBurnt > 0) {
      pool.push(`Your wearable shows ${wearableCaloriesBurnt} calories burnt today. ${wearableCaloriesBurnt > 2000 ? "Great active day!" : "Every calorie counts."}`);
    }
    // Pantry expiry alert
    if (pantryExpiringCount && pantryExpiringCount > 0) {
      pool.push(`Heads up: ${pantryExpiringCount} pantry item${pantryExpiringCount > 1 ? "s" : ""} expiring soon. Check your pantry to use them before they go to waste.`);
    }
  }

  // ── Night greetings with recovery focus ──
  if (time === "night") {
    pool.push(
      `Hey ${firstName}, winding down? Great time to plan tomorrow's workout.`,
      `Good night, ${firstName}! Rest is when muscles grow. Sleep well.`,
    );
    // Calorie summary
    if (todayCalories && calorieGoal) {
      if (todayCalories >= calorieGoal * 0.9 && todayCalories <= calorieGoal * 1.1) {
        pool.push(`Great job today! You hit ${todayCalories} kcal — right on target. Consistency like this builds results.`);
      } else if (todayCalories < calorieGoal * 0.7) {
        pool.push(`You only logged ${todayCalories} kcal today. Under-eating can slow your progress — try to hit closer to ${calorieGoal} kcal tomorrow.`);
      }
    }
    // Weekly momentum
    if (streakDays > 3) {
      pool.push(`${streakDays} days of momentum, ${firstName}. You're building a habit that will transform your body. Keep it going.`);
    }
  }

  // Priority 5: Goal-specific greetings
  const goalLower = goal.toLowerCase();
  if (goalLower.includes("lose") || goalLower.includes("weight loss") || goalLower.includes("cut")) {
    pool.push(`Remember, ${firstName}: consistency beats intensity. You're on the right track.`);
    if (lastScanBF) {
      pool.push(`Your last body fat reading was ${lastScanBF}%. Keep going — every percentage point counts.`);
    }
  }
  if (goalLower.includes("muscle") || goalLower.includes("bulk") || goalLower.includes("gain")) {
    pool.push(`Building muscle takes time, ${firstName}. Trust the process — you're getting stronger.`);
  }
  if (goalLower.includes("health") || goalLower.includes("general")) {
    pool.push(`Every workout counts, ${firstName}. You're investing in your future self.`);
  }

  // Priority 6: Stats-based greetings
  if (workoutsCompleted >= 50) {
    pool.push(`${workoutsCompleted} workouts completed! You're a PeakPulse veteran, ${firstName}.`);
  }
  if (totalScans >= 3) {
    pool.push(`With ${totalScans} body scans, you have great progress data. Check your comparison view!`);
  }

  // Priority 7: Day-specific motivation
  if (isMonday()) {
    pool.push(`Happy ${day}, ${firstName}! Fresh week, fresh start. What's the plan?`);
  }
  if (isFriday()) {
    pool.push(`It's ${day}! Finish the week strong and set yourself up for a great weekend.`);
  }
  if (isWeekend()) {
    pool.push(`${day} vibes! Use the extra time to meal prep or try a new workout.`);
  }

  // Pick a random greeting from the pool
  if (pool.length === 0) {
    return `Hey ${firstName}! How can I help you today?`;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
