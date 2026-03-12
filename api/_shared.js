export async function readJsonRequest(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export function methodNotAllowed() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}

export async function runHandler(request, handler) {
  try {
    const body = await readJsonRequest(request);
    const outcome = await handler(body);
    return jsonResponse(outcome.payload, outcome.status);
  } catch (err) {
    return jsonResponse({ error: err?.message || "Server error" }, 500);
  }
}
