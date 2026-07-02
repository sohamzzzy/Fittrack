import { StatsAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, parseISO } from "date-fns";

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

export function AnalyticsCharts({ data }: { data: StatsAnalytics }) {
  
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d");
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Workout Volume Over Time</CardTitle>
          <CardDescription>Total weight lifted per day</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {data.volumeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.volumeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  labelFormatter={(label) => formatDate(label as string)}
                  formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="volume" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">No volume data for this period</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workout Frequency</CardTitle>
          <CardDescription>Number of workouts per day</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px]">
          {data.frequencyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.frequencyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  labelFormatter={(label) => formatDate(label as string)}
                  formatter={(value: number) => [`${value} workout(s)`, 'Frequency']}
                />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">No frequency data for this period</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Muscle Group Distribution</CardTitle>
          <CardDescription>Targeted muscles in this period</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px]">
          {data.muscleGroupDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.muscleGroupDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.muscleGroupDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value} exercises`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">No muscle group data for this period</div>
          )}
        </CardContent>
      </Card>
      
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Top Exercises</CardTitle>
          <CardDescription>Most frequently performed exercises</CardDescription>
        </CardHeader>
        <CardContent>
          {data.topExercises.length > 0 ? (
            <div className="space-y-4">
              {data.topExercises.map((exercise, i) => (
                <div key={i} className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mr-3">
                    {i + 1}
                  </div>
                  <div className="flex-1 font-medium">{exercise.name}</div>
                  <div className="text-muted-foreground">{exercise.count} sets/exercises</div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-muted-foreground text-center py-4">No exercises logged in this period</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
