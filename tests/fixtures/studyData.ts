import { freshData, type StudyData } from '../../src/model';
const referenceTime = new Date('2026-09-23T12:00:00Z').getTime();

export function performanceData(size: number): StudyData {
  const data = freshData();
  data.profile = { ...data.profile!, name: 'Perfil sintético', completedAt: new Date(referenceTime).toISOString(), tutorialsSeen: ['today', 'timer', 'subjects', 'reviews', 'questions', 'data'] };
  data.preferences = { theme: 'light', reducedMotion: true, sound: false };
  for (let index = 0; index < size; index++) {
    const subjectId = `s${index}`;
    const completedAt = referenceTime - (index % 28 + 1) * 86400000;
    data.subjects.push({ id: subjectId, name: `Matéria ${index}`, color: index % 5, createdAt: completedAt });
    data.sessions.push({ id: `f${index}`, subjectId, topic: `Tema ${index}`, seconds: 900, confidence: 2, notes: '', completedAt });
    data.reviews.push({ id: `r${index}`, subjectId, topic: `Tema ${index}`, stage: index % 5, dueAt: referenceTime - index, lastReviewedAt: completedAt });
    data.questions.push({ id: `q${index}`, subjectId, prompt: `Questão ${index}?`, options: ['A', 'B'], correct: 0, explanation: 'Exemplo sintético.' });
    data.answers.push({ id: `a${index}`, questionId: `q${index}`, selected: index % 2, correct: index % 2 === 0, answeredAt: completedAt });
  }
  data.timer.subjectId = data.subjects[0].id;
  return data;
}

