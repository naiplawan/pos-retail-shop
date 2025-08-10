"use client"

import { createClient } from "@supabase/supabase-js"
import type { PriceData, DailySummaryData, MonthlySummaryData } from "@/types"

// Function to get Supabase client with secure credential handling
async function getSupabaseClient() {
  let supabaseUrl = ""
  let supabaseKey = ""

  // Use Next.js public environment variables (safe for client-side)
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials not found. Please check your environment variables.")
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-client-info': 'pos-retail-shop@1.0.0'
      }
    }
  })
}

// Add a new product price
export async function addProductPrice({
  productName,
  price,
  date,
}: {
  productName: string
  price: number
  date: Date
}) {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from("prices")
    .insert([
      {
        product_name: productName,
        price,
        date: date.toISOString().split("T")[0],
      },
    ])
    .select()

  if (error) {
    console.error("Error adding product price:", error)
    throw error
  }

  return data
}

// Get all prices
export async function getAllPrices(): Promise<PriceData[]> {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase.from("prices").select("*").order("date", { ascending: false })

  if (error) {
    console.error("Error fetching prices:", error)
    throw error
  }

  return (data || []).map((item) => ({
    id: item.id,
    productName: item.product_name,
    price: item.price,
    date: item.date,
  }))
}

// Get recent prices (last 10)
export async function getRecentPrices(limit = 10): Promise<PriceData[]> {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase.from("prices").select("*").order("date", { ascending: false }).limit(limit)

  if (error) {
    console.error("Error fetching recent prices:", error)
    throw error
  }

  return (data || []).map((item) => ({
    id: item.id,
    productName: item.product_name,
    price: item.price,
    date: item.date,
  }))
}

// Get daily price summary
export async function getDailyPriceSummary(): Promise<DailySummaryData[]> {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase.rpc("get_daily_summary").order("date", { ascending: false })

  if (error) {
    console.error("Error fetching daily summary:", error)
    throw error
  }

  return data || []
}

// Get monthly price summary
export async function getMonthlyPriceSummary(): Promise<MonthlySummaryData[]> {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase.rpc("get_monthly_summary").order("month", { ascending: false })

  if (error) {
    console.error("Error fetching monthly summary:", error)
    throw error
  }

  return data || []
}
