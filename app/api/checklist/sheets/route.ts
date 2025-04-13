import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key is not defined in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// GET handler to fetch all checklist sheets
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("checklist_sheet")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching checklist sheets:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error fetching checklist sheets: ${error.message || "Unknown error"}`,
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET checklist/sheets API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500 }
    );
  }
}
