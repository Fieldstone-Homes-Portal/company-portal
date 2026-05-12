import { fetchPlansFromSmartsheet, clearPlanCache } from "@/lib/smartsheet";

export async function GET() {
  try {
    const plans = await fetchPlansFromSmartsheet();
    return Response.json({ plans });
  } catch (error) {
    console.error("Failed to fetch plans:", error);
    return Response.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "refresh") {
      clearPlanCache();
      const plans = await fetchPlansFromSmartsheet();
      return Response.json({ plans });
    }

    return Response.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to process plans request:", error);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
