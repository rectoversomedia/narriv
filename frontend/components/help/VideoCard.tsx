"use client";

import { useState } from "react";
import { Clock, Users, BookOpen, ChevronDown, Play, Info } from "lucide-react";
import type { VideoWalkthrough } from "./video-walkthroughs";
import { VideoPlayer } from "./VideoPlayer";

interface VideoCardProps {
  video: VideoWalkthrough;
  variant?: "compact" | "expanded";
  onSelect?: (video: VideoWalkthrough) => void;
}

export function VideoCard({ video, variant = "compact", onSelect }: VideoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (variant === "compact") {
    return (
      <button
        onClick={() => onSelect?.(video)}
        className="text-left bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all group"
      >
        <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative overflow-hidden">
          {/* Gradient background matching video theme */}
          <div className={`absolute inset-0 bg-gradient-to-br ${video.thumbnailGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

          {/* Play button */}
          <div className="h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform relative z-10">
            <Play className="w-5 h-5 text-slate-900 ml-0.5" />
          </div>

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-white text-xs font-medium">
            {video.duration}
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
            {video.title}
          </h3>
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
            {video.description}
          </p>
        </div>
      </button>
    );
  }

  // Expanded variant
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <VideoPlayer video={video} />

      <div className="p-6">
        <h3 className="text-lg font-bold text-slate-900">{video.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{video.description}</p>

        {/* Meta info */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{video.duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>For {video.targetAudience[0]}</span>
          </div>
        </div>

        {/* Key Topics */}
        <div className="mt-6">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Key Topics
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>

          {isExpanded && (
            <ul className="mt-3 space-y-2 pl-5">
              {video.keyTopics.map((topic, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-indigo-500 mt-0.5">•</span>
                  {topic}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Prerequisites */}
        {video.prerequisites.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800">Prerequisites</p>
            <ul className="mt-1 space-y-1">
              {video.prerequisites.map((prereq, idx) => (
                <li key={idx} className="text-sm text-amber-700">• {prereq}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

interface VideoScriptOutlineProps {
  video: VideoWalkthrough;
}

export function VideoScriptOutline({ video }: VideoScriptOutlineProps) {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
      <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-indigo-500" />
        Script Outline: {video.title}
      </h3>

      <div className="space-y-4">
        {video.scriptOutline.map((section, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-600">{section.timestamp}</span>
            </div>
            <div className="flex-1 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
              <h4 className="font-medium text-slate-900">{section.title}</h4>
              <p className="mt-1 text-sm text-slate-600">{section.description}</p>
              <ul className="mt-2 space-y-1">
                {section.keyPoints.map((point, pIdx) => (
                  <li key={pIdx} className="text-sm text-slate-500 flex items-start gap-2">
                    <span className="text-indigo-400 shrink-0">→</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
