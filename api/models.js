import { handleModelsRequest } from "../server.js";
import { methodNotAllowed, runHandler } from "./_shared.js";

export async function POST(request) {
  return runHandler(request, handleModelsRequest);
}

export function GET() {
  return methodNotAllowed();
}
