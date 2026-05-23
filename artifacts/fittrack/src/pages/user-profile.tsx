import { useParams, Link } from "wouter";
import { useGetUserById, useFollowUser, useUnfollowUser, getGetUserByIdQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, UserPlus, UserMinus } from "lucide-react";
import { motion } from "framer-motion";

export default function UserProfile() {
  const params = useParams<{ id: string }>();
  const userId = parseInt(params.id);
  const { data: user, isLoading } = useGetUserById(userId, { query: { enabled: !!userId, queryKey: getGetUserByIdQueryKey(userId) } });
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const qc = useQueryClient();

  const handleFollowToggle = () => {
    if (!user) return;
    const fn = user.isFollowing ? unfollowUser : followUser;
    fn.mutate({ userId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetUserByIdQueryKey(userId) }) });
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
    </div>
  );
}
