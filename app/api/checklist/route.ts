import { createClient } from "@supabase/supabase-js";
import type { ChecklistItem } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key is not defined in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create a new checklist item
export async function createChecklistItem(values: ChecklistItem) {
  try {
    const { data, error } = await supabase
      .from("checklist")
      .insert({
        product_name: values.product_name,
        price: values.price,
        date: values.date,
        quantity: values.quantity,
      })
      .select();

    if (error) {
      console.error("Error creating checklist item:", error);
      throw new Error(`Error creating checklist item: ${error.message || "Unknown error"}`);
    }

    return data;
  } catch (error) {
    console.error("Error in createChecklistItem:", error);
    throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

// Get all checklist items
export async function getChecklistItems() {
  try {
    const { data, error } = await supabase
      .from("checklist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching checklist items:", error);
      throw new Error(`Error fetching checklist items: ${error.message || "Unknown error"}`);
    }

    return data;
  } catch (error) {
    console.error("Error in getChecklistItems:", error);
    throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

// Update a checklist item
export async function updateChecklistItem(id: number, values: ChecklistItem) {
  try {
    const { data, error } = await supabase
      .from("checklist")
      .update({
        product_name: values.product_name,
        price: values.price,
        date: values.date,
        quantity: values.quantity,
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating checklist item:", error);
      throw new Error(`Error updating checklist item: ${error.message || "Unknown error"}`);
    }

    return data;
  } catch (error) {
    console.error("Error in updateChecklistItem:", error);
    throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

// Delete a checklist item
export async function deleteChecklistItem(id: number) {
  try {
    const { error } = await supabase
      .from("checklist")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting checklist item:", error);
      throw new Error(`Error deleting checklist item: ${error.message || "Unknown error"}`);
    }

    return true;
  } catch (error) {
    console.error("Error in deleteChecklistItem:", error);
    throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

export async function GET() {
  try {
    const items = await getChecklistItems();
    return new Response(JSON.stringify({ success: true, data: items }), { status: 200 });
  } catch (error) {
    console.error("Error in GET checklist API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { values } = await request.json();
    const newItem = await createChecklistItem(values);
    return new Response(JSON.stringify({ success: true, data: newItem }), { status: 201 });
  } catch (error) {
    console.error("Error in POST checklist API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500 });
  }
}

