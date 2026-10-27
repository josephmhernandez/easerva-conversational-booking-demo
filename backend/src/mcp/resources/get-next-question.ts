export async function getNextQuestion(actor: any): Promise<any> {
  const snapshot = actor.getSnapshot();
  const questions = snapshot.context.questions;

  if (!questions || questions.length === 0) {
    return {
      questionId: null,
      questionText: "No more questions available",
      questionType: "text",
    };
  }

  const currentQuestion = questions[0];
  return {
    questionId: currentQuestion.id,
    questionText: currentQuestion.text,
    questionType: currentQuestion.questionType || "text",
  };
}
