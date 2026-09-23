export interface StudentProfile {
  name: string;
  goal: string;
  motivation: string;
  targetDate: string;
  subjects: string;
  level: string;
  routine: string;
  availableDays: string[];
  preferredTime: string;
  dailyMinutes: number;
  sessionMinutes: number;
  challenges: string;
  preferences: string;
  accessibility: string;
  completedAt: string | null;
  updatedAt: string | null;
  revision: number;
  plan: string;
  planStatus: "none" | "pending" | "ready" | "error";
  planProfileRevision: number;
  tutorialsSeen: string[];
}
export const emptyProfile = (name = ""): StudentProfile => ({
  name,
  goal: "",
  motivation: "",
  targetDate: "",
  subjects: "",
  level: "",
  routine: "",
  availableDays: [],
  preferredTime: "",
  dailyMinutes: 30,
  sessionMinutes: 25,
  challenges: "",
  preferences: "",
  accessibility: "",
  completedAt: null,
  updatedAt: null,
  revision: 0,
  plan: "",
  planStatus: "none",
  planProfileRevision: 0,
  tutorialsSeen: [],
});
export function profileContext(profile: StudentProfile) {
  const {
    name,
    goal,
    motivation,
    targetDate,
    subjects,
    level,
    routine,
    availableDays,
    preferredTime,
    dailyMinutes,
    sessionMinutes,
    challenges,
    preferences,
    accessibility,
    revision,
  } = profile;
  return {
    name,
    goal,
    motivation,
    targetDate,
    subjects,
    level,
    routine,
    availableDays,
    preferredTime,
    dailyMinutes,
    sessionMinutes,
    challenges,
    preferences,
    accessibility,
    revision,
  };
}

export const profileDays = [
  ["mon", "Seg"],
  ["tue", "Ter"],
  ["wed", "Qua"],
  ["thu", "Qui"],
  ["fri", "Sex"],
  ["sat", "Sáb"],
  ["sun", "Dom"],
] as const;
export const profileDaysLabel = (days: string[]) =>
  days
    .map((day) => profileDays.find(([id]) => id === day)?.[1] ?? day)
    .join(", ");
