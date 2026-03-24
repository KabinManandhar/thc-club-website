"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, type Brand } from "@/lib/supabase";
import {
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";

interface BrandWithStats extends Brand {
  total_sales: number;
  invoice_count: number;
  avg_order_value: number;
  days_on_platform: number;
  rank: number;
}

export function Leaderboards() {
  const [brands, setBrands] = useState<BrandWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      // Fetch brands first
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("*")
        .eq("is_onboarded", true);

      if (brandsError) throw brandsError;

      // Fetch sales data separately
      const { data: salesData, error: salesError } = await supabase
        .from("brand_sales")
        .select("*");

      if (salesError) throw salesError;

      // Fetch invoice data
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("brand_id, total_amount, created_at");

      if (invoiceError) throw invoiceError;

      // Process the data
      const processedBrands =
        brandsData?.map((brand: any) => {
          const brandSales =
            salesData?.filter((sale: any) => sale.brand_id === brand.id) || [];
          const brandInvoices =
            invoiceData?.filter((inv: any) => inv.brand_id === brand.id) || [];

          const totalSales = brandSales.reduce(
            (sum: number, sale: any) => sum + (sale.gross_sales || 0),
            0,
          );
          const invoiceCount = brandInvoices.length;
          const avgOrderValue =
            invoiceCount > 0 ? totalSales / invoiceCount : 0;

          const daysOnPlatform = brand.created_at
            ? Math.floor(
                (new Date().getTime() - new Date(brand.created_at).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0;

          return {
            ...brand,
            total_sales: totalSales,
            invoice_count: invoiceCount,
            avg_order_value: avgOrderValue,
            days_on_platform: daysOnPlatform,
            rank: 0,
          };
        }) || [];

      // Sort by total sales and assign ranks
      const rankedBrands = processedBrands
        .sort((a, b) => b.total_sales - a.total_sales)
        .map((brand, index) => ({
          ...brand,
          rank: index + 1,
        }));

      setBrands(rankedBrands);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500">🏆 1st</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400">🥈 2nd</Badge>;
    if (rank === 3) return <Badge className="bg-orange-600">🥉 3rd</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-[#FE7F2D]" />
          <h1 className="text-3xl font-black">Brand Leaderboards</h1>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-6 h-6 text-[#FE7F2D]" />
        <h1 className="text-3xl font-black">Brand Leaderboards</h1>
      </div>

      {/* Top 3 Brands */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {brands.slice(0, 3).map((brand, index) => (
          <Card
            key={brand.id}
            className={`border-2 ${
              index === 0
                ? "border-yellow-400 bg-yellow-50"
                : index === 1
                  ? "border-gray-400 bg-gray-50"
                  : "border-orange-400 bg-orange-50"
            }`}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">
                {index === 0 ? "🏆" : index === 1 ? "🥈" : "🥉"}
              </div>
              <h3 className="font-bold text-lg mb-1">{brand.business_name}</h3>
              <p className="text-2xl font-black text-[#FE7F2D] mb-2">
                Rs {brand.total_sales.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                {brand.invoice_count} orders • {brand.days_on_platform} days
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#FE7F2D]" />
            Complete Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 text-center">
                    {getRankBadge(brand.rank)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">
                      {brand.business_name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {brand.contact_person}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-green-600 font-semibold">
                      <DollarSign className="w-4 h-4" />
                      Rs {brand.total_sales.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500">Total Sales</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1 text-blue-600 font-semibold">
                      <Package className="w-4 h-4" />
                      {brand.invoice_count}
                    </div>
                    <p className="text-xs text-gray-500">Orders</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1 text-purple-600 font-semibold">
                      <TrendingUp className="w-4 h-4" />
                      Rs {Math.round(brand.avg_order_value).toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500">Avg Order</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1 text-orange-600 font-semibold">
                      <Calendar className="w-4 h-4" />
                      {brand.days_on_platform}
                    </div>
                    <p className="text-xs text-gray-500">Days Active</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
