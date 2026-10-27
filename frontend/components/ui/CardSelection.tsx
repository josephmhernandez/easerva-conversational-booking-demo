"use client";

import CardPreview from "@/app/components/cards/CardPreview";
import { CardDesign } from "@/app/types/businessTypes";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Card } from "@shared/protocol";
import { useEffect, useMemo, useState } from "react";

interface CardSelectionProps {
  cards: Card[];
  onCardSelect: (card: Card) => void;
  onRequestMore?: () => void;
  isLoading?: boolean;
}

// Convert Card from protocol to CardDesign for CardPreview
function convertCardToCardDesign(card: Card): CardDesign {
  // Detect media type
  const mediaType =
    card.media_type === "video"
      ? "video"
      : card.media_type === "image"
        ? "image"
        : card.profile_image_url
          ? "profile"
          : "image";

  // Get media settings from card, with sensible defaults
  const mediaSettings = card.media_settings || {};
  const defaultMuted = mediaType === "video" ? false : undefined;

  return {
    id: card.card_id,
    name: card.display_name || card.service_name,
    mediaType: mediaType as "image" | "video" | "profile",
    mediaUrl: card.media_url || undefined,
    mediaSettings: {
      zoom: mediaSettings.zoom ?? 1,
      panX: mediaSettings.panX ?? 0,
      panY: mediaSettings.panY ?? 0,
      overlayOpacity: mediaSettings.overlayOpacity ?? 0.3,
      autoPlay: mediaSettings.autoPlay ?? (mediaType === "video" ? true : false),
      muted: mediaSettings.muted ?? defaultMuted,
    },
    profileImage: card.profile_image_url || undefined,
    showProfileImage: Boolean(card.profile_image_url),
    backgroundColor: "#6366f1", // Default background color
    headline: card.display_name || card.service_name,
    tagline: card.tagline || card.description || card.service_description || "",
    bulletPoints: [],
    ctaText: card.cta_text || "Book Now",
    badges: {
      licensed: false,
      experience: false,
      experienceYears: 0,
      locallyOwned: false,
      custom: "",
    },
    // Set badgesArray from database if it exists (for display to users)
    badgesArray: card.badges && Array.isArray(card.badges) ? card.badges : undefined,
    serviceId: card.service_id,
  };
}

// Format duration from minutes
function formatDuration(minutes: number | null): string {
  if (!minutes) return "Various";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Format price range
function formatPriceRange(
  priceType: string | null,
  priceCents: number | null,
  priceMin: number | null,
  priceMax: number | null
): string {
  if (priceType === "fixed" && priceCents) {
    return `$${(priceCents / 100).toFixed(0)}`;
  }
  if (priceType === "variable" && priceMin && priceMax) {
    return `$${(priceMin / 100).toFixed(0)}-${(priceMax / 100).toFixed(0)}`;
  }
  if (priceMin) {
    return `$${(priceMin / 100).toFixed(0)}+`;
  }
  return "Contact for pricing";
}

// Format location based on location type
function formatLocation(
  locationType: "mobile" | "physical" | "virtual" | string | null,
  distanceMeters: number | null
): string {
  if (locationType === "mobile") {
    return "comes to you";
  }
  if (locationType === "physical") {
    if (!distanceMeters) return "";
    const miles = distanceMeters * 0.000621371;
    if (miles < 1) {
      return `${(miles * 5280).toFixed(0)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }
  // For virtual, online, or null/undefined/other
  return "virtual";
}

export function CardSelection({ cards, onCardSelect, isLoading = false }: CardSelectionProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Convert cards to CardDesign format
  const cardDesigns = useMemo(() => cards.map(convertCardToCardDesign), [cards]);

  // Track when carousel loops back to start
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      const selectedIndex = api.selectedScrollSnap();
      const totalSlides = api.scrollSnapList().length;

      setCurrent(selectedIndex);

      // Check if we've looped back to the first card (index 0)
      // This happens when we're at index 0 and the previous index was the last one
      if (selectedIndex === 0 && totalSlides > 1) {
        setIsLooping(true);
        // Reset animation state after animation completes
        setTimeout(() => setIsLooping(false), 600);
      }
    };

    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (cards.length === 0) {
    return null;
  }

  const handleCardClick = (cardId: string) => {
    const card = cards.find((c) => c.card_id === cardId);
    if (card) {
      onCardSelect(card);
    }
  };

  const handleExpandDescription = (cardId: string, expanded: boolean) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardId]: expanded,
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">Loading cards...</div>
      </div>
    );
  }

  console.log("cardDesigns", cardDesigns);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Here are some service cards that match your needs:
      </div>

      <div
        className={`relative transition-all duration-500 ${
          isLooping ? "animate-pulse scale-105" : ""
        }`}
      >
        <Carousel
          className="w-full max-w-sm mx-auto"
          opts={{
            loop: true,
            align: "center",
          }}
          setApi={setApi}
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {cardDesigns.map((cardDesign, index) => {
              const originalCard = cards[index];
              const isActive = index === current;
              return (
                <CarouselItem key={cardDesign.id} className="pl-2 md:pl-4">
                  <div className="p-1 flex justify-center">
                    <CardPreview
                      card={cardDesign}
                      onCardClick={handleCardClick}
                      onExpandDescription={(expanded) =>
                        handleExpandDescription(cardDesign.id, expanded)
                      }
                      expandedDescription={expandedCards[cardDesign.id] || false}
                      duration={formatDuration(originalCard.duration_minutes)}
                      priceRange={formatPriceRange(
                        originalCard.price_type,
                        originalCard.price_cents,
                        originalCard.price_min,
                        originalCard.price_max
                      )}
                      distance={formatLocation(
                        originalCard.location_type,
                        originalCard.distance_meters
                      )}
                      autoPlay={cardDesign.mediaSettings.autoPlay}
                      muted={cardDesign.mediaSettings.muted}
                      isActive={isActive}
                    />
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        {/* Loop indicator animation */}
        {isLooping && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-primary font-medium animate-in fade-in slide-in-from-top duration-300">
            Looping back to start...
          </div>
        )}
      </div>

      {/* Card counter */}
      {cards.length > 1 && (
        <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
          <span>
            {current + 1} of {cards.length}
          </span>
        </div>
      )}

      {/* {onRequestMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onRequestMore}
            disabled={isLoading}
            className="w-full max-w-xs"
          >
            {isLoading ? "Loading more..." : "Show more cards"}
          </Button>
        </div>
      )} */}
    </div>
  );
}
