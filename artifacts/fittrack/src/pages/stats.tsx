import { useState } from "react";
import { useGetStatsOverview, useGetPersonalRecords, useGetStatsAnalytics } from "@workspace/api-client-react";
import { OverviewCards } from "@/components/stats/overview-cards";
import { PersonalRecords } from "@/components/stats/personal-records";
import { AnalyticsCharts } from "@/components/stats/analytics-charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export function StatsPage() {
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90" | "180" | "365" | "all_time">("30");

  const { data: overview, isLoading: loadingOverview } = useGetStatsOverview();
  const { data: records, isLoading: loadingRecords } = useGetPersonalRecords();
  const { data: analytics, isLoading: loadingAnalytics } = useGetStatsAnalytics({ timeRange });

  if (loadingOverview && !overview) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-500 pb-24">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="text-muted-foreground">Track your progress and celebrate your milestones.</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="records">Personal Records</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <Select value={timeRange} onValueChange={(val: any) => setTimeRange(val)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 Months</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="overview" className="mt-0">
          {overview && <OverviewCards data={overview} />}
        </TabsContent>

        <TabsContent value="records" className="mt-0">
          {loadingRecords ? (
             <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : records ? (
            <PersonalRecords records={records} />
          ) : null}
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          {loadingAnalytics ? (
             <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : analytics ? (
            <AnalyticsCharts data={analytics} />
          ) : null}
        </TabsContent>
      </Tabs>
      
    </div>
  );
}
