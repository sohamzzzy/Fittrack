import { useGetMe, useGetMyStats, useListWorkouts, useUpdateMe, getGetMeQueryKey, getGetMyStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { useClerk } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Dumbbell, TrendingUp, Users, Zap, LogOut, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { data: me, isLoading } = useGetMe();
  const { data: stats } = useGetMyStats();
  const { data: workouts } = useListWorkouts();
  const updateMe = useUpdateMe();
  const qc = useQueryClient();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");

  const openEdit = () => {
    setDisplayName(me?.displayName ?? "");
    setBio(me?.bio ?? "");
    setUsername(me?.username ?? "");
    setEditOpen(true);
  };

  const handleSave = () => {
    updateMe.mutate({ data: { displayName, bio, username } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setEditOpen(false);
        toast({ title: "Profile updated" });
      },
    });
  };

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-32" />
      <div className="grid grid-cols-2 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Profile</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={openEdit} data-testid="button-edit-profile"><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => signOut()} data-testid="button-sign-out"><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-card border-card-border">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={me?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-black">{(me?.username ?? "U")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black">{me?.displayName ?? me?.username}</h2>
                {me?.displayName && <p className="text-sm text-muted-foreground">@{me.username}</p>}
                {me?.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{me.bio}</p>}
              </div>
            </div>
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <div className="text-xl font-black">{stats?.totalFollowers ?? 0}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black">{stats?.totalFollowing ?? 0}</div>
                <div className="text-xs text-muted-foreground">Following</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black">{stats?.totalWorkouts ?? 0}</div>
                <div className="text-xs text-muted-foreground">Workouts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Dumbbell, label: "Workouts", value: stats?.totalWorkouts ?? 0, sub: "all time", color: "text-primary" },
          { icon: Zap, label: "This Week", value: stats?.thisWeekWorkouts ?? 0, sub: "sessions", color: "text-amber-400" },
          { icon: TrendingUp, label: "Streak", value: stats?.currentStreak ?? 0, sub: "days", color: "text-green-400" },
          { icon: Users, label: "Followers", value: stats?.totalFollowers ?? 0, sub: "people", color: "text-blue-400" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}>
            <Card className="bg-card border-card-border">
              <CardContent className="pt-4 pb-4 flex flex-col items-center text-center">
                <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
                <div className="text-2xl font-black">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {workouts && workouts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Workouts</h3>
            <Link href="/workouts"><span className="text-xs text-primary font-semibold cursor-pointer hover:underline">See all</span></Link>
          </div>
          <div className="space-y-2">
            {(Array.isArray(workouts) ? workouts : [])
              .slice(0, 3)
              .map((w) => (
              <Link key={w.id} href={`/workouts/${w.id}`}>
                <Card className="bg-card border-card-border hover:border-primary/30 cursor-pointer transition-colors">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{w.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(w.startedAt), { addSuffix: true })}</p>
                      </div>
                      {w.durationMinutes && <span className="text-xs text-muted-foreground">{w.durationMinutes}min</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground font-medium block mb-1">Username</label><Input value={username} onChange={(e) => setUsername(e.target.value)} data-testid="input-username" /></div>
            <div><label className="text-xs text-muted-foreground font-medium block mb-1">Display Name</label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-testid="input-display-name" /></div>
            <div><label className="text-xs text-muted-foreground font-medium block mb-1">Bio</label><Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people about yourself..." data-testid="input-bio" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMe.isPending} className="font-bold" data-testid="button-save-profile">
              {updateMe.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
