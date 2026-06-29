import { useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch, useFollowUser, useUnfollowUser, getGetUserByIdQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserFollowers() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id);
  const qc = useQueryClient();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/social/followers", userId],
    queryFn: () => customFetch(`/api/social/followers/${userId}`, { responseType: "json" }) as Promise<any[]>,
    enabled: !!userId,
  });

  const handleFollowToggle = (u: any) => {
    const fn = u.isFollowing ? unfollowUser : followUser;
    
    qc.setQueryData(["/api/social/followers", userId], (old: any) => 
      Array.isArray(old) ? old.map(user => user.id === u.id ? { ...user, isFollowing: !u.isFollowing } : user) : old
    );
    
    fn.mutate({ userId: u.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetUserByIdQueryKey(u.id) });
        qc.invalidateQueries({ queryKey: getGetUserByIdQueryKey(userId) });
        qc.invalidateQueries({ queryKey: ["/api/users/search"] });
        qc.invalidateQueries({ queryKey: ["/api/social/feed"] });
      },
      onError: () => qc.invalidateQueries({ queryKey: ["/api/social/followers", userId] })
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/profile/${userId}`}>
          <Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-xl font-black">Followers</h1>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {users && users.length === 0 && (
        <p className="text-muted-foreground text-center py-10">No followers yet.</p>
      )}

      {users && users.map(user => (
        <div key={user.id} className="flex items-center justify-between p-3 bg-card border border-card-border rounded-xl">
          <Link href={`/profile/${user.id}`} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
            <Avatar>
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-bold truncate">{user.displayName || user.username}</p>
              <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
            </div>
          </Link>
          <Button
            size="sm"
            variant={user.isFollowing ? "outline" : "default"}
            className="ml-3 font-bold shrink-0"
            onClick={(e) => { e.preventDefault(); handleFollowToggle(user); }}
            disabled={followUser.isPending || unfollowUser.isPending}
          >
            {user.isFollowing ? <><UserMinus className="w-3.5 h-3.5 mr-1" />Unfollow</> : <><UserPlus className="w-3.5 h-3.5 mr-1" />Follow</>}
          </Button>
        </div>
      ))}
    </div>
  );
}
