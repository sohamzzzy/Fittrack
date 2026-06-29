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
      <Card className="bg-card border-card-border overflow-hidden relative shadow-md h-full">
        <CardContent className="pt-4">
          <Skeleton className="h-16 w-full mb-3" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const total = water?.totalMl ?? 0;
  const goal = water?.goalMl ?? 3000;
  const pct = Math.min(total / goal, 1);
  const remaining = Math.max(0, goal - total);
  
  return (
    <Card className="bg-card border-card-border overflow-hidden relative shadow-md h-full flex flex-col">
      <div className="absolute inset-0 bg-blue-500/5 z-0" />
      <CardHeader className="relative z-10 pb-1 pt-4 px-4">
        <CardTitle className="text-base flex items-center gap-1.5">
          <Droplet className="w-4 h-4 text-blue-500 fill-blue-500" />
          Water Intake
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 space-y-4 pt-1 px-4 pb-4 flex-1 flex flex-col">
        <div className="flex items-center gap-4">
          {/* Compact Progress Indicator */}
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(220 10% 10%)" strokeWidth="10" />
              <circle 
                cx="40" cy="40" r="32" fill="none" stroke="hsl(210 100% 50%)" 
                strokeWidth="10" strokeDasharray={`${pct * 201} 201`} 
                strokeLinecap="round" className="transition-all duration-700" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-black text-blue-500">{total}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground">Remaining</p>
              <p className="text-lg font-black tracking-tight">{remaining} <span className="text-xs font-normal text-muted-foreground">mL</span></p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[250, 500, 750, 1000].map(amt => (
            <Button 
              key={amt} 
              variant="outline" 
              size="sm" 
              onClick={() => handleAdd(amt)}
              disabled={addEntry.isPending}
              className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-400 h-7 text-xs px-2 flex-1 min-w-[3.5rem]"
            >
              +{amt}
            </Button>
          ))}
        </div>

        <form onSubmit={handleCustomAdd} className="flex gap-1.5 mt-auto pt-2 border-t border-border/50">
          <Input 
            type="number" 
            placeholder="Custom (mL)" 
            value={customAmount} 
            onChange={(e) => setCustomAmount(e.target.value)}
            className="flex-1 h-8 text-xs"
          />
          <Button type="submit" disabled={!customAmount || addEntry.isPending} variant="secondary" className="h-8 text-xs px-3">
            Add
          </Button>
        </form>

        {water?.entries && water.entries.length > 0 && (
          <div className="space-y-1 mt-3">
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {water.entries.map((entry) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  key={entry.id} 
                  className="flex items-center justify-between p-1.5 rounded bg-secondary/50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[10px] w-12">
                      {format(new Date(entry.loggedAt), "h:mm a")}
                    </span>
                    {editingId === entry.id ? (
                      <Input 
                        type="number" 
                        value={editAmount} 
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-14 h-5 text-[10px] px-1"
                        autoFocus
                      />
                    ) : (
                      <span className="font-bold">{entry.amountMl} mL</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {editingId === entry.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-green-500" onClick={() => saveEdit(entry.id)}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={() => setEditingId(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={() => startEdit(entry.id, entry.amountMl)}>
                          <Pencil className="w-2.5 h-2.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive/80 hover:bg-destructive/10" onClick={() => handleDelete(entry.id)}>
                          <Trash2 className="w-2.5 h-2.5" />
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
