"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function RealtimeRefresh({ classId, onEvent }: { classId: string; onEvent: () => void }) {
  useEffect(() => {
    const db = supabaseBrowser();
    const channel = db.channel(`class-events-${classId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "class_activity_events", filter: `class_id=eq.${classId}` },
        () => onEvent()
      )
      .subscribe();

    return () => { void db.removeChannel(channel); };
  }, [classId, onEvent]);

  return null;
}
