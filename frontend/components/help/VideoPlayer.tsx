"use client";

import { useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipForward, SkipBack } from "lucide-react";
import type { VideoWalkthrough } from "./video-walkthroughs";

interface VideoPlayerProps {
  video: VideoWalkthrough;
  autoPlay?: boolean;
  showControls?: boolean;
  aspectRatio?: "16:9" | "4:3" | "21:9";
}

export function VideoPlayer({
  video,
  autoPlay = false,
  showControls = true,
  aspectRatio = "16:9",
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const aspectRatioClasses = {
    "16:9": "aspect-video",
    "4:3": "aspect-[4/3]",
    "21:9": "aspect-[21/9]",
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setProgress(percent * 100);
    setCurrentTime(percent * video.durationSeconds);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(video.durationSeconds, currentTime + seconds));
    setCurrentTime(newTime);
    setProgress((newTime / video.durationSeconds) * 100);
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-slate-900 ${aspectRatioClasses[aspectRatio]}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Video Placeholder / Thumbnail */}
      <div className={`absolute inset-0 bg-gradient-to-br ${video.thumbnailGradient} flex items-center justify-center`}>
        {/* Placeholder pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* Play button overlay */}
        <button
          onClick={handlePlayPause}
          className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-2xl transition-all duration-300 ${
            isPlaying ? "scale-100 opacity-100" : "scale-110 opacity-100 hover:scale-125"
          } ${isHovering ? "scale-110" : ""}`}
        >
          {isPlaying ? (
            <Pause className="h-8 w-8 text-slate-900 ml-1" />
          ) : (
            <Play className="h-8 w-8 text-slate-900 ml-1" />
          )}
        </button>

        {/* Video title overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
            <p className="text-white text-sm font-medium">{video.title}</p>
            <p className="text-white/70 text-xs">Video placeholder - embed actual video here</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 ${
            isHovering || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Progress bar */}
          <div
            className="h-1 bg-white/30 rounded-full mb-3 cursor-pointer group"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-indigo-500 rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Skip back */}
              <button
                onClick={() => handleSkip(-10)}
                className="p-2 text-white/80 hover:text-white transition-colors"
                title="Skip back 10 seconds"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>

              {/* Skip forward */}
              <button
                onClick={() => handleSkip(10)}
                className="p-2 text-white/80 hover:text-white transition-colors"
                title="Skip forward 10 seconds"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Time */}
              <span className="text-white/80 text-sm font-medium ml-2">
                {formatTime(currentTime)} / {video.duration}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Volume */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Fullscreen */}
              <button
                className="p-2 text-white/80 hover:text-white transition-colors"
                title="Fullscreen"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="absolute bottom-full right-4 mb-2 bg-slate-800 rounded-lg shadow-xl p-3 min-w-[200px]">
              <p className="text-white text-sm font-medium mb-2">Quality</p>
              <div className="space-y-1">
                <button className="w-full text-left px-3 py-1.5 text-sm text-white bg-indigo-600 rounded">Auto</button>
                <button className="w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-slate-700 rounded">1080p</button>
                <button className="w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-slate-700 rounded">720p</button>
                <button className="w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-slate-700 rounded">480p</button>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-white text-sm font-medium mb-2">Playback Speed</p>
                <div className="grid grid-cols-4 gap-1">
                  {[0.5, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      className={`px-2 py-1 text-xs rounded ${
                        speed === 1 ? "bg-indigo-600 text-white" : "text-white/80 hover:bg-slate-700"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Placeholder component for video embeds.
 * Replace the `embedUrl` prop with actual video URLs from:
 * - YouTube: https://www.youtube.com/embed/{VIDEO_ID}
 * - Vimeo: https://player.vimeo.com/video/{VIDEO_ID}
 * - Self-hosted: path to video file
 */
export function VideoEmbed({
  embedUrl,
  title,
  className = "",
}: {
  embedUrl: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <iframe
        src={embedUrl}
        title={title || "Video player"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full rounded-xl"
      />
    </div>
  );
}
