import { useParams, Link, useLocation } from "wouter";
import { useGetUserById, useFollowUser, useUnfollowUser, getGetUserByIdQueryKey, customFetch } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, UserPlus, UserMinus, VolumeX, Volume2, Ban, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function UserProfile() {
  const params = useParams<{ id: string }>();
  const userId = parseInt(params.id);
  const { data: user, isLoading } = useGetUserById(userId, { query: { enabled: !!userId, queryKey: getGetUserByIdQueryKey(userId) } });
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const socialUser = user as (typeof user & {
    isMuted?: boolean;
    totalWorkouts?: number;
    recentActivity?: Array<{ id: number; content: string; createdAt: string }>;
  });
  const muteUser = useMutation({
    mutationFn: (muted: boolean) => customFetch(`/api/social/mute/${userId}`, {
      method: muted ? "DELETE" : "POST",
      responseType: "json",
    }),
    onSuccess: () => {
      qc.setQueryData(getGetUserByIdQueryKey(userId), (old: any) => old ? { ...old, isMuted: !old.isMuted } : old);
      qc.invalidateQueries({ queryKey: ["/api/social/feed"] });
      toast({ title: socialUser?.isMuted ? "User unmuted" : "User muted" });
    },
  });
  const blockUser = useMutation({
    mutationFn: () => customFetch(`/api/social/block/${userId}`, { method: "POST", responseType: "json" }),
    onSuccess: () => {
      qc.removeQueries({ queryKey: getGetUserByIdQueryKey(userId) });
      qc.invalidateQueries({ queryKey: ["/api/users/search"] });
      qc.invalidateQueries({ queryKey: ["/api/social/feed"] });
      navigate("/search");
      toast({ title: "User blocked" });
    },
  });

  const handleFollowToggle = () => {
    if (!user) return;
    const fn = user.isFollowing ? unfollowUser : followUser;
    const nextFollowing = !user.isFollowing;
    qc.setQueryData(getGetUserByIdQueryKey(userId), (old: any) => old ? {
      ...old,
      isFollowing: nextFollowing,
      followersCount: Math.max(0, (old.followersCount ?? 0) + (nextFollowing ? 1 : -1)),
    } : old);
    fn.mutate({ userId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetUserByIdQueryKey(userId) });
        qc.invalidateQueries({ queryKey: ["/api/users/search"] });
        qc.invalidateQueries({ queryKey: ["/api/social/feed"] });
      },
      onError: () => qc.invalidateQueries({ queryKey: getGetUserByIdQueryKey(userId) }),
    });
  };

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-36" />
      <div className="grid grid-cols-3 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
    </div>
  );
  if (!user) return <div className="text-center text-muted-foreground py-16">User not found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/search">
          <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-back"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-xl font-black">Profile</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-card border-card-border">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-black">{(user.username ?? "U")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">{user.displayName ?? user.username}</h2>
                    {user.displayName && <p className="text-sm text-muted-foreground">@{user.username}</p>}
                    {user.bio && <p className="text-sm text-muted-foreground mt-1">{user.bio}</p>}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant={user.isFollowing ? "outline" : "default"}
                      className="font-bold shrink-0"
                      onClick={handleFollowToggle}
                      disabled={followUser.isPending || unfollowUser.isPending}
                      data-testid="button-follow-toggle"
                    >
                      {user.isFollowing ? (<><UserMinus className="w-3.5 h-3.5 mr-1" />Unfollow</>) : (<><UserPlus className="w-3.5 h-3.5 mr-1" />Follow</>)}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => muteUser.mutate(!!socialUser?.isMuted)} disabled={muteUser.isPending}>
                      {socialUser?.isMuted ? <Volume2 className="w-3.5 h-3.5 mr-1" /> : <VolumeX className="w-3.5 h-3.5 mr-1" />}
                      {socialUser?.isMuted ? "Unmute" : "Mute"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => window.confirm("Block this user? Both follow relationships will be removed.") && blockUser.mutate()} disabled={blockUser.isPending}>
                      <Ban className="w-3.5 h-3.5 mr-1" />Block
                    </Button>
                  </div>
                </div>
                <div className="flex gap-5 mt-3">
                  <div className="text-center">
                    <div className="font-black">{user.followersCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="font-black">{user.followingCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Following</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-card border-card-border sm:col-span-1">
          <CardContent className="py-5 text-center">
            <Dumbbell className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-black">{socialUser?.totalWorkouts ?? 0}</div>
            <div className="text-xs text-muted-foreground">Public workouts</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border sm:col-span-2">
          <CardContent className="py-5">
            <h3 className="font-bold mb-3">Recent activity</h3>
            {socialUser?.recentActivity?.length ? (
              <div className="space-y-3">
                {socialUser.recentActivity.map((activity) => (
                  <div key={activity.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                    <p className="text-sm">{activity.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No public activity yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
