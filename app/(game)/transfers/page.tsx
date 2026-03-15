"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Gavel,
  Timer,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Search,
  Star,
  ShoppingCart,
  Send,
  ListFilter,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  position: string;
  overall: number;
  potential: number;
  age: number;
  nationality: string;
  wage: number;
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  physicality: number;
}

interface Listing {
  id: string;
  askingPrice: number;
  listingType: string;
  expiresAt: string;
  player: Player;
  sellerClub: { id: string; name: string };
  _count: { offers: number };
}

interface Offer {
  id: string;
  offerFee: number;
  offerWage: number;
  status: string;
  counterFee: number | null;
  listing: { player: Player; sellerClub?: { id: string; name: string } };
  buyerClub?: { id: string; name: string };
}

interface AuctionItem {
  id: string;
  player: Player;
  sellerClub: { id: string; name: string };
  askingPrice: number;
  currentBid: number | null;
  minBid: number;
  buyNow: number;
  bidCount: number;
  expiresAt: string;
  timeRemainingMs: number;
}

// ─── Position badge colors ──────────────────────────────────

const POS_COLORS: Record<string, string> = {
  GK: "bg-amber-600 text-white",
  DEF: "bg-blue-600 text-white",
  MID: "bg-emerald-600 text-white",
  FWD: "bg-red-600 text-white",
};

function PositionBadge({ position }: { position: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
        POS_COLORS[position] ?? "bg-gray-600 text-white"
      )}
    >
      {position}
    </span>
  );
}

// ─── Quality Stars ──────────────────────────────────────────

function QualityStars({ overall }: { overall: number }) {
  // Map 40-99 → 1-5 stars
  const stars = Math.min(5, Math.max(1, Math.round((overall - 40) / 12)));
  const halfStar = overall % 12 >= 6 && stars < 5;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={cn(
            i < stars
              ? "text-yellow-400 fill-yellow-400"
              : i === stars && halfStar
              ? "text-yellow-400 fill-yellow-400/50"
              : "text-subtle"
          )}
        />
      ))}
    </div>
  );
}

// ─── Overall Rating Badge ───────────────────────────────────

function OverallBadge({ overall }: { overall: number }) {
  const color =
    overall >= 85
      ? "text-yellow-400 border-yellow-400/50 bg-yellow-400/10"
      : overall >= 75
      ? "text-green-400 border-green-400/50 bg-green-400/10"
      : overall >= 65
      ? "text-blue-400 border-blue-400/50 bg-blue-400/10"
      : "text-muted border-gray-600 bg-surface";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-bold",
        color
      )}
    >
      {overall}
    </span>
  );
}

// ─── Money formatter ────────────────────────────────────────

function formatMoney(amount: number): string {
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `€${(amount / 1_000).toFixed(0)}K`;
  return `€${amount}`;
}

// ─── Countdown Hook ─────────────────────────────────────────

function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = useState(Math.max(0, targetMs - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, targetMs - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { remaining, minutes, seconds, display: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` };
}

// ─── Countdown Timer (large clock style) ────────────────────

function CountdownClock({ expiresAt }: { expiresAt: string }) {
  const { remaining, minutes, seconds } = useCountdown(new Date(expiresAt).getTime());
  const isUrgent = remaining < 60000;

  return (
    <div className={cn("flex items-center gap-0.5 font-mono text-xs", isUrgent ? "text-red-400" : "text-muted")}>
      <Timer size={10} className="mr-0.5" />
      <span className={cn("font-bold", isUrgent && "animate-pulse")}>
        {String(minutes).padStart(2, "0")}
      </span>
      <span className={isUrgent ? "text-red-500" : "text-subtle"}>:</span>
      <span className={cn("font-bold", isUrgent && "animate-pulse")}>
        {String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

// ─── Sortable Header ────────────────────────────────────────

function SortHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
  className,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: "asc" | "desc";
  onSort: (field: string) => void;
  className?: string;
}) {
  const isActive = currentSort === field;

  return (
    <button
      onClick={() => onSort(field)}
      className={cn("flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold hover:text-white transition-colors", className, isActive ? "text-accent" : "text-subtle")}
    >
      {label}
      {isActive ? (
        currentOrder === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />
      ) : (
        <ArrowUpDown size={9} className="opacity-40" />
      )}
    </button>
  );
}

// ─── Auction Row ────────────────────────────────────────────

function AuctionRow({
  auction,
  onBid,
  onExpand,
  isExpanded,
  isBidding,
}: {
  auction: AuctionItem;
  onBid: (auctionId: string, amount: number, wage: number) => void;
  onExpand: (id: string) => void;
  isExpanded: boolean;
  isBidding: boolean;
}) {
  const [customBid, setCustomBid] = useState(auction.minBid);

  useEffect(() => {
    setCustomBid(auction.minBid);
  }, [auction.minBid]);

  return (
    <>
      <tr
        onClick={() => onExpand(auction.id)}
        className={cn(
          "border-b border-border cursor-pointer transition-colors",
          isExpanded ? "bg-surface/40" : "hover:bg-surface"
        )}
      >
        {/* Name + Nationality */}
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-subtle w-5 text-center">{auction.player.nationality.slice(0, 3).toUpperCase()}</span>
            <span className="font-medium text-sm truncate">{auction.player.name}</span>
          </div>
        </td>

        {/* Position */}
        <td className="py-2.5 px-2">
          <PositionBadge position={auction.player.position} />
        </td>

        {/* Age */}
        <td className="py-2.5 px-2 text-center text-sm">{auction.player.age}</td>

        {/* Overall */}
        <td className="py-2.5 px-2 text-center">
          <OverallBadge overall={auction.player.overall} />
        </td>

        {/* Quality (stars) */}
        <td className="py-2.5 px-2">
          <QualityStars overall={auction.player.overall} />
        </td>

        {/* Value / Current bid */}
        <td className="py-2.5 px-2 text-right">
          <span className="font-bold text-accent text-sm">
            {formatMoney(auction.currentBid ?? auction.askingPrice)}
          </span>
          {auction.bidCount > 0 && (
            <p className="text-[10px] text-subtle">{auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}</p>
          )}
        </td>

        {/* Deadline */}
        <td className="py-2.5 px-2 text-center">
          <CountdownClock expiresAt={auction.expiresAt} />
        </td>

        {/* Quick bid */}
        <td className="py-2.5 px-3 text-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBid(auction.id, auction.minBid, auction.player.wage);
            }}
            disabled={isBidding}
            className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1"
          >
            <Gavel size={11} />
            {formatMoney(auction.minBid)}
          </button>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr className="bg-surface/30 border-b border-border">
          <td colSpan={8} className="px-4 py-3">
            <div className="flex gap-6">
              {/* Attributes grid */}
              <div className="grid grid-cols-6 gap-3 flex-1">
                {[
                  { label: "PAC", value: auction.player.pace },
                  { label: "SHO", value: auction.player.shooting },
                  { label: "PAS", value: auction.player.passing },
                  { label: "DEF", value: auction.player.defending },
                  { label: "PHY", value: auction.player.physicality },
                  { label: "POT", value: auction.player.potential },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-[10px] text-subtle uppercase">{label}</p>
                    <p className={cn(
                      "text-sm font-bold",
                      value >= 80 ? "text-green-400" : value >= 65 ? "text-blue-400" : "text-foreground"
                    )}>
                      {value}
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-1 mt-0.5">
                      <div
                        className={cn(
                          "h-1 rounded-full",
                          value >= 80 ? "bg-green-400" : value >= 65 ? "bg-blue-400" : "bg-gray-400"
                        )}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bid section */}
              <div className="border-l border-border pl-4 min-w-[200px]">
                <p className="text-xs text-muted mb-2">
                  Wage: <span className="text-white font-medium">€{auction.player.wage.toLocaleString()}/w</span>
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-subtle block mb-0.5">Custom bid</label>
                    <input
                      type="number"
                      value={customBid}
                      onChange={(e) => setCustomBid(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      min={auction.minBid}
                      step={1000}
                      className="input-field text-sm w-full py-1.5"
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBid(auction.id, customBid, auction.player.wage);
                    }}
                    disabled={isBidding || customBid < auction.minBid}
                    className="btn-primary text-xs mt-4 px-3 py-1.5"
                  >
                    Bid
                  </button>
                </div>
                <div className="flex justify-between text-[10px] text-subtle mt-1">
                  <span>Min: {formatMoney(auction.minBid)}</span>
                  <span>Buy now: {formatMoney(auction.buyNow)}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"auction" | "market" | "offers">("auction");
  const [offerModal, setOfferModal] = useState<Listing | null>(null);
  const [offerFee, setOfferFee] = useState(0);
  const [offerWage, setOfferWage] = useState(0);
  const [posFilter, setPosFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState("deadline");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortOrder(field === "overall" || field === "price" ? "desc" : "asc");
      }
    },
    [sortField]
  );

  // Auction market (auto-refreshes every 10s)
  const { data: auctionData, isLoading: auctionLoading } = useQuery<{ auctions: AuctionItem[]; total: number }>({
    queryKey: ["auction-market", posFilter, sortField, sortOrder],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "100", sort: sortField, order: sortOrder });
      if (posFilter !== "all") params.set("position", posFilter);
      return fetch(`/api/transfers/auction?${params}`).then((r) => r.json());
    },
    refetchInterval: 10000,
  });

  // Filter locally by search query
  const filteredAuctions = (auctionData?.auctions ?? []).filter((a) =>
    searchQuery ? a.player.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  // Traditional market
  const { data: market } = useQuery<{ listings: Listing[]; total: number }>({
    queryKey: ["transfer-market"],
    queryFn: () => fetch("/api/transfers/listings").then((r) => r.json()),
    enabled: tab === "market",
  });

  // Offers
  const { data: offers } = useQuery<{ receivedOffers: Offer[]; sentOffers: Offer[] }>({
    queryKey: ["transfer-offers"],
    queryFn: () => fetch("/api/transfers/offers").then((r) => r.json()),
    enabled: tab === "offers",
  });

  // Bid mutation
  const placeBid = useMutation({
    mutationFn: async ({ listingId, bidAmount, offerWage: wage }: { listingId: string; bidAmount: number; offerWage: number }) => {
      const res = await fetch("/api/transfers/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, bidAmount, offerWage: wage }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auction-market"] }),
  });

  // Submit offer mutation
  const submitOffer = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/transfers/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: offerModal?.id, offerFee, offerWage }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer-offers"] });
      setOfferModal(null);
    },
  });

  const respondToOffer = useMutation({
    mutationFn: async ({ offerId, action, counterFee }: { offerId: string; action: string; counterFee?: number }) => {
      const res = await fetch("/api/transfers/offers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, action, counterFee }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer-offers"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-market"] });
    },
  });

  function handleBid(auctionId: string, amount: number, wage: number) {
    placeBid.mutate({ listingId: auctionId, bidAmount: amount, offerWage: wage });
  }

  function toggleExpand(id: string) {
    setExpandedRow((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transfers</h1>
        <span className="text-xs text-subtle">
          {auctionData?.total ?? 0} players on market
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([
          { key: "auction" as const, label: "Auctions", icon: Gavel },
          { key: "market" as const, label: "Scouting", icon: Search },
          { key: "offers" as const, label: "Offers", icon: Send },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === key
                ? "border-primary text-white"
                : "border-transparent text-subtle hover:text-foreground"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Auction Tab ────────────────────────────────────── */}
      {tab === "auction" && (
        <div className="space-y-3">
          {/* Filters bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Position filter */}
            <div className="flex items-center gap-1">
              <ListFilter size={12} className="text-subtle" />
              {["all", "GK", "DEF", "MID", "FWD"].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosFilter(pos)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    posFilter === pos
                      ? pos === "all"
                        ? "bg-primary text-white"
                        : POS_COLORS[pos]
                      : "bg-surface text-muted hover:text-foreground"
                  )}
                >
                  {pos === "all" ? "All" : pos}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xs relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search player..."
                className="input-field text-sm pl-8 py-1.5 w-full"
              />
            </div>

            <span className="ml-auto text-[10px] text-subtle">
              Auto-refreshes · 5 min auction windows
            </span>
          </div>

          {/* Status messages */}
          {placeBid.isError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
              {(placeBid.error as Error).message}
            </div>
          )}
          {placeBid.isSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-sm text-green-400">
              Bid placed successfully!
            </div>
          )}

          {/* Auction Table */}
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="py-2.5 px-3 text-left">
                    <SortHeader label="Name" field="name" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="py-2.5 px-2 text-left">
                    <SortHeader label="Pos" field="position" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="py-2.5 px-2 text-center">
                    <SortHeader label="Age" field="age" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="justify-center" />
                  </th>
                  <th className="py-2.5 px-2 text-center">
                    <SortHeader label="OVR" field="overall" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="justify-center" />
                  </th>
                  <th className="py-2.5 px-2 text-left">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-subtle">Qlty</span>
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    <SortHeader label="Value" field="price" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="justify-end" />
                  </th>
                  <th className="py-2.5 px-2 text-center">
                    <SortHeader label="Deadline" field="deadline" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="justify-center" />
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-subtle">Bid</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAuctions.map((auction) => (
                  <AuctionRow
                    key={auction.id}
                    auction={auction}
                    onBid={handleBid}
                    onExpand={toggleExpand}
                    isExpanded={expandedRow === auction.id}
                    isBidding={placeBid.isPending}
                  />
                ))}
              </tbody>
            </table>

            {auctionLoading && (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              </div>
            )}

            {!auctionLoading && filteredAuctions.length === 0 && (
              <p className="text-subtle text-center py-12 text-sm">
                {searchQuery
                  ? "No players match your search"
                  : "No auctions available. Market refreshes every 5 minutes."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Traditional Market Tab ─────────────────────────── */}
      {tab === "market" && (
        <div className="space-y-2">
          {market?.listings && market.listings.length > 0 ? (
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="py-2.5 px-3 text-left text-[10px] uppercase tracking-wider font-semibold text-subtle">Name</th>
                    <th className="py-2.5 px-2 text-left text-[10px] uppercase tracking-wider font-semibold text-subtle">Pos</th>
                    <th className="py-2.5 px-2 text-center text-[10px] uppercase tracking-wider font-semibold text-subtle">Age</th>
                    <th className="py-2.5 px-2 text-center text-[10px] uppercase tracking-wider font-semibold text-subtle">OVR</th>
                    <th className="py-2.5 px-2 text-left text-[10px] uppercase tracking-wider font-semibold text-subtle">Club</th>
                    <th className="py-2.5 px-2 text-right text-[10px] uppercase tracking-wider font-semibold text-subtle">Price</th>
                    <th className="py-2.5 px-2 text-center text-[10px] uppercase tracking-wider font-semibold text-subtle">Offers</th>
                    <th className="py-2.5 px-3 text-right text-[10px] uppercase tracking-wider font-semibold text-subtle"></th>
                  </tr>
                </thead>
                <tbody>
                  {market.listings.map((listing) => (
                    <tr key={listing.id} className="border-b border-border hover:bg-surface transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-subtle w-5 text-center">
                            {listing.player.nationality.slice(0, 3).toUpperCase()}
                          </span>
                          <span className="font-medium text-sm">{listing.player.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <PositionBadge position={listing.player.position} />
                      </td>
                      <td className="py-2.5 px-2 text-center text-sm">{listing.player.age}</td>
                      <td className="py-2.5 px-2 text-center">
                        <OverallBadge overall={listing.player.overall} />
                      </td>
                      <td className="py-2.5 px-2 text-sm text-muted truncate max-w-[120px]">
                        {listing.sellerClub.name}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <span className="font-bold text-accent text-sm">{formatMoney(listing.askingPrice)}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-xs text-subtle">
                        {listing._count.offers}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setOfferModal(listing);
                            setOfferFee(Math.round(listing.askingPrice * 0.9));
                            setOfferWage(listing.player.wage);
                          }}
                          className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                        >
                          <ShoppingCart size={11} />
                          Offer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-subtle text-center py-12 text-sm">No listings available</p>
          )}
        </div>
      )}

      {/* ─── Offers Tab ─────────────────────────────────────── */}
      {tab === "offers" && (
        <div className="space-y-6">
          {/* Received */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <TrendingUp size={14} className="text-green-400" />
              Received Offers
            </h2>
            {offers?.receivedOffers && offers.receivedOffers.length > 0 ? (
              <div className="card p-0 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="py-2 px-3 text-left text-[10px] uppercase tracking-wider font-semibold text-subtle">Player</th>
                      <th className="py-2 px-2 text-left text-[10px] uppercase tracking-wider font-semibold text-subtle">From</th>
                      <th className="py-2 px-2 text-right text-[10px] uppercase tracking-wider font-semibold text-subtle">Fee</th>
                      <th className="py-2 px-2 text-right text-[10px] uppercase tracking-wider font-semibold text-subtle">Wage</th>
                      <th className="py-2 px-3 text-right text-[10px] uppercase tracking-wider font-semibold text-subtle">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.receivedOffers.map((offer) => (
                      <tr key={offer.id} className="border-b border-border">
                        <td className="py-2.5 px-3 font-medium text-sm">{offer.listing.player.name}</td>
                        <td className="py-2.5 px-2 text-sm text-muted">{offer.buyerClub?.name}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-accent text-sm">{formatMoney(offer.offerFee)}</td>
                        <td className="py-2.5 px-2 text-right text-sm text-foreground">€{offer.offerWage}/w</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => respondToOffer.mutate({ offerId: offer.id, action: "accept" })}
                              className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-xs font-medium"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => respondToOffer.mutate({ offerId: offer.id, action: "reject" })}
                              className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-subtle text-sm pl-1">No offers received</p>
            )}
          </div>

          {/* Sent */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Send size={14} className="text-blue-400" />
              Sent Offers
            </h2>
            {offers?.sentOffers && offers.sentOffers.length > 0 ? (
              <div className="card p-0 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="py-2 px-3 text-left text-[10px] uppercase tracking-wider font-semibold text-subtle">Player</th>
                      <th className="py-2 px-2 text-right text-[10px] uppercase tracking-wider font-semibold text-subtle">Fee</th>
                      <th className="py-2 px-2 text-center text-[10px] uppercase tracking-wider font-semibold text-subtle">Status</th>
                      <th className="py-2 px-3 text-right text-[10px] uppercase tracking-wider font-semibold text-subtle">Counter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.sentOffers.map((offer) => (
                      <tr key={offer.id} className="border-b border-border">
                        <td className="py-2.5 px-3 font-medium text-sm">{offer.listing.player.name}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-accent text-sm">{formatMoney(offer.offerFee)}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded",
                            offer.status === "PENDING" && "bg-yellow-500/20 text-yellow-400",
                            offer.status === "ACCEPTED" && "bg-green-500/20 text-green-400",
                            offer.status === "REJECTED" && "bg-red-500/20 text-red-400",
                            offer.status === "COUNTERED" && "bg-blue-500/20 text-blue-400",
                          )}>
                            {offer.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm text-muted">
                          {offer.counterFee ? formatMoney(offer.counterFee) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-subtle text-sm pl-1">No sent offers</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Offer Modal ──────────────────────────────────────── */}
      {offerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <OverallBadge overall={offerModal.player.overall} />
              <div>
                <h3 className="text-lg font-bold">{offerModal.player.name}</h3>
                <p className="text-xs text-muted">
                  {offerModal.player.position} · {offerModal.player.age}y · {offerModal.player.nationality}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted">
              Asking: <span className="text-accent font-bold">{formatMoney(offerModal.askingPrice)}</span>
              {" "}from {offerModal.sellerClub.name}
            </p>

            <div>
              <label className="block text-xs text-subtle mb-1">Transfer Fee</label>
              <input
                type="number"
                value={offerFee}
                onChange={(e) => setOfferFee(Number(e.target.value))}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs text-subtle mb-1">Wage Offer (€/week)</label>
              <input
                type="number"
                value={offerWage}
                onChange={(e) => setOfferWage(Number(e.target.value))}
                className="input-field"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setOfferModal(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={() => submitOffer.mutate()}
                disabled={submitOffer.isPending}
                className="btn-primary flex-1"
              >
                {submitOffer.isPending ? "Submitting..." : "Submit Offer"}
              </button>
            </div>

            {submitOffer.isError && (
              <p className="text-red-400 text-sm">{(submitOffer.error as Error).message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
