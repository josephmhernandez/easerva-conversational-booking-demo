import { BUSINESS_DESCRIPTION_INITIAL_VIEW_LIMIT } from "@/app/constants/businessConstants";
import { CardDesign } from "@/app/types/businessTypes";
import { ArrowRight, Clock, DollarSign, MapPin, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface CardPreviewProps {
  card: CardDesign;
  onExpandDescription?: (expanded: boolean) => void;
  expandedDescription?: boolean;
  onCardClick?: (cardId: string) => void;
  className?: string;
  // Optional props for customizing service details display
  duration?: string;
  priceRange?: string;
  distance?: string;
  // Overrides for media behavior (useful for admin live preview)
  autoPlay?: boolean;
  muted?: boolean;
  // Controls whether this card is currently active in the carousel
  isActive?: boolean;
}

const CardPreview = memo(
  ({
    card,
    onExpandDescription,
    expandedDescription = false,
    onCardClick,
    className = "",
    duration = "90 min",
    priceRange = "50-200",
    distance = "0.5 mi",
    autoPlay,
    muted,
    isActive = false,
  }: CardPreviewProps) => {
    // Initial prop debug
    console.debug("CardPreview: render start", {
      id: card?.id,
      mediaType: card?.mediaType,
      mediaUrl: card?.mediaUrl,
      overlayOpacity: card?.mediaSettings?.overlayOpacity,
      mutedProp: muted,
      mutedDefault: card?.mediaSettings?.muted,
      autoPlayProp: autoPlay,
      autoPlayDefault: card?.mediaSettings?.autoPlay,
    });
    // Memoize background styles for performance
    const backgroundStyles = useMemo(
      () => ({
        backgroundColor: card.backgroundColor,
        backgroundImage:
          card.mediaType === "image" && card.mediaUrl ? `url(${card.mediaUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        transform: `scale(${card.mediaSettings.zoom || 1})`,
      }),
      [card.backgroundColor, card.mediaType, card.mediaUrl, card.mediaSettings.zoom]
    );

    // Memoize overlay style
    const overlayStyle = useMemo(
      () => ({
        opacity: card.mediaSettings.overlayOpacity ?? 0.3,
      }),
      [card.mediaSettings.overlayOpacity]
    );

    // Memoize description logic
    const descriptionContent = useMemo(() => {
      if (!card.tagline) return null;

      const shouldTruncate = card.tagline.length > BUSINESS_DESCRIPTION_INITIAL_VIEW_LIMIT;
      const isExpanded = expandedDescription;

      return {
        shouldTruncate,
        isExpanded,
        truncatedText: shouldTruncate
          ? card.tagline.substring(0, BUSINESS_DESCRIPTION_INITIAL_VIEW_LIMIT)
          : card.tagline,
        fullText: card.tagline,
      };
    }, [card.tagline, expandedDescription]);

    // Memoize badges to prevent unnecessary re-renders
    const badges = useMemo(() => {
      const badgeList: Array<{ key: string; text: string; className: string }> = [];

      // If badgesArray exists (from database), use it directly
      if (card.badgesArray && Array.isArray(card.badgesArray) && card.badgesArray.length > 0) {
        // Map each badge string to a display object
        card.badgesArray.forEach((badgeText, index) => {
          if (badgeText && badgeText.trim()) {
            // Determine badge color based on content
            let className = "bg-blue-500"; // default
            if (badgeText.toLowerCase().includes("licensed")) {
              className = "bg-blue-500";
            } else if (badgeText.toLowerCase().includes("locally owned")) {
              className = "bg-green-500";
            } else if (badgeText.includes("+") && badgeText.toLowerCase().includes("year")) {
              className = "bg-yellow-500";
            } else {
              className = "bg-purple-500"; // custom badges
            }

            badgeList.push({
              key: `badge-${index}`,
              text: badgeText,
              className: className,
            });
          }
        });
        return badgeList;
      }

      // Otherwise, use BadgeSettings (for onboarding)
      if (card.badges.licensed) {
        badgeList.push({
          key: "licensed",
          text: "Licensed & Insured",
          className: "bg-blue-500",
        });
      }

      if (card.badges.experience) {
        badgeList.push({
          key: "experience",
          text: `${card.badges.experienceYears}+ Years Experience`,
          className: "bg-yellow-500",
        });
      }

      if (card.badges.locallyOwned) {
        badgeList.push({
          key: "locallyOwned",
          text: "Locally Owned",
          className: "bg-green-500",
        });
      }

      if (card.badges.custom) {
        badgeList.push({
          key: "custom",
          text: card.badges.custom,
          className: "bg-purple-500",
        });
      }

      return badgeList;
    }, [card.badges, card.badgesArray]);

    // Optimized handlers with useCallback
    const handleExpandToggle = useCallback(
      (newExpanded: boolean) => {
        if (onExpandDescription) {
          onExpandDescription(newExpanded);
        }
      },
      [onExpandDescription]
    );

    const handleArrowClick = useCallback(() => {
      if (onCardClick) {
        onCardClick(card.id);
      }
    }, [onCardClick, card.id]);

    // Determine if arrow should be clickable
    const isArrowClickable = Boolean(onCardClick);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isManuallyMuted, setIsManuallyMuted] = useState(false);

    // Get the database muted setting (default to false for videos)
    const databaseMuted = muted ?? card.mediaSettings.muted ?? false;

    // Handle mute button toggle
    const handleMuteToggle = useCallback(() => {
      setIsManuallyMuted((prev) => !prev);
    }, []);

    // Initialize video element - start muted to allow autoplay when it becomes active
    useEffect(() => {
      if (card.mediaType !== "video") return;
      const video = videoRef.current;
      if (!video) return;

      // Initialize video as muted to allow autoplay (will be updated when active)
      video.muted = true;
    }, [card.mediaType]);

    // Control video playback based on isActive prop
    useEffect(() => {
      if (card.mediaType !== "video") return;
      const video = videoRef.current;
      if (!video) return;

      if (isActive) {
        // Card is active - play video
        // Determine mute state: manual mute takes precedence, otherwise use database setting
        const shouldBeMuted = isManuallyMuted || databaseMuted;
        video.muted = shouldBeMuted;

        const tryPlay = () => {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.then === "function") {
            playPromise
              .then(() => {
                console.debug("CardPreview: video started playing", {
                  id: card.id,
                  muted: shouldBeMuted,
                });
              })
              .catch((err: Error) => {
                console.warn("CardPreview: video play prevented", { id: card.id, err });
              });
          }
        };

        // Wait for video to be ready before playing
        if (video.readyState >= 2) {
          // HAVE_CURRENT_DATA or higher
          tryPlay();
        } else {
          // Wait for canplay event
          const handleCanPlay = () => {
            tryPlay();
            video.removeEventListener("canplay", handleCanPlay);
          };
          video.addEventListener("canplay", handleCanPlay, { once: true });
          return () => {
            video.removeEventListener("canplay", handleCanPlay);
          };
        }
      } else {
        // Card is inactive - pause video
        video.pause();
        console.debug("CardPreview: video paused", { id: card.id });
      }
    }, [isActive, card.id, card.mediaType, isManuallyMuted, databaseMuted]);

    // Update video muted attribute when active state, manual mute state, or database setting changes
    useEffect(() => {
      if (card.mediaType !== "video") return;
      const video = videoRef.current;
      if (!video) return;

      if (isActive) {
        // When active, respect manual mute or database setting
        const shouldBeMuted = isManuallyMuted || databaseMuted;
        video.muted = shouldBeMuted;
      }
      // When inactive, we don't change mute state - just pause (as per user requirements)
    }, [isActive, isManuallyMuted, databaseMuted, card.mediaType]);

    // Video element event handlers for deep diagnostics
    const handleVideoCanPlay = () => {
      console.debug("CardPreview: <video> canplay", { id: card.id, mediaUrl: card.mediaUrl });
    };

    const handleVideoLoadedData = () => {
      console.debug("CardPreview: <video> loadeddata", { id: card.id });
      // secondary autoplay attempt after data
      const shouldAutoplay = autoPlay ?? card.mediaSettings.autoPlay ?? true;
      const video = videoRef.current;
      if (shouldAutoplay && video) {
        video
          .play()
          .then(() =>
            console.debug("CardPreview: play() after loadeddata succeeded", { id: card.id })
          )
          .catch((err) =>
            console.warn("CardPreview: play() after loadeddata failed", { id: card.id, err })
          );
      }
    };

    const handleVideoPlay = () => {
      console.debug("CardPreview: <video> play", { id: card.id });
    };

    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const target = e?.currentTarget as HTMLVideoElement | undefined;
      const error = target?.error;
      console.error("CardPreview: <video> error", {
        id: card.id,
        code: error?.code,
        message:
          error?.code === 1
            ? "MEDIA_ERR_ABORTED"
            : error?.code === 2
              ? "MEDIA_ERR_NETWORK"
              : error?.code === 3
                ? "MEDIA_ERR_DECODE"
                : error?.code === 4
                  ? "MEDIA_ERR_SRC_NOT_SUPPORTED"
                  : "UNKNOWN",
      });
    };

    return (
      <div
        className={`w-80 aspect-[9/16] bg-gray-100 rounded-2xl overflow-hidden shadow-lg relative ${className}`}
      >
        {/* Background */}
        <div className="absolute inset-0" style={backgroundStyles}>
          {card.mediaType === "video" && card.mediaUrl && (
            <video
              ref={videoRef}
              src={card.mediaUrl}
              loop
              className="w-full h-full object-cover"
              playsInline // For better mobile performance
              onCanPlay={handleVideoCanPlay}
              onLoadedData={handleVideoLoadedData}
              onPlay={handleVideoPlay}
              onError={handleVideoError}
            />
          )}
        </div>

        {/* Overlay - gradient from bottom up */}
        <div
          className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-black to-transparent"
          style={overlayStyle}
        />

        {/* Top Badges */}
        {badges.length > 0 && (
          <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2 z-10">
            {badges.map((badge) => (
              <div
                key={badge.key}
                className={`${badge.className} text-white text-xs px-3 py-1 rounded-full font-medium`}
              >
                {badge.text}
              </div>
            ))}
          </div>
        )}

        {/* Mute/Unmute Button - Only show for video cards when active */}
        {card.mediaType === "video" && isActive && (
          <button
            onClick={handleMuteToggle}
            className="absolute top-4 right-4 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 transition-all"
            type="button"
            aria-label={isManuallyMuted || databaseMuted ? "Unmute" : "Mute"}
          >
            {isManuallyMuted || databaseMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
        )}

        {/* Bottom Content */}
        <div className="absolute bottom-4 left-0 right-0 px-6 text-white">
          <div className="flex items-center space-x-2 mb-2">
            {/* Profile Picture */}
            {card.profileImage && card.showProfileImage && (
              <Image
                src={card.profileImage}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-white shadow-lg object-cover flex-shrink-0"
                width={40}
                height={40}
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-xl font-bold leading-tight">{card.headline}</h4>
            </div>
          </div>

          {/* Description */}
          {descriptionContent && (
            <div className="mb-2">
              {!descriptionContent.isExpanded ? (
                <p className="text-sm opacity-90 leading-tight">
                  {descriptionContent.shouldTruncate ? (
                    <>
                      {descriptionContent.truncatedText}...{" "}
                      <button
                        onClick={() => handleExpandToggle(true)}
                        className="text-xs text-white underline opacity-75 hover:opacity-100 inline cursor-pointer"
                        type="button"
                      >
                        view more
                      </button>
                    </>
                  ) : (
                    descriptionContent.fullText
                  )}
                </p>
              ) : (
                <>
                  <p className="text-sm opacity-90 leading-tight transition-all duration-300">
                    {descriptionContent.fullText}
                  </p>
                  <button
                    onClick={() => handleExpandToggle(false)}
                    className="text-xs text-white underline opacity-75 hover:opacity-100 mt-1 cursor-pointer"
                    type="button"
                  >
                    view less
                  </button>
                </>
              )}
            </div>
          )}

          {/* Service Details Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs opacity-75">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{duration}</span>
              </div>
              <div className="flex items-center space-x-1">
                <DollarSign className="w-3 h-3" />
                <span>{priceRange}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{distance}</span>
              </div>
            </div>
            <div
              className={`bg-white bg-opacity-90 rounded-full p-3 shadow-lg ${
                isArrowClickable ? "cursor-pointer hover:bg-opacity-100 transition-all" : ""
              }`}
              onClick={isArrowClickable ? handleArrowClick : undefined}
              role={isArrowClickable ? "button" : undefined}
              tabIndex={isArrowClickable ? 0 : undefined}
              onKeyDown={
                isArrowClickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleArrowClick();
                      }
                    }
                  : undefined
              }
            >
              <ArrowRight className="w-5 h-5 text-gray-700 hover:text-gray-900" />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CardPreview.displayName = "CardPreview";

export default CardPreview;
