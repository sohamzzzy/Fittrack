import { useSearch } from "wouter";
import WorkoutStart from "@/pages/workout-start";
import ActiveWorkout from "@/pages/workout-active";

export default function WorkoutHub() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const hasSession =
    params.has("id") || params.get("new") === "1" || params.has("routineId");

  if (!hasSession) {
    return <WorkoutStart />;
  }

  return <ActiveWorkout />;
}
