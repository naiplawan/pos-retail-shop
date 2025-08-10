import { NextResponse } from "next/server";
import type { AllSummaryData, PriceData } from "@/types";
import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * Calculate all summary data from price records
 * @param pricesData Array of price data from the database
 * @returns Array of AllSummaryData objects with product-specific monthly statistics
 */
export async function calculateAllSummary(pricesData: any[]): Promise<AllSummaryData[]> {
  // Ensure pricesData is an array
  if (!Array.isArray(pricesData)) {
    logger.error("calculateAllSummary expected an array but received:", typeof pricesData, JSON.stringify(pricesData, null, 2));
    // If pricesData is an object with a data property that's an array, use that instead
    if (pricesData && typeof pricesData === 'object' && 'data' in (pricesData as { data?: any[] }) && Array.isArray((pricesData as { data?: any[] }).data)) {
      pricesData = (pricesData as { data: PriceData[] }).data;
      logger.debug("Extracted data array from object, length:", pricesData.length);
    } else {
      logger.error("No valid array found in pricesData");
      return [];
    }
  }

  logger.debug("Processing array of length:", pricesData.length, "First item:", pricesData[0]);

  // Group prices by product name and month
  const summaryByProductAndMonth: Record<string, AllSummaryData> = {};

  let processedCount = 0;
  pricesData.forEach(item => {
    processedCount++;
    
    // Skip items without date
    if (!item.date) {
      logger.warn("Item without date found:", item);
      return;
    }

    // Handle different field naming conventions (product_name vs productName)
    const productName = item.product_name || item.productName;
    const price = item.price;
    const date = item.date;

    if (!productName || typeof price !== 'number') {
      logger.warn("Invalid item found, missing product name or price:", item);
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
    
    if (processedCount % 20 === 0) {
      logger.debug(`Processed ${processedCount}/${pricesData.length} items`);
    }
  });

  logger.debug(`Finished processing all ${processedCount} items. Summary keys: ${Object.keys(summaryByProductAndMonth).length}`);

  // Convert to array and ensure min/max price values are valid
  const summaryArray = Object.values(summaryByProductAndMonth)
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

  logger.debug(`Summary array length: ${summaryArray.length}, First item:`, summaryArray[0]);
  return summaryArray;
}

export async function getallSummaryData(
  product: string | null,
  month: string | null
): Promise<AllSummaryData[]> {
  try {
    let query = supabaseServer
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
      logger.error("Error fetching prices:", error);
      throw error;
    }

    return calculateAllSummary(data);
  } catch (error) {
    logger.error("Error in getallSummaryData:", error);
    throw error;
  }
}



export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product");
  const month = searchParams.get("month");

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

    // Execute the query
    logger.debug("Executing query...");
    const result = await query;
    logger.debug("Query result:", JSON.stringify(result, null, 2));
    
    const { data: pricesData, error: fetchError } = result;

    if (fetchError) throw new Error(`Error fetching prices: ${fetchError.message}`);
    if (!pricesData) {
      logger.warn("No data returned from query");
      return NextResponse.json({ data: [] });
    }

    // Log data for debugging
    logger.debug("Raw prices data:", JSON.stringify(pricesData, null, 2));
    
    if (!Array.isArray(pricesData)) {
      logger.error("Prices data is not an array:", typeof pricesData);
      return NextResponse.json({ data: [] });
    }

    if (pricesData.length === 0) {
      logger.info("Empty prices data array");
      return NextResponse.json({ data: [] });
    }

    // Calculate all summary data
    const summaryData = await calculateAllSummary(pricesData);
    
    logger.debug(`Summary data type: ${typeof summaryData}, isArray: ${Array.isArray(summaryData)}, length: ${summaryData?.length}`);

    return NextResponse.json({ data: summaryData });
  } catch (error) {
    logger.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch summary data";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
