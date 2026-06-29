import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, useGetMe } from "@workspace/api-client-react";
import { ArrowLeft, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function UserWorkouts() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id);
  const { data: me } = useGetMe();
  const qc = useQueryClient();
  const { toast } = useToast();

  const isMe = me?.id === userId;

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["/api/workouts/user", userId],
    queryFn: () => customFetch(`/api/workouts/user/${userId}`, { responseType: "json" }) as Promise<any[]>,
    enabled: !!userId,
  });

  const toggleVisibility = useMutation({
    mutationFn: ({ workoutId, isPublic }: { workoutId: number, isPublic: boolean }) => 
      customFetch(`/api/workouts/${workoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
        responseType: "json"
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/workouts/user", userId] });
      toast({ title: "Workout visibility updated" });
    },
    onError: () => {
      toast({ title: "Failed to update visibility", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/profile/${isMe ? '' : userId}`}>
          <Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-xl font-black">{isMe ? "My Workouts" : "Workouts"}</h1>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {workouts && workouts.length === 0 && (
        <p className="text-muted-foreground text-center py-10">No public workouts found.</p>
      )}

      <div className="space-y-3">
        {workouts && workouts.map((w) => (
          <Card key={w.id} className="bg-card border-card-border overflow-hidden">
            <CardContent className="py-4 px-4">
              <div className="flex items-start justify-between">
                <Link href={`/workouts/${w.id}`} className="flex-1 cursor-pointer hover:underline">
                  <p className="font-semibold">{w.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(w.startedAt), { addSuffix: true })} 
                    {w.durationMinutes ? ` • ${w.durationMinutes} min` : ''}
                  </p>
                </Link>
                {isMe && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => toggleVisibility.mutate({ workoutId: w.id, isPublic: !w.isPublic })}
                    disabled={toggleVisibility.isPending}
                  >
                    {w.isPublic ? <Globe className="w-4 h-4 text-green-400" /> : <Lock className="w-4 h-4" />}
                    <span className="ml-1 text-xs">{w.isPublic ? "Public" : "Private"}</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
