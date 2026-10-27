import Anthropic from "@anthropic-ai/sdk";
import { Question } from "./machines/types";

export function isNudgeUserState(state: string) {
  const nudgeStates = [
    "waiting for a service question answer",
    "recommending a company",
    "choosing a company",
    "waiting for a company question answer",
    "schedule a time",
    "recommending time slots",
    "choosing a time",
  ];
  return nudgeStates.includes(state);
}

// TODO: We do some push messages in the xstate. think about it more which one we want to use or a combo.
// Either way we probably only need ONE helper method to send to websocket. the other in actorHelpers.ts
export function getNextStepMessage(actor: any, prevState: string, latestState: string) {
  console.log(
    `[MCP Client Helper] Getting next step message from A. ${prevState} TO B. ${latestState}`
  );

  // TODO: evaluate. Sometime we want to prompt the user because new context, BUT same state (ie. new question)
  // if (prevState === latestState) {
  //   return null;
  // }

  // select case for the latest state
  let pushMessage = "";
  const context = actor.getSnapshot().context;
  // console.log(`[MCP Client Helper] Context: ${JSON.stringify(context)}`);
  switch (latestState) {
    case "waiting for a service question answer":
      pushMessage = `${context.questions[0].text}`;
      break;
    case "recommending a company":
    case "choosing a company":
      // pushMessage = `Here are some companies that we recommend: ${context.companies.map((company: Company) => company.name).join(", ")}`;
      break;
    case "waiting for a company question answer":
      if (context.questions && context.questions.length > 0) {
        pushMessage = `${context.questions[0].text}`;
      } else {
        console.warn(
          "[MCP Client Helper] No questions to answer, but in state: waiting for a company question answer. This should not happen."
        );
      }
      break;
    case "schedule a time":
      // maybe instead of this, we have an entry push with a time specific websocket because it will be easier from the ui.
      // Pushed Message from bookingMachine.ts
      break;
    case "recommending time slots":
    case "choosing a time":
      // Time slots will be handled by the WebSocket message, no additional push message needed
      // Push Message from bookingMachine.ts
      break;
    default:
      console.log(
        `[MCP Client Helper] NO PUSH MESSAGE FOR STATE CHANGE FROM ${prevState} TO ${latestState}`
      );
      break;
  }
  return pushMessage;
}

export type ServiceQuestionAnswerStruct = {
  valid: boolean;
  confidenceScore: number;
  question: Question;
  answer: string;
};

export async function doWaitingForServiceQuestionAnswer(
  actor: any,
  messages: Anthropic.MessageParam[],
  anthropic: Anthropic,
  model: string
) {
  // we have answer and the question that was just asked.

  const currQuestion = actor.getSnapshot().context.questions[0];

  console.log(`[MCP Client Helper] Current question: ${JSON.stringify(currQuestion)}`);

  const lastMessage = messages[messages.length - 1];
  console.log(`[MCP Client Helper] Last message: ${JSON.stringify(lastMessage)}`);

  // validate that the answer makes sense.

  const prompt = `
   you are a helpful booking assistant. 
   you are given a question and an answer. 
   you need to validate that the answer makes sense for the question. 
   you need to return a JSON object with the following fields:
   - valid: boolean
   - confidenceScore: number (0.0 - 1.0)

   if the answer makes sense, return the followUpQuestions and appointment. 
   if the answer doesn't make sense, return the followUpQuestions and appointment. 
   if it makes sense, return { valid: true, confidenceScore: 1.0 } 
   if it doesn't make sense, return { valid: false, confidenceScore: 0.0 }. 

   Question: ${currQuestion.text}
   Answer: ${lastMessage.content}

   Most important: Only return a JSON object with the fields valid and confidenceScore. 
   Do not return any other text. 
  `;
  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    tools: undefined,
    stream: false,
  });

  console.log(`[MCP Client Helper] Response: ${JSON.stringify(response)}`);

  // Extract the text content
  const textContent = response.content.find((block) => block.type === "text");
  const aiResponseText = textContent?.type === "text" ? textContent.text : "";

  const json = JSON.parse(aiResponseText);
  console.log(`[MCP Client Helper] JSON: ${JSON.stringify(json)}`);
  const valid = json.valid;
  const confidenceScore = json.confidenceScore;

  console.log(`[MCP Client Helper] Valid: ${valid}`);
  console.log(`[MCP Client Helper] Confidence Score: ${confidenceScore}`);

  if (valid) {
    // save the answer, remove the question, prompt next question
    actor.send({
      type: "VALID_SERVICE_QUESTION_ANSWER",
      output: {
        questionId: currQuestion.id,
        answer: lastMessage.content,
        confidenceScore: confidenceScore,
      },
    });

    return {
      valid: true,
      confidenceScore: confidenceScore,
      answer: lastMessage.content,
      question: currQuestion,
    } as ServiceQuestionAnswerStruct;
  }

  // if it doesn't prompt the user to answer the question again.
  return {
    valid: false,
    confidenceScore: confidenceScore,
    answer: lastMessage.content,
    question: currQuestion,
  } as ServiceQuestionAnswerStruct;
}
