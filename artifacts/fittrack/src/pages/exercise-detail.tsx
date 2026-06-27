import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetExercise,
  useGetExerciseHistory,
  useDeleteExercise,
  getGetExerciseQueryKey,
  getGetExerciseHistoryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Trophy, TrendingUp, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateExercises } from "@/hooks/use-exercise-cache";
import { apiErrorMessage } from "@/lib/api-errors";

type ChartType = "weight" | "oneRepMax" | "volume";

const CHART_LABELS: Record<ChartType, string> = {
  weight: "Max Weight",
  oneRepMax: "Est. 1RM",
  volume: "Total Volume",
};
const CHART_COLORS: Record<ChartType, string> = {
  weight: "hsl(15 100% 55%)",
  oneRepMax: "hsl(40 90% 55%)",
  volume: "hsl(200 80% 55%)",
};

export default function ExerciseDetail() {
  const params = useParams<{ id: string }>();
  const exerciseId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const [chartType, setChartType] = useState<ChartType>("weight");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();
  const invalidate = useInvalidateExercises();
  const deleteExercise = useDeleteExercise();

  const { data: exercise, isLoading: exLoading } = useGetExercise(exerciseId, {
    query: { enabled: !!exerciseId, queryKey: getGetExerciseQueryKey(exerciseId) },
  });
  const { data: history, isLoading: histLoading } = useGetExerciseHistory(exerciseId, {
    query: { enabled: !!exerciseId, queryKey: getGetExerciseHistoryQueryKey(exerciseId) },
  });

  const chartData = history?.[chartType] ?? [];
  const pr = history?.personalRecord;

  const handleDelete = () => {
    deleteExercise.mutate(
      { exerciseId },
      {
        onSuccess: () => {
          invalidate(exerciseId);
          toast({ title: "Exercise deleted" });
          setLocation("/exercises");
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Could not delete exercise",
            description: apiErrorMessage(err),
          });
          setDeleteOpen(false);
        },
      },
    );
  };

  if (exLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!exercise) {
    return <div className="text-center text-muted-foreground py-16">Exercise not found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/exercises">
          <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black truncate">{exercise.name}</h1>
            {exercise.isCustom && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground shrink-0">
                Custom
              </Badge>
            )}
            {pr && (
              <Badge className="bg-amber-400/10 border-amber-400/20 text-amber-400 shrink-0">
                <Trophy className="w-3 h-3 mr-1" />
                {pr}kg PR
              </Badge>
            )}
          </div>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {exercise.category}
            </Badge>
            {exercise.muscleGroups?.map((m) => (
              <Badge key={m} variant="outline" className="text-xs text-muted-foreground">
                {m}
              </Badge>
            ))}
          </div>
        </div>
        {exercise.isCustom && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => setDeleteOpen(true)}
            data-testid="button-delete-exercise"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        )}
      </div>

      {exercise.description && (
        <Card className="bg-card border-card-border">
          <CardContent className="py-3 px-4 text-sm text-muted-foreground">{exercise.description}</CardContent>
        </Card>
      )}

      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Progress
            </CardTitle>
            <div className="flex gap-1">
              {(["weight", "oneRepMax", "volume"] as ChartType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={cn(
                    "text-xs px-2 py-1 rounded font-medium transition-colors",
                    chartType === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
                  )}
                  data-testid={`button-chart-${t}`}
                >
                  {t === "weight" ? "Weight" : t === "oneRepMax" ? "1RM" : "Vol"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          {histLoading ? (
            <Skeleton className="h-48" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 10% 12%)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => d.slice(5)}
                  tick={{ fontSize: 10, fill: "hsl(220 10% 60%)" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 60%)" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220 10% 8%)",
                    border: "1px solid hsl(220 10% 16%)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(220 10% 70%)", marginBottom: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS[chartType]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_COLORS[chartType] }}
                  name={CHART_LABELS[chartType]}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              No data yet. Log this exercise to see progress.
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-card-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custom exercise?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Exercises used in workouts or routines cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteExercise.isPending}
            >
              {deleteExercise.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
