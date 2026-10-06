import type { StudyData } from './model';

export function localDay(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function studyStreak(data: Pick<StudyData, 'sessions' | 'reviews' | 'reviewHistory' | 'answers'>, now = Date.now()) {
  const activeDays = new Set<string>();
  const include = (timestamp: number) => {
    if (Number.isFinite(timestamp) && timestamp >= 0 && timestamp <= now) activeDays.add(localDay(timestamp));
  };
  for (const session of data.sessions) {
    if (Number.isFinite(session.seconds) && session.seconds > 0) include(session.completedAt);
  }
  // Older backups retain only the latest review; new reviews keep each date.
  for (const review of data.reviews) if (review.lastReviewedAt !== undefined) include(review.lastReviewedAt);
  for (const review of data.reviewHistory ?? []) include(review.reviewedAt);
  for (const answer of data.answers) include(answer.answeredAt);
  const studiedToday = activeDays.has(localDay(now));
  const day = new Date(now);
  day.setHours(12, 0, 0, 0);
  if (!studiedToday) day.setDate(day.getDate() - 1);
  let count = 0;
  while (activeDays.has(localDay(day.getTime()))) {
    count += 1;
    day.setDate(day.getDate() - 1);
  }
  return { activeDays, studiedToday, count };
}
