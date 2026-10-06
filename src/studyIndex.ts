import type { Session, Subject } from './model';

export function subjectStudyIndex(subjects: Subject[], sessions: Session[]) {
  const index = new Map(subjects.map(subject => [subject.id, { count: 0, seconds: 0, latest: undefined as Session | undefined }]));
  for (const session of sessions) {
    const summary = index.get(session.subjectId);
    if (!summary) continue;
    summary.count += 1;
    summary.seconds += session.seconds;
    summary.latest ??= session;
  }
  return index;
}
