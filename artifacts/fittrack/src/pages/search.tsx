import { useState } from "react";
import { Link } from "wouter";
import { useSearchUsers, useFollowUser, useUnfollowUser, customFetch } from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon, UserPlus, UserMinus, Ban } from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "use-debounce";

export default function Search() {
  const [q, setQ] = useState("");
  const [debouncedQ] = useDebounce(q, 300);
  const searchQ: string | undefined = debouncedQ || undefined;
  const { data: users, isLoading } = useSearchUsers({ q: searchQ as string }, { query: { enabled: true, queryKey: ["/api/users/search", searchQ] } });
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const qc = useQueryClient();
  const { data: blockedUsers = [] } = useQuery<Array<{ id: number; username: string; displayName: string | null }>>({
    queryKey: ["/api/social/blocked"],
    queryFn: () => customFetch("/api/social/blocked", { responseType: "json" }),
  });
  const unblockUser = useMutation({
    mutationFn: (userId: number) => customFetch(`/api/social/block/${userId}`, { method: "DELETE", responseType: "json" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/social/blocked"] });
      qc.invalidateQueries({ queryKey: ["/api/users/search"] });
    },
  });

  const handleFollowToggle = (userId: number, isFollowing: boolean) => {
    const fn = isFollowing ? unfollowUser : followUser;
    qc.setQueriesData({ queryKey: ["/api/users/search"] }, (old: any) =>
      Array.isArray(old) ? old.map((user) => user.id === userId ? {
        ...user,
        isFollowing: !isFollowing,
        followersCount: Math.max(0, (user.followersCount ?? 0) + (isFollowing ? -1 : 1)),
      } : user) : old
    );
    fn.mutate({ userId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/users/search"] });
        qc.invalidateQueries({ queryKey: ["/api/social/feed"] });
        qc.invalidateQueries({ queryKey: ["/api/users", userId] });
      },
      onError: () => qc.invalidateQueries({ queryKey: ["/api/users/search"] }),
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Discover</h1>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by username or display name..." value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-user-search" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : users && users.length > 0 ? (
        <div className="space-y-2">
          {users.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="bg-card border-card-border hover:border-primary/30 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${u.id}`}>
                      <Avatar className="w-10 h-10 cursor-pointer shrink-0">
                        <AvatarImage src={u.avatarUrl ?? undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">{(u.username ?? "U")[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <Link href={`/profile/${u.id}`} className="flex-1 min-w-0 cursor-pointer">
                      <p className="font-semibold text-sm">{u.displayName ?? u.username}</p>
                      <p className="text-xs text-muted-foreground">@{u.username} · {u.followersCount ?? 0} followers</p>
                    </Link>
                    <Button
                      size="sm"
                      variant={u.isFollowing ? "outline" : "default"}
                      className="font-bold shrink-0"
                      onClick={() => handleFollowToggle(u.id, !!u.isFollowing)}
                      disabled={followUser.isPending || unfollowUser.isPending}
                      data-testid={`button-follow-${u.id}`}
                    >
                      {u.isFollowing ? (<><UserMinus className="w-3.5 h-3.5 mr-1" />Unfollow</>) : (<><UserPlus className="w-3.5 h-3.5 mr-1" />Follow</>)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-card-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            {q ? `No users found for "${q}"` : "Search by username or display name"}
          </CardContent>
        </Card>
      )}

      {blockedUsers.length > 0 && (
        <Card className="bg-card border-card-border">
          <CardContent className="py-4">
            <h2 className="font-bold flex items-center gap-2 mb-3"><Ban className="w-4 h-4" />Blocked users</h2>
            <div className="space-y-2">
              {blockedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user.displayName ?? user.username}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => unblockUser.mutate(user.id)} disabled={unblockUser.isPending}>Unblock</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
