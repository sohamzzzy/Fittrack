import { Link } from "wouter";
import { useGetWorkoutSummary, useGetNutritionSummary, useGetSocialFeed, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dumbbell, Flame, Heart, Clock, TrendingUp, Plus, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

function MacroRing({ value, goal, color, label }: { value: number; goal: number; color: string; label: string }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(220 10% 12%)" strokeWidth="8" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">{Math.round(value)}g</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: workout, isLoading: wLoading } = useGetWorkoutSummary();
  const { data: nutrition, isLoading: nLoading } = useGetNutritionSummary({ date: today });
  const { data: feed, isLoading: fLoading } = useGetSocialFeed({ limit: 3, offset: 0 });
  const { data: me } = useGetMe();

  const calLeft = nutrition ? Math.max(0, (nutrition.goalCalories ?? 2000) - nutrition.totalCalories) : 0;
  const calPct = nutrition && nutrition.goalCalories ? Math.min(nutrition.totalCalories / nutrition.goalCalories, 1) : 0;
  const r = 56;
  const circ = 2 * Math.PI * r;
  const dash = calPct * circ;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        {me && (
          <Avatar className="w-9 h-9">
            <AvatarImage src={me.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">{(me.username ?? "U")[0].toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Calories Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="bg-card border-card-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r={r} fill="none" stroke="hsl(220 10% 12%)" strokeWidth="12" />
                  <circle cx="64" cy="64" r={r} fill="none" stroke="hsl(15 100% 55%)" strokeWidth="12" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Flame className="w-4 h-4 text-primary mb-1" />
                  {nLoading ? <Skeleton className="w-12 h-6" /> : <span className="text-xl font-black">{Math.round(calLeft)}</span>}
                  <span className="text-[10px] text-muted-foreground">kcal left</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Today's Macros</p>
                {nLoading ? (
                  <div className="flex gap-4"><Skeleton className="w-16 h-16 rounded-full" /><Skeleton className="w-16 h-16 rounded-full" /><Skeleton className="w-16 h-16 rounded-full" /></div>
                ) : (
                  <div className="flex gap-3">
                    <MacroRing value={nutrition?.totalProtein ?? 0} goal={nutrition?.goalProtein ?? 150} color="hsl(0 80% 60%)" label="Protein" />
                    <MacroRing value={nutrition?.totalCarbs ?? 0} goal={nutrition?.goalCarbs ?? 200} color="hsl(40 90% 55%)" label="Carbs" />
                    <MacroRing value={nutrition?.totalFats ?? 0} goal={nutrition?.goalFats ?? 65} color="hsl(200 80% 55%)" label="Fats" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Workout Summary */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">This Week</CardTitle>
              <Link href="/workouts"><span className="text-xs text-primary font-semibold cursor-pointer hover:underline">See all</span></Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {wLoading ? (
              <div className="grid grid-cols-3 gap-4"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-black text-primary">{workout?.thisWeek ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-medium">Workouts</div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-black">{workout?.totalWorkouts ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-medium">Total</div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-black">{workout?.streakDays ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-medium">Streak</div>
                </div>
              </div>
            )}
            <Link href="/workout">
              <Button className="w-full mt-4 font-bold" size="sm" data-testid="button-start-workout">
                <Plus className="w-4 h-4 mr-2" /> Start Workout
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Feed */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Activity Feed</h2>
          <Link href="/feed"><span className="text-xs text-primary font-semibold cursor-pointer hover:underline">See all</span></Link>
        </div>
        {fLoading ? (
          <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-20" />)}</div>
        ) : Array.isArray(feed) && feed.length > 0 ? (
          <div className="space-y-3">
            {(Array.isArray(feed) ? feed : []).map((post) => (
              <Card key={post.id} className="bg-card border-card-border">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={post.user?.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{(post.user?.username ?? "U")[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{post.user?.username}</p>
                      <p className="text-sm text-muted-foreground truncate">{post.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likesCount}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-card-border">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              <p>No activity yet. Follow others to see their posts.</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
