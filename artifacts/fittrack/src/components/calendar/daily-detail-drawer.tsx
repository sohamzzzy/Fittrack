import React from "react";
import { format } from "date-fns";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useGetCalendarDetail, getGetCalendarDetailQueryKey } from "@workspace/api-client-react";
import { Dumbbell, Utensils, Droplet, Pill, ArrowRight, Loader2, Star } from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function DailyDetailDrawer({ open, date, onOpenChange }: { open: boolean, date: Date | null, onOpenChange: (open: boolean) => void }) {
  const dateStr = date ? format(date, "yyyy-MM-dd") : "";
  const { data, isLoading } = useGetCalendarDetail(
    { date: dateStr }, 
    { query: { enabled: !!dateStr && open, queryKey: getGetCalendarDetailQueryKey({ date: dateStr }) } }
  );

  if (!date) return null;

  const isEmpty = data && !data.workout.completed && !data.nutrition.logged && data.hydration.consumedMl === 0 && data.supplements.completedCount === 0;
  const isPerfect = data && data.workout.completed && data.nutrition.logged && data.hydration.consumedMl >= data.hydration.goalMl && (data.supplements.totalCount > 0 ? data.supplements.completedCount >= data.supplements.totalCount : true);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="max-w-md w-full mx-auto flex flex-col overflow-hidden">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-2xl font-bold flex items-center gap-2">
                  {format(date, "EEEE, MMMM d")}
                  {isPerfect && <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                </DrawerTitle>
                {isPerfect && <DrawerDescription className="text-yellow-600 dark:text-yellow-500 font-semibold mt-1">Perfect Day Achieved! 🌟</DrawerDescription>}
              </div>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : isEmpty ? (
              <div className="text-center py-10 space-y-6">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">No Activity Logged</h3>
                  <p className="text-muted-foreground text-sm">You haven't logged any health data for this day.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" asChild onClick={() => onOpenChange(false)}><Link href="/workout"><Dumbbell className="w-4 h-4 mr-2"/>Start Workout</Link></Button>
                  <Button variant="outline" asChild onClick={() => onOpenChange(false)}><Link href="/nutrition/log"><Utensils className="w-4 h-4 mr-2"/>Log Food</Link></Button>
                  <Button variant="outline" asChild onClick={() => onOpenChange(false)}><Link href="/nutrition"><Droplet className="w-4 h-4 mr-2"/>Add Water</Link></Button>
                  <Button variant="outline" asChild onClick={() => onOpenChange(false)}><Link href="/nutrition"><Pill className="w-4 h-4 mr-2"/>Supplements</Link></Button>
                </div>
              </div>
            ) : data && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-2 bg-muted/50 p-3 rounded-lg text-center">
                  <div><div className="text-xs text-muted-foreground font-semibold mb-1">WORKOUTS</div><div className="font-bold">{data.workout.workouts.length}</div></div>
                  <div><div className="text-xs text-muted-foreground font-semibold mb-1">CALORIES</div><div className="font-bold">{data.nutrition.calories}</div></div>
                  <div><div className="text-xs text-muted-foreground font-semibold mb-1">WATER</div><div className="font-bold">{data.hydration.consumedMl} ml</div></div>
                  <div><div className="text-xs text-muted-foreground font-semibold mb-1">SUPPS</div><div className="font-bold">{data.supplements.completedCount}/{data.supplements.totalCount}</div></div>
                </div>

                {/* Workout */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold text-lg"><Dumbbell className="w-5 h-5 text-blue-500" /> Workout</div>
                  {data.workout.completed ? (
                    <div className="space-y-2">
                      {data.workout.workouts.map(w => (
                        <div key={w.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                          <div>
                            <p className="font-bold">{w.name}</p>
                            <p className="text-xs text-muted-foreground">{w.exercisesCount} exercises {w.durationMinutes ? `· ${w.durationMinutes} min` : ''} {w.totalVolume ? `· Vol: ${w.totalVolume}` : ''}</p>
                          </div>
                          <Button variant="ghost" size="sm" asChild onClick={() => onOpenChange(false)}>
                            <Link href={`/workouts/${w.id}`}><ArrowRight className="w-4 h-4" /></Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No workout logged.</p>
                  )}
                </div>

                {/* Nutrition */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold text-lg"><Utensils className="w-5 h-5 text-green-500" /> Nutrition</div>
                  {data.nutrition.logged ? (
                    <div className="space-y-3 p-3 border rounded-lg bg-card">
                      <div className="grid grid-cols-4 gap-2 text-center text-sm">
                        <div><div className="font-bold">{data.nutrition.calories}</div><div className="text-xs text-muted-foreground">kcal</div></div>
                        <div><div className="font-bold">{data.nutrition.protein}g</div><div className="text-xs text-muted-foreground">Pro</div></div>
                        <div><div className="font-bold">{data.nutrition.carbs}g</div><div className="text-xs text-muted-foreground">Carbs</div></div>
                        <div><div className="font-bold">{data.nutrition.fats}g</div><div className="text-xs text-muted-foreground">Fat</div></div>
                      </div>
                      {data.nutrition.foods.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Foods Logged</p>
                          <div className="flex flex-wrap gap-2">
                            {data.nutrition.foods.map((f, i) => (
                              <span key={i} className="text-xs bg-muted px-2 py-1 rounded-md">{f.name} ({f.calories} kcal)</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No nutrition logged.</p>
                  )}
                </div>

                {/* Hydration */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold text-lg"><Droplet className="w-5 h-5 text-cyan-500" /> Hydration</div>
                  <div className="p-3 border rounded-lg bg-card space-y-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>{data.hydration.consumedMl} ml</span>
                      <span className="text-muted-foreground">Goal: {data.hydration.goalMl} ml</span>
                    </div>
                    <Progress value={Math.min(100, (data.hydration.consumedMl / data.hydration.goalMl) * 100)} className="h-2" />
                  </div>
                </div>

                {/* Supplements */}
                {data.supplements.totalCount > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-bold text-lg"><Pill className="w-5 h-5 text-purple-500" /> Supplements</div>
                    <div className="p-3 border rounded-lg bg-card space-y-2">
                      <div className="flex justify-between text-sm font-semibold mb-2">
                        <span>{data.supplements.completedCount} / {data.supplements.totalCount} Taken</span>
                      </div>
                      <div className="space-y-1">
                        {data.supplements.items.map(s => (
                          <div key={s.id} className="flex items-center gap-2 text-sm">
                            <div className={cn("w-2 h-2 rounded-full", s.isTaken ? "bg-green-500" : "bg-muted")} />
                            <span className={s.isTaken ? "" : "text-muted-foreground line-through"}>{s.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DrawerFooter className="border-t">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
