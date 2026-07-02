import React, { useState, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Star, Dumbbell, Utensils, Droplet, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCalendarSummary } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export function CalendarView({ onSelectDay }: { onSelectDay: (date: Date) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDateStr = format(monthStart, "yyyy-MM-dd");
  const endDateStr = format(monthEnd, "yyyy-MM-dd");

  const { data: summary, isLoading } = useGetCalendarSummary({
    startDate: startDateStr,
    endDate: endDateStr,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const days = useMemo(() => {
    const start = new Date(monthStart);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(monthEnd);
    end.setDate(end.getDate() + (6 - end.getDay()));
    
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-2xl font-bold">{format(currentDate, "MMMM yyyy")}</CardTitle>
          <Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:inline-flex">Today</Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-5 h-5" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center text-sm font-semibold text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="truncate">{day}</div>
          ))}
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : (
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {days.map((day, i) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayData = summary?.find(d => d.date === dateStr);
              
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isDayToday = isToday(day);
              
              return (
                <div 
                  key={i} 
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "min-h-[80px] md:min-h-[100px] border rounded-lg p-1 flex flex-col transition-all cursor-pointer hover:border-primary/50",
                    isCurrentMonth ? "bg-card" : "bg-muted/30 opacity-50 text-muted-foreground",
                    isDayToday && "ring-2 ring-primary ring-inset",
                    dayData?.perfectDay && "bg-primary/5 border-primary/30"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn("text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full", isDayToday ? "bg-primary text-primary-foreground" : "")}>
                      {format(day, "d")}
                    </span>
                    {dayData?.perfectDay && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                  </div>
                  
                  <div className="flex-1 flex flex-wrap gap-1 content-start mt-1">
                    {dayData?.hasWorkout && <div className="p-1 rounded-sm bg-blue-500/20 text-blue-500" title="Workout Logged"><Dumbbell className="w-3 h-3 md:w-4 md:h-4" /></div>}
                    {dayData?.hasFood && <div className="p-1 rounded-sm bg-green-500/20 text-green-500" title="Food Logged"><Utensils className="w-3 h-3 md:w-4 md:h-4" /></div>}
                    {dayData?.waterGoalReached && <div className="p-1 rounded-sm bg-cyan-500/20 text-cyan-500" title="Water Goal Met"><Droplet className="w-3 h-3 md:w-4 md:h-4" /></div>}
                    {dayData?.supplementsCompleted && <div className="p-1 rounded-sm bg-purple-500/20 text-purple-500" title="Supplements Taken"><Pill className="w-3 h-3 md:w-4 md:h-4" /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
