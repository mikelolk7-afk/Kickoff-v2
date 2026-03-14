"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  position: string;
  overall: number;
  age: number;
  nationality: string;
  wage: number;
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

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"market" | "offers" | "my-listings">("market");
  const [offerModal, setOfferModal] = useState<Listing | null>(null);
  const [offerFee, setOfferFee] = useState(0);
  const [offerWage, setOfferWage] = useState(0);

  const { data: market } = useQuery<{ listings: Listing[]; total: number }>({
    queryKey: ["transfer-market"],
    queryFn: () => fetch("/api/transfers/listings").then((r) => r.json()),
  });

  const { data: offers } = useQuery<{ receivedOffers: Offer[]; sentOffers: Offer[] }>({
    queryKey: ["transfer-offers"],
    queryFn: () => fetch("/api/transfers/offers").then((r) => r.json()),
  });

  const submitOffer = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/transfers/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: offerModal?.id,
          offerFee,
          offerWage,
        }),
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transfer Market</h1>

      <div className="flex gap-2">
        {(["market", "offers", "my-listings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
              tab === t ? "bg-primary text-white" : "bg-panel text-gray-400"
            )}
          >
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

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

      {tab === "my-listings" && (
        <p className="text-gray-500 text-center py-8">
          List players from your Squad page
        </p>
      )}

      {/* Offer Modal */}
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
