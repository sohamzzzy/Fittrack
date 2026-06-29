import { useState } from "react";
import { format } from "date-fns";
import { 
  useGetWaterIntake, 
  useAddWaterEntry, 
  useUpdateWaterEntry, 
  useDeleteWaterEntry,
  getGetWaterIntakeQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Droplet, Trash2, Pencil, Check, X } from "lucide-react";
import { motion } from "framer-motion";

export function WaterIntake({ date }: { date: string }) {
  const qc = useQueryClient();
  const { data: water, isLoading } = useGetWaterIntake({ date });
  const addEntry = useAddWaterEntry();
  const updateEntry = useUpdateWaterEntry();
  const deleteEntry = useDeleteWaterEntry();

  const [customAmount, setCustomAmount] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: getGetWaterIntakeQueryKey({ date }) });

  const handleAdd = (amountMl: number) => {
    addEntry.mutate({ data: { amountMl, date } }, { onSuccess: refresh });
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(customAmount);
    if (!isNaN(amount) && amount > 0) {
      handleAdd(amount);
      setCustomAmount("");
    }
  };

  const handleDelete = (entryId: number) => {
    deleteEntry.mutate({ entryId }, { onSuccess: refresh });
  };

  const startEdit = (id: number, amount: number) => {
    setEditingId(id);
    setEditAmount(amount.toString());
  };

  const saveEdit = (id: number) => {
    const amountMl = parseInt(editAmount);
    if (!isNaN(amountMl) && amountMl > 0) {
      updateEntry.mutate({ entryId: id, data: { amountMl } }, { 
        onSuccess: () => {
          setEditingId(null);
          refresh();
        } 
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-card-border overflow-hidden relative shadow-md">
        <CardContent className="pt-6">
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const total = water?.totalMl ?? 0;
  const goal = water?.goalMl ?? 3000;
  const pct = Math.min(total / goal, 1);
  const remaining = Math.max(0, goal - total);
  
  return (
    <Card className="bg-card border-card-border overflow-hidden relative shadow-md">
      <div className="absolute inset-0 bg-blue-500/5 z-0" />
      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplet className="w-5 h-5 text-blue-500 fill-blue-500" />
          Water Intake
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 space-y-6 pt-2">
        <div className="flex items-center gap-6">
          {/* Progress Indicator */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(220 10% 10%)" strokeWidth="12" />
              <circle 
                cx="50" cy="50" r="44" fill="none" stroke="hsl(210 100% 50%)" 
                strokeWidth="12" strokeDasharray={`${pct * 276.46} 276.46`} 
                strokeLinecap="round" className="transition-all duration-700" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-blue-500">{total}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">of {goal}mL</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground">Remaining today</p>
              <p className="text-2xl font-black tracking-tight">{remaining} <span className="text-sm font-normal text-muted-foreground">mL</span></p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {[250, 500, 750, 1000].map(amt => (
                <Button 
                  key={amt} 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleAdd(amt)}
                  disabled={addEntry.isPending}
                  className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-400"
                >
                  +{amt}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleCustomAdd} className="flex gap-2">
          <Input 
            type="number" 
            placeholder="Custom amount (mL)" 
            value={customAmount} 
            onChange={(e) => setCustomAmount(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!customAmount || addEntry.isPending} variant="secondary">
            Add
          </Button>
        </form>

        {water?.entries && water.entries.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Today's History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {water.entries.map((entry) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  key={entry.id} 
                  className="flex items-center justify-between p-2 rounded-md bg-secondary/50 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Droplet className="w-4 h-4 text-blue-400" />
                    <span className="text-muted-foreground text-xs w-16">
                      {format(new Date(entry.loggedAt), "h:mm a")}
                    </span>
                    {editingId === entry.id ? (
                      <Input 
                        type="number" 
                        value={editAmount} 
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-20 h-7 text-xs"
                        autoFocus
                      />
                    ) : (
                      <span className="font-bold">{entry.amountMl} mL</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {editingId === entry.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" onClick={() => saveEdit(entry.id)}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingId(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(entry.id, entry.amountMl)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10" onClick={() => handleDelete(entry.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
