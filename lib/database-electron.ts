"use client"

import { createClient } from "@supabase/supabase-js"
import type { PriceData, DailySummaryData, MonthlySummaryData } from "@/types"

// Function to get Supabase client
async function getSupabaseClient() {
  let supabaseUrl = ""
  let supabaseKey = ""

  // Try to get from window.electronAPI if available (Electron environment)
  if (typeof window !== "undefined" && window.electronAPI) {
    supabaseUrl = await window.electronAPI.getEnv("SUPABASE_URL")
    supabaseKey = await window.electronAPI.getEnv("SUPABASE_ANON_KEY")
  } else {
    // Fallback to hardcoded values (for development or if electronAPI is not available)
    supabaseUrl = "https://gotbldxyecgshpavgkzn.supabase.co"
    supabaseKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvdGJsZHh5ZWNnc2hwYXZna3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MjAyNzAsImV4cCI6MjA1OTk5NjI3MH0.mvIuoNHU3WobqoLTfOiv2R9SbsVKm3QyXTEa3Z0uqpg"
  }

  return createClient(supabaseUrl, supabaseKey)
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
