/**
 * Assistant Greeting Engine
 *
 * Generates contextual, time-aware greetings from local data (zero AI cost).
 * Premium users get one AI-powered greeting per day on top of these.
 */

export interface GreetingData {
  name: string;
  streakDays: number;
  workoutsCompleted: number;
  totalScans: number;
  totalMeals: number;
  lastScanBF: number | null;
  goal: string;
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

/**
 * Returns a contextual greeting string based on user data and time of day.
 * No AI calls — entirely template-based for zero cost.
 */
export function getGreeting(data: GreetingData): string {
  const { name, streakDays, workoutsCompleted, totalScans, totalMeals, lastScanBF, goal } = data;
  const time = getTimeOfDay();
  const firstName = name.split(" ")[0];

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
      `Welcome to PeakPulse, ${firstName}! Tap here if you need help getting started.`,
      `Hey ${firstName}! I'm your AI fitness companion. Ask me anything about workouts or nutrition.`,
      `Good ${time}, ${firstName}! Ready to start your fitness journey? I'm here to help.`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Priority 4: Time-of-day contextual greetings
  const pool: string[] = [];

  if (time === "morning") {
    pool.push(
      `Good morning, ${firstName}! ${isMonday() ? "New week, new gains. Let's go!" : "Ready to crush today?"}`,
      `Rise and grind, ${firstName}! ${streakDays > 0 ? `Day ${streakDays + 1} of your streak awaits.` : "Let's make today count."}`,
    );
    if (totalMeals > 0) {
      pool.push(`Morning, ${firstName}! Don't forget to log your breakfast for accurate tracking.`);
    }
  }

  if (time === "afternoon") {
    pool.push(
      `Good afternoon, ${firstName}! ${isFriday() ? "Finish the week strong!" : "How's your day going?"}`,
      `Hey ${firstName}! ${workoutsCompleted > 0 ? `${workoutsCompleted} workouts logged so far. Keep it up!` : "Have you worked out today?"}`,
    );
  }

  if (time === "evening") {
    pool.push(
      `Good evening, ${firstName}! ${isWeekend() ? "Rest day or grind day?" : "Time for an evening session?"}`,
      `Hey ${firstName}! ${streakDays > 0 ? `${streakDays}-day streak on the line. Don't break it!` : "An evening workout can do wonders."}`,
    );
    if (totalMeals > 0) {
      pool.push(`Evening, ${firstName}! Have you logged your dinner yet?`);
    }
  }

  if (time === "night") {
    pool.push(
      `Hey ${firstName}, winding down? Great time to plan tomorrow's workout.`,
      `Good night, ${firstName}! Rest is when muscles grow. Sleep well.`,
    );
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

  // Pick a random greeting from the pool
  if (pool.length === 0) {
    return `Hey ${firstName}! How can I help you today?`;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
