import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { PersonalRecord } from "@workspace/api-client-react";
import { format, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function PersonalRecords({ records }: { records: PersonalRecord[] }) {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground min-h-[200px]">
          <Trophy className="h-12 w-12 mb-4 opacity-20" />
          <p>No personal records found.</p>
          <p className="text-sm">Log some weighted exercises to see your PBs!</p>
        </CardContent>
      </Card>
    );
  }

  const today = new Date();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {records.map(record => {
        const isRecent = differenceInDays(today, new Date(record.dateAchieved)) <= 7;
        
        return (
          <Card key={record.exerciseId} className="relative overflow-hidden group">
            {isRecent && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 border-yellow-500/50">
                  New!
                </Badge>
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium truncate pr-12">{record.exerciseName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-bold">{record.maxWeight}</div>
                <div className="text-sm text-muted-foreground mb-1">kg</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex justify-between">
                <span>{record.maxReps} reps</span>
                <span>{format(new Date(record.dateAchieved), "MMM d, yyyy")}</span>
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
