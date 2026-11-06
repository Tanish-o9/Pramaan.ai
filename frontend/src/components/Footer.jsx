import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-900 mt-auto py-6 text-center text-xs text-zinc-500">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Presence.ai · Campus Attendance System</span>
        <span>Built by Tanish Rajput · ResNet-128 & Voice Biomarkers</span>
      </div>
    </footer>
  );
}
