import { chatMessagesDB } from "../../database/chat-messages";
import { Card, ServerEvent } from "../../shared/protocol";
import { emitPersisted } from "../../websocket/websocketUtils";
import { Company, Question, TimeSlot } from "./types";

export const pushMessageToWs = (ws: any, currentState: string, message: string, data: any = {}) => {
  console.log("🔍 pushMessageToWs called with state:", currentState, "data:", data);

  if (!ws) {
    console.warn("⚠️ No WebSocket found in pushMessageToWs");
    return;
  }

  switch (currentState) {
    case "choosing a company":
      const companies = data.companies as Company[];
      console.log("📤 Sending companies to WebSocket:", companies);

      const companyRecommendationsEvent: ServerEvent = {
        type: "company.recommendations",
        sessionId: ws.sessionId,
        companies: companies,
      };
      emitPersisted(ws, ws.sessionId, "company.recommendations", companyRecommendationsEvent);
      chatMessagesDB.addMessage(
        ws.sessionId,
        "assistant",
        "Here are some companies that we found for you...",
        "COMPANY",
        companies as Company[]
      );

      break;
    case "waiting for a company question answer":
      const question = data as Question;
      console.log("📤 Sending selected company to WebSocket:", question);
      const questionSendText = question.text;
      const questionEvent: ServerEvent = {
        type: "ai.message",
        sessionId: ws.sessionId,
        message: questionSendText,
        seq: 99, // this gets overridden by the appendEvent in emitPersisted
      };
      emitPersisted(ws, ws.sessionId, "ai.message", questionEvent);
      chatMessagesDB.addMessage(ws.sessionId, "assistant", questionSendText);
      break;

    case "waiting for a time slot answer":
      const timeSlots = data.availableTimes as TimeSlot[];
      console.log("📤 Sending time slots to WebSocket:", timeSlots);

      const timeSlotsRecommendationsEvent: ServerEvent = {
        type: "time.slots.recommendations",
        sessionId: ws.sessionId,
        timeSlots: timeSlots,
      };
      emitPersisted(ws, ws.sessionId, "time.slots.recommendations", timeSlotsRecommendationsEvent);
      chatMessagesDB.addMessage(
        ws.sessionId,
        "assistant",
        "Here are some time slots that we found for you...",
        "TIME_SLOT",
        timeSlots as TimeSlot[]
      );

      break;
    case "waiting for user auth":
      console.log("📤 Sending waiting for user auth message to WebSocket:", message);
      const userAuthMessageEvent: ServerEvent = {
        type: "ai.message",
        sessionId: ws.sessionId,
        message: message,
        seq: 99, // this gets overridden by the appendEvent in emitPersisted
      };
      emitPersisted(ws, ws.sessionId, "ai.message", userAuthMessageEvent);
      chatMessagesDB.addMessage(ws.sessionId, "assistant", message, "USER_AUTH");
      break;

    case "search for cards":
      const cards = data.cards as Card[];
      console.log("📤 Sending cards to WebSocket:", cards);

      const cardsSearchResultsEvent: ServerEvent = {
        type: "cards.search.results",
        sessionId: ws.sessionId,
        cards: cards,
      };
      emitPersisted(ws, ws.sessionId, "cards.search.results", cardsSearchResultsEvent);
      chatMessagesDB.addMessage(
        ws.sessionId,
        "assistant",
        "Here are some cards that we found for you...",
        "CARD",
        cards
      );
      break;

    case "finished":
      console.log("📤 Sending finished message to WebSocket:", message);
      const finishedEvent: ServerEvent = {
        type: "ai.message",
        sessionId: ws.sessionId,
        message: message,
        seq: 99, // this gets overridden by the appendEvent in emitPersisted
      };
      emitPersisted(ws, ws.sessionId, "ai.message", finishedEvent);
      chatMessagesDB.addMessage(ws.sessionId, "assistant", message);
      break;

    default:
      console.log("⚠️ No handler for state:", currentState);
      break;
  }
};
