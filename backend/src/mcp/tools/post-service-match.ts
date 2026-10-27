import { getServiceQuestions } from "../resources/get-service-questions";

export async function postServiceMatch(actor: any, serviceId: string): Promise<any> {
  console.log(`[MCP] Posting service match: ${serviceId}`);

  // Get the service questions
  const serviceQuestions = getServiceQuestions(serviceId);

  // Send event to state machine to process service match
  actor.send({
    type: "VALID_SERVICE_USER_INPUT",
    output: {
      serviceId: serviceId,
      message: `Service selected: ${serviceId}`,
      followUpQuestions: serviceQuestions,
    },
  });

  return {
    success: true,
    serviceId: serviceId,
    message: `Service ${serviceId} matched successfully`,
    timestamp: new Date().toISOString(),
  };
}
