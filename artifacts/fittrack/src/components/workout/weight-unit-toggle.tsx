import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function WeightUnitToggle() {
  const { data: me } = useGetMe();
  const updateMe = useUpdateMe();
  const qc = useQueryClient();
  const { toast } = useToast();

  const isLbs = me?.weightUnit === "lbs";
  const label = isLbs ? "LBS" : "KG";

  const toggleUnit = () => {
    if (!me) return;
    const newUnit = isLbs ? "kg" : "lbs";
    
    // Optimistic update
    qc.setQueryData(getGetMeQueryKey(), (old: any) => old ? { ...old, weightUnit: newUnit } : old);

    updateMe.mutate(
      { data: { weightUnit: newUnit } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: `Weight unit set to ${newUnit.toUpperCase()}` });
        },
        onError: () => {
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ variant: "destructive", title: "Failed to update weight unit" });
        },
      }
    );
  };

  if (!me) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-3 text-xs font-bold"
      onClick={toggleUnit}
      disabled={updateMe.isPending}
      data-testid="button-weight-unit-toggle"
    >
      <Scale className="w-3.5 h-3.5 mr-1.5" />
      {label}
    </Button>
  );
}
