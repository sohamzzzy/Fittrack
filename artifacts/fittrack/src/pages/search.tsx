import { useState } from "react";
import { Link } from "wouter";
import { useSearchUsers, useFollowUser, useUnfollowUser, getSearchUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon, UserPlus, UserMinus, ChevronRight } from "lucide-react";
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

  const handleFollowToggle = (userId: number, isFollowing: boolean) => {
    const fn = isFollowing ? unfollowUser : followUser;
    fn.mutate({ userId }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/users/search"] }) });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Discover</h1>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by username..." value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-user-search" />
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
            {q ? `No users found for "${q}"` : "Search for users by username"}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
