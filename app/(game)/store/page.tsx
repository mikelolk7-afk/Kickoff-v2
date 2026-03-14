"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { CreditCard, Sparkles, Crown } from "lucide-react";

interface StoreData {
  credits: number;
  coins: number;
  packages: Array<{
    id: string;
    name: string;
    credits: number;
    priceEur: number;
  }>;
  monthlyPass: {
    id: string;
    name: string;
    creditsPerDay: number;
    priceEur: number;
  };
}

export default function StorePage() {
  const { data } = useQuery<StoreData>({
    queryKey: ["credits"],
    queryFn: () => fetch("/api/credits").then((r) => r.json()),
  });

  const purchase = useMutation({
    mutationFn: async (packageId: string) => {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Store</h1>

      {/* Balance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card flex items-center gap-3">
          <Sparkles size={20} className="text-accent" />
          <div>
            <p className="text-xs text-gray-400">Credits</p>
            <p className="text-xl font-bold text-accent">{data.credits}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Crown size={20} className="text-yellow-500" />
          <div>
            <p className="text-xs text-gray-400">Coins</p>
            <p className="text-xl font-bold text-yellow-500">{data.coins}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Credits buy convenience and cosmetics only. Never player quality or match outcomes.
      </p>

      {/* Credit Packs */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Credit Packs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.packages.map((pkg, i) => (
            <div
              key={pkg.id}
              className={cn(
                "card text-center space-y-3 relative",
                i === 2 && "border-accent"
              )}
            >
              {i === 2 && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-bg text-xs font-bold px-3 py-0.5 rounded-full">
                  Best Value
                </span>
              )}
              <p className="text-lg font-bold">{pkg.name}</p>
              <p className="text-3xl font-bold text-accent">{pkg.credits}</p>
              <p className="text-xs text-gray-400">credits</p>
              <button
                onClick={() => purchase.mutate(pkg.id)}
                className="btn-primary w-full"
              >
                <CreditCard size={16} className="inline mr-2" />
                €{pkg.priceEur.toFixed(2)}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Pass */}
      <div className="card border-primary">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-primary">{data.monthlyPass.name}</h2>
            <p className="text-gray-400 text-sm">
              {data.monthlyPass.creditsPerDay} credits delivered daily
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ~{data.monthlyPass.creditsPerDay * 30} credits/month · Best for active managers
            </p>
          </div>
          <button
            onClick={() => purchase.mutate("monthly_pass")}
            className="btn-primary"
          >
            €{data.monthlyPass.priceEur.toFixed(2)}/mo
          </button>
        </div>
      </div>
    </div>
  );
}
