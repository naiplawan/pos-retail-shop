import { createClient } from "@supabase/supabase-js";
import type { ChecklistItem } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key is not defined in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create a new checklist item with associated sheet
export async function createChecklistItemWithSheet(values: ChecklistItem | ChecklistItem[]) {
  if (!values || (Array.isArray(values) && values.length === 0)) {
    throw new Error("Invalid input: Missing required fields in values object.");
  }

  try {
    // Generate a sheet number for this group of items
    const sheetNo = `ORD-${Date.now().toString().substring(6)}`;

    // Create the sheet first
    const { data: sheetData, error: sheetError } = await supabase
      .from("checklist_sheet")
      .insert({
        checklist_sheet_no: sheetNo,
      })
      .select();

    if (sheetError) {
      console.error("Error creating checklist sheet:", sheetError);
      throw new Error(`Error creating checklist sheet: ${sheetError.message || "Unknown error"}`);
    }

    const sheetId = sheetData && sheetData[0] ? sheetData[0].id : null;
    if (!sheetId) {
      throw new Error("Failed to create sheet: Sheet ID not returned");
    }

    // Process items to insert
    const itemsToInsert = Array.isArray(values) ? values : [values];

    // Validate each item in the array
    itemsToInsert.forEach((item) => {
      if (!item.product_name || !item.price || !item.date || !item.quantity) {
        throw new Error("Invalid input: Missing required fields in one or more items.");
      }
    });

    // Insert items with checklist_sheet_id reference
    const { data, error } = await supabase
      .from("checklist")
      .insert(
        itemsToInsert.map((item) => ({
          product_name: item.product_name,
          price: item.price,
          date: item.date,
          quantity: item.quantity,
          checklist_sheet_id: sheetId, // Link to the created sheet
        }))
      )
      .select();

    if (error) {
      console.error("Error creating checklist item(s):", error);
      throw new Error(`Error creating checklist item(s): ${error.message || "Unknown error"}`);
    }

    // Return both the created sheet and items
    return {
      sheet: sheetData[0],
      items: data
    };
  } catch (error) {
    console.error("Error in createChecklistItemWithSheet:", error);
    throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

// Update a checklist item
export async function updateChecklistItem(id: number, values: ChecklistItem) {
  if (!values || !values.product_name || !values.price || !values.date || !values.quantity) {
    throw new Error("Invalid input: Missing required fields in values object.");
  }

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

export async function getChecklistItemsbySheetId(sheetId: number) {
  try {
    const { data, error } = await supabase
      .from("checklist")
      .select("*")
      .eq("checklist_sheet_id", sheetId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching checklist items:", error);
      throw new Error(`Error fetching checklist items: ${error.message || "Unknown error"}`);
    }

    return data;
  }
  catch (error) {
    console.error("Error in getChecklistItemsbySheetId:", error);
    throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

export async function GET() {
  try {
    const items = await  getChecklistSheets();
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

    // Check if we have an array of items or a single item
    if (Array.isArray(values)) {
      // For multiple items, validate array is not empty
      if (values.length === 0) {
        throw new Error("Invalid input: Empty array of items");
      }

      // Create sheet and items together
      const result = await createChecklistItemWithSheet(values);
      return new Response(JSON.stringify({ success: true, data: result }), { status: 201 });
    } else {
      // For a single item, validate required fields
      if (!values || !values.product_name || !values.price || !values.date || !values.quantity) {
        throw new Error("Invalid input: Missing required fields in values object.");
      }

      // Create sheet and item together
      const result = await createChecklistItemWithSheet(values);
      return new Response(JSON.stringify({ success: true, data: result }), { status: 201 });
    }
  } catch (error) {
    console.error("Error in POST checklist API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500 });
  }
}

// Add a new function to create a checklist sheet
export async function createChecklistSheet(sheetNo: string) {
  try {
    const { data, error } = await supabase
      .from("checklist_sheet")
      .insert({
        checklist_sheet_no: sheetNo,
      })
      .select();

    if (error) {
      console.error("Error creating checklist sheet:", error);
      throw new Error(`Error creating checklist sheet: ${error.message || "Unknown error"}`);
    }

    return data;
  } catch (error) {
    console.error("Error in createChecklistSheet:", error);
    throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

// Add a new function to fetch all checklist sheets
export async function getChecklistSheets() {
  try {
    const { data, error } = await supabase
      .from("checklist_sheet")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching checklist sheets:", error);
      throw new Error(`Error fetching checklist sheets: ${error.message || "Unknown error"}`);
    }

    return data;
  } catch (error) {
    console.error("Error in getChecklistSheets:", error);
    throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

