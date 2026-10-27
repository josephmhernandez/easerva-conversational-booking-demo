export type PostAccurateResponseStruct = {
  success: boolean;
  questionId: string;
  questionText: string;
  response: string;
  accuracy: number;
  timestamp: string;
};

export async function postAccurateResponse(
  actor: any,
  questionId: string,
  questionText: string,
  response: string,
  accuracy: number
): Promise<PostAccurateResponseStruct> {
  console.log(`[MCP] Posting accurate response for question ${questionId}: ${response}`);

  // Send event to state machine to process the response
  actor.send({
    type: "VALID_SERVICE_QUESTION_ANSWER",
    output: {
      valid: accuracy > 0.5,
      answer: response,
    },
  });

  return {
    success: true,
    questionId: questionId,
    questionText: questionText,
    response: response,
    accuracy: accuracy,
    timestamp: new Date().toISOString(),
  } as PostAccurateResponseStruct;
}
