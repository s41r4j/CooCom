import { handleAgentTurnRequest } from "../server.js";
import { methodNotAllowed, runHandler } from "./_shared.js";

export async function POST(request) {
  return runHandler(request, handleAgentTurnRequest);
}

export function GET() {
  return methodNotAllowed();
}
