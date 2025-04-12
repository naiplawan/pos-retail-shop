import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { AllSummaryData } from "@/types";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key is not defined in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Calculate all summary data from price records
 * @param pricesData Array of price data from the database
 * @returns Array of AllSummaryData objects with product-specific monthly statistics
 */
export async function calculateAllSummary(pricesData: any[]): Promise<AllSummaryData[]> {
  // Ensure pricesData is an array
  if (!Array.isArray(pricesData)) {
    console.error("calculateAllSummary expected an array but received:", pricesData);
    // If pricesData is an object with a data property that's an array, use that instead
    if (pricesData && typeof pricesData === 'object' && 'data' in (pricesData as { data?: any[] }) && Array.isArray((pricesData as { data?: any[] }).data)) {
      pricesData = (pricesData as { data: any[] }).data;
    } else {
      return [];
    }
  }

  // Group prices by product name and month
  const summaryByProductAndMonth: Record<string, AllSummaryData> = {};

  pricesData.forEach(item => {
    // Skip items without date
    if (!item.date) {
      console.warn("Item without date found:", item);
      return;
    }

    // Handle different field naming conventions (product_name vs productName)
    const productName = item.product_name || item.productName;
    const price = item.price;
    const date = item.date;

    if (!productName || typeof price !== 'number') {
      console.warn("Invalid item found, missing product name or price:", item);
      return;
    }

    const month = typeof date === 'string' ? date.slice(0, 7) : new Date(date).toISOString().slice(0, 7); // Extract YYYY-MM
    const key = `${month}-${productName}`;

    if (!summaryByProductAndMonth[key]) {
      summaryByProductAndMonth[key] = {
        month,
        productName: productName,
        date: date, // We'll store the latest date for this product in this month
        price: price, // We'll use the latest price for reference
        count: 0,
        averagePrice: 0,
        minPrice: Number.MAX_SAFE_INTEGER,
        maxPrice: Number.MIN_SAFE_INTEGER,
        totalSales: 0 // Initialize totalSales to 0
      };
    }

    // Update summary data
    const summary = summaryByProductAndMonth[key];
    summary.count += 1;

    // Keep track of min and max prices
    summary.minPrice = Math.min(summary.minPrice, price);
    summary.maxPrice = Math.max(summary.maxPrice, price);

    // If this is a newer record for this product/month, update price and date
    if (new Date(date) > new Date(summary.date)) {
      summary.date = date;
      summary.price = price;
    }
    // Update running average
    const totalPrice = summary.averagePrice * (summary.count - 1) + price;
    summary.averagePrice = totalPrice / summary.count;

    // Update total sales
    summary.totalSales += price;
    summary.averagePrice = totalPrice / summary.count;
  });

  // Convert to array and ensure min/max price values are valid
  return Object.values(summaryByProductAndMonth)
    .map(summary => ({
      ...summary,
      minPrice: summary.minPrice === Number.MAX_SAFE_INTEGER ? summary.price : summary.minPrice,
      maxPrice: summary.maxPrice === Number.MIN_SAFE_INTEGER ? summary.price : summary.maxPrice
    }))
    .sort((a, b) => {
      // Sort by month (newest first), then by product name
      const monthComparison = b.month.localeCompare(a.month);
      return monthComparison !== 0 ? monthComparison : a.productName.localeCompare(b.productName);
    });
}

export async function getallSummaryData(
  product: string | null,
  month: string | null
): Promise<AllSummaryData[]> {
  try {
    let query = supabase
      .from("prices")
      .select("id, product_name, price, date")
      .order("date", { ascending: false });

    if (product) {
      query = query.eq("product_name", product);
    }

    if (month) {
      query = query.like("date", `${month}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching prices:", error);
      throw error;
    }

    return calculateAllSummary(data);
  } catch (error) {
    console.error("Error in getallSummaryData:", error);
    throw error;
  }
}



export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product");
  const month = searchParams.get("month");

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

    // Execute the query
    const { data: pricesData, error: fetchError } = await query;

    if (fetchError) throw new Error(`Error fetching prices: ${fetchError.message}`);
    if (!pricesData || pricesData.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Calculate all summary data
    const summaryData = calculateAllSummary(pricesData);

    return NextResponse.json({ data: summaryData });
  } catch (error) {
    console.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch summary data";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
