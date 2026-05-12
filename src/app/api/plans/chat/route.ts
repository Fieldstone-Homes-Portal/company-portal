import Anthropic from "@anthropic-ai/sdk";

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  planContext: string;
}

export async function POST(request: Request) {
  try {
    const { messages, planContext }: ChatRequest = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Anthropic API key is not configured" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a plan intelligence assistant for Fieldstone Homes. You help team members understand floor plans, compare specifications, and answer questions about the company's plan portfolio.

Use the following plan data context to answer questions accurately:

${planContext || "No plan context provided."}

Guidelines:
- Provide concise, accurate answers based on the plan data.
- When comparing plans, use specific numbers and details.
- If information is not available in the context, say so clearly.
- Format responses for readability with lists and tables when appropriate.`;

    const anthropicMessages = messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
          }
          controller.enqueue(
            new TextEncoder().encode("data: [DONE]\n\n")
          );
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
