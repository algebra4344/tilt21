"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Leaderboard from "@/components/Leaderboard";

export default function LeaderboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    if (!token) {
      router.push("/");
    } else if (!user) {
      fetchUser();
    }
  }, [token, user, fetchUser, router]);

  if (!token || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      <Leaderboard />
    </div>
  );
}
