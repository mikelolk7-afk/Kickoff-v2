"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Gavel, Timer, TrendingUp } from "lucide-react";

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

// ─── Countdown Hook ──────────────────────────────────────────

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
  return { remaining, display: `${minutes}:${seconds.toString().padStart(2, "0")}` };
}

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const { remaining, display } = useCountdown(new Date(expiresAt).getTime());
  const isUrgent = remaining < 60000;
  return (
    <span className={cn(
      "font-mono text-xs px-1.5 py-0.5 rounded",
      isUrgent ? "bg-red-500/20 text-red-400" : "bg-gray-800 text-gray-400"
    )}>
      {display}
    </span>
  );
}

// ─── Auction Card ────────────────────────────────────────────

function AuctionCard({
  auction,
  onBid,
  isBidding,
}: {
  auction: AuctionItem;
  onBid: (auctionId: string, amount: number, wage: number) => void;
  isBidding: boolean;
}) {
  const [bidAmount, setBidAmount] = useState(auction.minBid);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    setBidAmount(auction.minBid);
  }, [auction.minBid]);

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        {/* Player rating circle */}
        <div className="flex-shrink-0 text-center">
          <span className="text-xl font-bold text-primary">{auction.player.overall}</span>
          <p className="text-xs text-gray-400">{auction.player.position}</p>
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="font-medium hover:text-accent transition-colors text-left"
          >
            {auction.player.name}
          </button>
          <p className="text-xs text-gray-400">
            {auction.player.nationality} · {auction.player.age}y · Pot: {auction.player.potential}
          </p>
        </div>

        {/* Auction info */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-2 justify-end">
            <Timer size={12} className="text-gray-500" />
            <CountdownBadge expiresAt={auction.expiresAt} />
          </div>
          <p className="text-accent font-bold mt-1">
            {auction.currentBid
              ? `€${(auction.currentBid / 1000).toFixed(0)}k`
              : `€${(auction.askingPrice / 1000).toFixed(0)}k`}
          </p>
          <p className="text-[10px] text-gray-500">
            {auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}
            {auction.currentBid ? " · current" : " · start"}
          </p>
        </div>

        {/* Quick bid button */}
        <button
          onClick={() => onBid(auction.id, auction.minBid, auction.player.wage)}
          disabled={isBidding}
          className="btn-primary text-sm flex-shrink-0"
        >
          <Gavel size={14} className="inline mr-1" />
          €{(auction.minBid / 1000).toFixed(0)}k
        </button>
      </div>

      {/* Expandable detail */}
      {showDetail && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
            <div className="text-center">
              <p className="text-gray-500">PAC</p>
              <p className="font-bold">{auction.player.pace}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">SHO</p>
              <p className="font-bold">{auction.player.shooting}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">PAS</p>
              <p className="font-bold">{auction.player.passing}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">DEF</p>
              <p className="font-bold">{auction.player.defending}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">PHY</p>
              <p className="font-bold">{auction.player.physicality}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Wage</p>
              <p className="font-bold">€{auction.player.wage}/w</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Custom Bid (€)</label>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                min={auction.minBid}
                step={1000}
                className="input-field text-sm w-full"
              />
            </div>
            <button
              onClick={() => onBid(auction.id, bidAmount, auction.player.wage)}
              disabled={isBidding || bidAmount < auction.minBid}
              className="btn-primary text-sm mt-4"
            >
              Place Bid
            </button>
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>Min: €{(auction.minBid / 1000).toFixed(0)}k</span>
            <span>Buy Now: €{(auction.buyNow / 1000).toFixed(0)}k</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"auction" | "market" | "offers" | "my-listings">("auction");
  const [offerModal, setOfferModal] = useState<Listing | null>(null);
  const [offerFee, setOfferFee] = useState(0);
  const [offerWage, setOfferWage] = useState(0);
  const [posFilter, setPosFilter] = useState<string>("all");

  // Auction market (auto-refreshes every 10s)
  const { data: auctionData } = useQuery<{ auctions: AuctionItem[]; total: number }>({
    queryKey: ["auction-market", posFilter],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (posFilter !== "all") params.set("position", posFilter);
      return fetch(`/api/transfers/auction?${params}`).then((r) => r.json());
    },
    refetchInterval: 10000,
  });

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

  // Bid on auction
  const placeBid = useMutation({
    mutationFn: async ({ listingId, bidAmount, offerWage }: { listingId: string; bidAmount: number; offerWage: number }) => {
      const res = await fetch("/api/transfers/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, bidAmount, offerWage }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction-market"] });
    },
  });

  // Submit traditional offer
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transfer Market</h1>

      <div className="flex gap-2">
        {(["auction", "market", "offers", "my-listings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
              tab === t ? "bg-primary text-white" : "bg-panel text-gray-400"
            )}
          >
            {t === "auction" ? (
              <span className="flex items-center gap-1.5">
                <Gavel size={14} />
                Auction
              </span>
            ) : (
              t.replace("-", " ")
            )}
          </button>
        ))}
      </div>

      {/* ─── Auction Tab ────────────────────────────────────── */}
      {tab === "auction" && (
        <div className="space-y-3">
          {/* Position filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Filter:</span>
            {["all", "GK", "DEF", "MID", "FWD"].map((pos) => (
              <button
                key={pos}
                onClick={() => setPosFilter(pos)}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  posFilter === pos ? "bg-primary text-white" : "bg-bg text-gray-400"
                )}
              >
                {pos === "all" ? "All" : pos}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-500">
              {auctionData?.total ?? 0} players · Refreshes every 5 min
            </span>
          </div>

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

          {/* Auction listings */}
          <div className="space-y-2">
            {auctionData?.auctions?.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                onBid={handleBid}
                isBidding={placeBid.isPending}
              />
            ))}
            {(!auctionData?.auctions || auctionData.auctions.length === 0) && (
              <p className="text-gray-500 text-center py-8">
                No auctions available. Market refreshes every 5 minutes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Traditional Market Tab ─────────────────────────── */}
      {tab === "market" && (
        <div className="space-y-2">
          {market?.listings?.map((listing) => (
            <div key={listing.id} className="card flex items-center gap-4">
              <div className="flex-shrink-0 text-center">
                <span className="text-xl font-bold text-primary">{listing.player.overall}</span>
                <p className="text-xs text-gray-400">{listing.player.position}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{listing.player.name}</p>
                <p className="text-xs text-gray-400">
                  {listing.player.nationality} · {listing.player.age}y · From {listing.sellerClub.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-accent font-bold">€{(listing.askingPrice / 1000).toFixed(0)}k</p>
                <p className="text-xs text-gray-500">{listing._count.offers} offers</p>
              </div>
              <button
                onClick={() => {
                  setOfferModal(listing);
                  setOfferFee(Math.round(listing.askingPrice * 0.9));
                  setOfferWage(listing.player.wage);
                }}
                className="btn-primary text-sm"
              >
                Make Offer
              </button>
            </div>
          ))}
          {(!market?.listings || market.listings.length === 0) && (
            <p className="text-gray-500 text-center py-8">No listings available</p>
          )}
        </div>
      )}

      {/* ─── Offers Tab ─────────────────────────────────────── */}
      {tab === "offers" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Received Offers</h2>
          {offers?.receivedOffers?.map((offer) => (
            <div key={offer.id} className="card">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium">{offer.listing.player.name}</p>
                  <p className="text-sm text-gray-400">
                    From {offer.buyerClub?.name} · €{(offer.offerFee / 1000).toFixed(0)}k fee · €{offer.offerWage}/w wage
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToOffer.mutate({ offerId: offer.id, action: "accept" })}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondToOffer.mutate({ offerId: offer.id, action: "reject" })}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(!offers?.receivedOffers || offers.receivedOffers.length === 0) && (
            <p className="text-gray-500 text-sm">No offers received</p>
          )}

          <h2 className="text-lg font-semibold mt-6">Sent Offers</h2>
          {offers?.sentOffers?.map((offer) => (
            <div key={offer.id} className="card">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium">{offer.listing.player.name}</p>
                  <p className="text-sm text-gray-400">
                    €{(offer.offerFee / 1000).toFixed(0)}k offered · Status: {offer.status}
                    {offer.counterFee && ` · Counter: €${(offer.counterFee / 1000).toFixed(0)}k`}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {(!offers?.sentOffers || offers.sentOffers.length === 0) && (
            <p className="text-gray-500 text-sm">No sent offers</p>
          )}
        </div>
      )}

      {/* ─── My Listings Tab ────────────────────────────────── */}
      {tab === "my-listings" && (
        <p className="text-gray-500 text-center py-8">
          List players from your Squad page
        </p>
      )}

      {/* ─── Offer Modal ────────────────────────────────────── */}
      {offerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">
              Make Offer for {offerModal.player.name}
            </h3>
            <p className="text-sm text-gray-400">
              Asking price: €{(offerModal.askingPrice / 1000).toFixed(0)}k
            </p>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Transfer Fee (€)</label>
              <input
                type="number"
                value={offerFee}
                onChange={(e) => setOfferFee(Number(e.target.value))}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Wage Offer (€/week)</label>
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
