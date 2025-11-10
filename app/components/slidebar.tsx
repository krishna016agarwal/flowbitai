"use client";

import { Home, BarChart3, MessageSquare } from "lucide-react";
import Link from "next/link";

interface SidebarProps {
  width?: string; // ✅ width passed from parent
}

export default function Sidebar({ width = "20%" }: SidebarProps) {
  return (
    <div
      className="h-screen bg-gray-900 text-white flex flex-col p-6"
      style={{ width }}
    >
      <h1 className="text-2xl font-bold mb-10">📊 Flowbit</h1>

      <nav className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700 transition">
          <Home size={20} /> Dashboard
        </Link>
        <Link href="/chat" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700 transition">
          <MessageSquare size={20} /> Chat with Data
        </Link>
      
      </nav>
    </div>
  );
}
