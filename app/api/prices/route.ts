import type { PriceData, DailySummaryData, MonthlySummaryData } from "@/types";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { calculateDailySummary, calculateMonthlySummary } from "@/lib/utils";
import { priceSchema, searchSchema, paginationSchema, createApiValidator } from "@/lib/validation";
import { logger } from "@/lib/logger";

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
    logger.error("Error fetching all prices", error);
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
    logger.error("Error fetching recent prices", error);
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
    logger.debug("Daily Price Summary:", data);
    return data;
  } catch (error) {
    logger.error("Error fetching daily price summary", error);
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
    logger.error("Error fetching monthly price summary", error);
    throw new Error("Unable to fetch monthly price summary");
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Validate query parameters
  const validatePagination = createApiValidator(paginationSchema);
  
  const paginationResult = validatePagination({ 
    page: parseInt(searchParams.get("page") || "1"), 
    limit: parseInt(searchParams.get("limit") || "10") 
  });
  
  if (!paginationResult.success) {
    return NextResponse.json({ error: "Invalid pagination parameters", details: paginationResult.error }, { status: 400 });
  }
  
  const product = searchParams.get("product");
  const month = searchParams.get("month");
  const type = searchParams.get("type");
  const { limit } = paginationResult.data;

  try {
    // Build the query with optional filters
    let query = supabaseServer
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
    if (limit && !isNaN(limit)) {
      query = query.limit(limit);
    }

    // Execute the query
    const { data: pricesData, error: fetchError } = await query;

    if (fetchError) throw new Error(`Error fetching prices: ${fetchError.message}`);
    if (!pricesData || pricesData.length === 0) {
      logger.debug("No price data found");
      return NextResponse.json({ data: [] }); // Always return an array, even if empty
    }

    logger.debug(`Raw data from DB: ${pricesData.length} records`);

    // Handle different response types
    if (type === 'daily') {
      logger.debug("Calculating daily summary");
      const dailySummary = calculateDailySummary(pricesData.map(item => ({
        id: item.id?.toString() || '',
        productName: item.product_name || '',
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0,
        date: item.date || new Date().toISOString()
      })));
      logger.debug("Daily summary result:", dailySummary || []);
      return NextResponse.json({ data: dailySummary || [] }); // Ensure we return an array
    } else if (type === 'monthly') {
      logger.debug("Calculating monthly summary");
      const monthlySummary = calculateMonthlySummary(pricesData.map(item => ({
        id: item.id?.toString() || '',
        productName: item.product_name || '',
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0,
        date: item.date || new Date().toISOString()
      })));
      logger.debug("Monthly summary result:", monthlySummary || []);
      return NextResponse.json({ data: monthlySummary || [] }); // Ensure we return an array
    } else {
      // If type is not specified, just return the price data directly
      // This handles the case for getRecentPrices and getAllPrices
      return NextResponse.json({ data: pricesData });
    }
  } catch (error) {
    logger.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch summary data";
    return NextResponse.json({ error: errorMessage, data: [] }, { status: 500 }); // Return empty array on error
  }
}

export async function POST(request: Request) {
  try {
    // Parse the JSON body from the request
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body]; // Ensure the body is an array

    // Validate each item using Zod schema
    const validatedItems = [];
    const validatePrice = createApiValidator(priceSchema);
    
    for (const item of items) {
      const validation = validatePrice(item);
      
      if (!validation.success) {
        return NextResponse.json(
          { error: "Validation failed", details: validation.error },
          { status: 400 }
        );
      }
      
      validatedItems.push(validation.data);
    }

    // Map the validated items to the format required by the database
    const formattedItems = validatedItems.map(({ productName, price, date }) => ({
      product_name: productName,
      price: price,
      date: date, // Already validated as proper date string
    }));

    // Insert the new price records into the database
    const { data: newPrices, error: insertError } = await supabaseServer
      .from("prices")
      .insert(formattedItems)
      .select();

    if (insertError) {
      logger.error("Error inserting prices:", insertError);
      return NextResponse.json(
        { error: `Failed to insert prices: ${insertError.message}` },
        { status: 500 }
      );
    }

    logger.debug("Successfully inserted prices:", newPrices);
    return NextResponse.json({ data: newPrices }, { status: 201 });

  } catch (error) {
    logger.error("POST API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to add price data";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
