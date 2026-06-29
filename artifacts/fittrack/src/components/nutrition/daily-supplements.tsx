import { useState } from "react";
import { 
  useGetSupplements,
  useAddSupplement,
  useUpdateSupplement,
  useDeleteSupplement,
  useLogSupplement,
  useUnlogSupplement,
  getGetSupplementsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Pill, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function DailySupplements({ date }: { date: string }) {
  const qc = useQueryClient();
  const { data: supplements, isLoading } = useGetSupplements({ date });
  const addSupp = useAddSupplement();
  const updateSupp = useUpdateSupplement();
  const deleteSupp = useDeleteSupplement();
  const logSupp = useLogSupplement();
  const unlogSupp = useUnlogSupplement();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDosage, setNewDosage] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDosage, setEditDosage] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: getGetSupplementsQueryKey({ date }) });

  const handleToggle = (id: number, isTaken: boolean) => {
    if (isTaken) {
      unlogSupp.mutate({ data: { supplementId: id, date } }, { onSuccess: refresh });
    } else {
      logSupp.mutate({ data: { supplementId: id, date } }, { onSuccess: refresh });
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addSupp.mutate({ data: { name: newName.trim(), dosage: newDosage.trim() || undefined } }, {
      onSuccess: () => {
        setIsAdding(false);
        setNewName("");
        setNewDosage("");
        refresh();
      }
    });
  };

  const startEdit = (id: number, name: string, dosage?: string) => {
    setEditingId(id);
    setEditName(name);
    setEditDosage(dosage || "");
  };

  const saveEdit = (id: number) => {
    if (!editName.trim()) return;
    updateSupp.mutate({ id, data: { name: editName.trim(), dosage: editDosage.trim() || undefined } }, {
      onSuccess: () => {
        setEditingId(null);
        refresh();
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteSupp.mutate({ id }, { onSuccess: refresh });
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-card-border overflow-hidden shadow-md h-full">
        <CardContent className="pt-4">
          <Skeleton className="h-6 w-1/2 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const takenCount = supplements?.filter(s => s.isTaken).length ?? 0;
  const totalCount = supplements?.length ?? 0;

  return (
    <Card className="bg-card border-card-border overflow-hidden relative shadow-md h-full flex flex-col">
      <div className="absolute inset-0 bg-emerald-500/5 z-0" />
      <CardHeader className="relative z-10 pb-1 pt-4 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-1.5">
          <Pill className="w-4 h-4 text-emerald-500" />
          Supplements
        </CardTitle>
        <div className="text-xs font-bold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
          {takenCount} / {totalCount}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 flex-1 flex flex-col px-4 pb-4 pt-2 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 -mr-1">
          {supplements?.length === 0 && !isAdding ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-60 py-4">
              <Pill className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">No supplements yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {supplements?.map((supp) => (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={supp.id} 
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${supp.isTaken ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-secondary/30 border-border/50'}`}
                >
                  {editingId === supp.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-xs px-2 flex-1" placeholder="Name" autoFocus />
                      <Input value={editDosage} onChange={e => setEditDosage(e.target.value)} className="h-7 text-xs px-2 w-16" placeholder="Dosage" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox 
                        checked={supp.isTaken} 
                        onCheckedChange={() => handleToggle(supp.id, supp.isTaken ?? false)} 
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-muted-foreground/40"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate transition-all ${supp.isTaken ? 'text-emerald-600 line-through opacity-70' : ''}`}>{supp.name}</p>
                        {supp.dosage && <p className="text-[10px] text-muted-foreground">{supp.dosage}</p>}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-0.5 shrink-0">
                    {editingId === supp.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500" onClick={() => saveEdit(supp.id)}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground opacity-50 hover:opacity-100" onClick={() => startEdit(supp.id, supp.name, supp.dosage)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-50 hover:opacity-100 hover:bg-destructive/10" onClick={() => handleDelete(supp.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isAdding && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }} 
              onSubmit={handleAdd} 
              className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border/50"
            >
              <div className="flex-1 flex gap-1">
                <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-7 text-xs px-2 flex-1" placeholder="Supp name" autoFocus />
                <Input value={newDosage} onChange={e => setNewDosage(e.target.value)} className="h-7 text-xs px-2 w-14" placeholder="Qty" />
              </div>
              <div className="flex gap-0.5">
                <Button type="submit" variant="ghost" size="icon" className="h-6 w-6 text-emerald-500" disabled={!newName.trim() || addSupp.isPending}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setIsAdding(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.form>
          )}
        </div>

        {!isAdding && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3 h-8 text-xs border-dashed text-muted-foreground hover:text-foreground shrink-0" 
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Supplement
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
