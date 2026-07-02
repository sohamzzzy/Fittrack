import React, { useState } from "react";
import { CalendarView } from "@/components/calendar/calendar-view";
import { DailyDetailDrawer } from "@/components/calendar/daily-detail-drawer";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelectDay = (date: Date) => {
    setSelectedDate(date);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-black italic tracking-tighter">CALENDAR</h1>
        <p className="text-muted-foreground">Your personal fitness journal and consistency tracker.</p>
      </div>

      <CalendarView onSelectDay={handleSelectDay} />

      <DailyDetailDrawer 
        open={drawerOpen} 
        date={selectedDate} 
        onOpenChange={setDrawerOpen} 
      />
    </div>
  );
}
