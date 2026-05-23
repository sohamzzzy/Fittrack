import { useState } from "react";
import { Link } from "wouter";
import { useListExercises, useCreateExercise, getListExercisesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Plus, ChevronRight, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "Cardio", "Other"];
const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Glutes", "Core", "Calves"];
const CATEGORY_COLORS: Record<string, string> = {
  Barbell: "text-primary border-primary/20 bg-primary/10",
  Dumbbell: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  Machine: "text-blue-400 border-blue-400/20 bg-blue-400/10",
  Cable: "text-purple-400 border-purple-400/20 bg-purple-400/10",
  Bodyweight: "text-green-400 border-green-400/20 bg-green-400/10",
  Cardio: "text-red-400 border-red-400/20 bg-red-400/10",
  Other: "text-muted-foreground border-border bg-secondary",
};

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("Barbell");
  const [newMuscles, setNewMuscles] = useState<string[]>([]);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: exercises, isLoading } = useListExercises({ q: search || undefined, category: filterCat !== "all" ? filterCat : undefined });
  const createExercise = useCreateExercise();

  const handleCreate = () => {
    if (!newName.trim()) return;
    createExercise.mutate({ data: { name: newName, category: newCat, muscleGroups: newMuscles } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListExercisesQueryKey() });
        setOpen(false); setNewName(""); setNewMuscles([]);
        toast({ title: "Exercise created" });
      },
    });
  };

  const toggleMuscle = (m: string) => setNewMuscles((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Exercises</h1>
        <Button size="sm" className="font-bold" onClick={() => setOpen(true)} data-testid="button-create-exercise">
          <Plus className="w-4 h-4 mr-1" /> New
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search exercises..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-exercise-search" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-36" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : exercises && exercises.length > 0 ? (
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <motion.div key={ex.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
              <Link href={`/exercises/${ex.id}`}>
                <Card className="bg-card border-card-border hover:border-primary/30 transition-colors cursor-pointer" data-testid={`card-exercise-${ex.id}`}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{ex.name}</span>
                        {ex.isCustom && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Custom</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[ex.category] ?? ""}`}>{ex.category}</Badge>
                        {ex.muscleGroups?.slice(0, 2).map((m) => (
                          <span key={m} className="text-[10px] text-muted-foreground">{m}</span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-card-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? `No exercises found for "${search}"` : "No exercises. Create your own!"}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>New Exercise</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Exercise name" value={newName} onChange={(e) => setNewName(e.target.value)} data-testid="input-exercise-name" />
            <Select value={newCat} onValueChange={setNewCat}>
              <SelectTrigger data-testid="select-exercise-category"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Muscle Groups</p>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_GROUPS.map((m) => (
                  <button key={m} onClick={() => toggleMuscle(m)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${newMuscles.includes(m) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`} data-testid={`button-muscle-${m}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createExercise.isPending} className="font-bold" data-testid="button-save-exercise">
              {createExercise.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
