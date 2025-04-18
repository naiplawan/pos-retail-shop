import type { PriceData, DailySummaryData, MonthlySummaryData } from "@/types";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateDailySummary } from "@/lib/utils";
import { calculateMonthlySummary } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key is not defined in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Add a new product price with ACID principles
export async function addProductPrice(data: {
  productName: string;
  price: number;
  date: Date;
}) {
  const response = await fetch('/api/prices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to add price data');
  }

  return await response.json();
}

// Get all prices with ACID principles
export async function getAllPrices(): Promise<PriceData[]> {
  try {
    const response = await fetch("/api/prices");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch price data");
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching all prices", error);
    throw new Error("Unable to fetch all prices");
  }
}

// Get recent prices with ACID principles
export async function getRecentPrices(limit = 10): Promise<PriceData[]> {
  try {
    const response = await fetch(`/api/prices?limit=${limit}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch recent prices");
    }

    const result = await response.json();

    // Ensure data is always an array and validate each item
    const data = Array.isArray(result.data) ? result.data : [];

    // Filter out invalid items and format properly
    const validData = data.map((item: { id: number; product_name: string; price: string; date: number; }) => ({
      id: item.id || "",
      product_name: item.product_name || "",
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
      date: item.date || new Date().toISOString()
    }));

    return validData;
  } catch (error) {
    console.error("Error fetching recent prices", error);
    // Return an empty array instead of throwing
    return [];
  }
}



// Get daily price summary with ACID principles
export async function getDailyPriceSummary(): Promise<DailySummaryData[]> {
  try {
    const response = await fetch("/api/prices?type=daily");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch daily summary");
    }

    const { data } = await response.json();
    console.log("Daily Price Summary:", data);
    return data;
  } catch (error) {
    console.error("Error fetching daily price summary", error);
    throw new Error("Unable to fetch daily price summary");
  }
}

// Get monthly price summary with ACID principles
export async function getMonthlyPriceSummary(): Promise<MonthlySummaryData[]> {
  try {
    const response = await fetch("/api/prices?type=monthly");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch monthly summary");
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching monthly price summary", error);
    throw new Error("Unable to fetch monthly price summary");
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product");
  const month = searchParams.get("month");
  const type = searchParams.get("type");
  const limit = searchParams.get("limit");

  console.log("API Request:", { product, month, type, limit });

  try {
    // Build the query with optional filters
    let query = supabase
      .from("prices")
      .select("id, product_name, price, date")
      .order("date", { ascending: false });

    // Apply filters if provided
    if (product) {
      query = query.eq("product_name", product);
    }

    if (month) {
      query = query.like("date", `${month}%`);
    }

    // Apply limit if provided
    if (limit && !isNaN(parseInt(limit))) {
      query = query.limit(parseInt(limit));
    }

    // Execute the query
    const { data: pricesData, error: fetchError } = await query;

    if (fetchError) throw new Error(`Error fetching prices: ${fetchError.message}`);
    if (!pricesData || pricesData.length === 0) {
      console.log("No price data found");
      return NextResponse.json({ data: [] }); // Always return an array, even if empty
    }

    console.log("Raw data from DB:", pricesData.length, "records");

    // Handle different response types
    if (type === 'daily') {
      console.log("Calculating daily summary");
      const dailySummary = calculateDailySummary(pricesData);
      console.log("Daily summary result:", dailySummary || []);
      return NextResponse.json({ data: dailySummary || [] }); // Ensure we return an array
    } else if (type === 'monthly') {
      console.log("Calculating monthly summary");
      const monthlySummary = calculateMonthlySummary(pricesData);
      console.log("Monthly summary result:", monthlySummary || []);
      return NextResponse.json({ data: monthlySummary || [] }); // Ensure we return an array
    } else {
      // If type is not specified, just return the price data directly
      // This handles the case for getRecentPrices and getAllPrices
      return NextResponse.json({ data: pricesData });
    }
  } catch (error) {
    console.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch summary data";
    return NextResponse.json({ error: errorMessage, data: [] }, { status: 500 }); // Return empty array on error
  }
}

export async function POST(request: Request) {
  try {
    // Parse the JSON body from the request
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body]; // Ensure the body is an array

    console.log("POST Request Body:", items);

    // Validate each item in the array
    for (const item of items) {
      const { productName, price, date } = item;

      if (!productName || price === undefined || !date) {
        return NextResponse.json(
          { error: "Missing required fields: productName, price, date" },
          { status: 400 }
        );
      }

      // Coerce price to a number and validate
      const numericPrice = typeof price === "string" ? parseFloat(price) : price;
      if (typeof numericPrice !== "number" || isNaN(numericPrice)) {
        return NextResponse.json(
          { error: "Price must be a valid number" },
          { status: 400 }
        );
      }

      // Replace the original price with the coerced numeric price
      item.price = numericPrice;
    }

    // Map the items to the format required by the database
    const formattedItems = items.map(({ productName, price, date }) => ({
      product_name: productName,
      price: price,
      date: new Date(date).toISOString(),
    }));

    // Insert the new price records into the database
    const { data: newPrices, error: insertError } = await supabase
      .from("prices")
      .insert(formattedItems)
      .select();

    if (insertError) {
      console.error("Error inserting prices:", insertError);
      return NextResponse.json(
        { error: `Failed to insert prices: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log("Successfully inserted prices:", newPrices);
    return NextResponse.json({ data: newPrices }, { status: 201 });

  } catch (error) {
    console.error("POST API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to add price data";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
