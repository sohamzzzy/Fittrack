import React from "react";
import {
  Switch,
  Route,
  Router as WouterRouter,
  useLocation,
  Redirect,
} from "wouter";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useAuth,
} from "@clerk/react";

import { publishableKeyFromHost } from "@clerk/react/internal";

import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { ApiAuthSetup } from "@/components/api-auth-setup";

import Dashboard from "@/pages/dashboard";
import ActiveWorkout from "@/pages/workout-active";
import Workouts from "@/pages/workouts";
import WorkoutDetail from "@/pages/workout-detail";
import Routines from "@/pages/routines";
import Exercises from "@/pages/exercises";
import ExerciseDetail from "@/pages/exercise-detail";
import Nutrition from "@/pages/nutrition";
import NutritionLog from "@/pages/nutrition-log";
import NutritionGoals from "@/pages/nutrition-goals";
import Feed from "@/pages/feed";
import Profile from "@/pages/profile";
import UserProfile from "@/pages/user-profile";
import Search from "@/pages/search";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-primary font-black text-2xl animate-pulse">
        FITTRACK
      </div>
    </div>
  );
}

function HomeRedirect() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>

      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function AppShell() {
  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />

        <Route path="/workout" component={ActiveWorkout} />

        <Route path="/workouts" component={Workouts} />
        <Route path="/workouts/:id" component={WorkoutDetail} />

        <Route path="/routines" component={Routines} />

        <Route path="/exercises" component={Exercises} />
        <Route path="/exercises/:id" component={ExerciseDetail} />

        <Route path="/nutrition" component={Nutrition} />
        <Route path="/nutrition/log" component={NutritionLog} />
        <Route path="/nutrition/goals" component={NutritionGoals} />

        <Route path="/feed" component={Feed} />

        <Route path="/profile" component={Profile} />
        <Route path="/profile/:id" component={UserProfile} />

        <Route path="/search" component={Search} />

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function ProtectedShell() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Show when="signed-in">
        <AppShell />
      </Show>

      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={
        clerkPubKey ??
        import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
      }
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) =>
        setLocation(stripBase(to), { replace: true })
      }
      appearance={{
        variables: {
          colorPrimary: "hsl(15 100% 55%)",
          colorBackground: "hsl(220, 10%, 6%)",
          colorNeutral: "hsl(220, 10%, 16%)",
          colorInputForeground: "hsl(220, 10%, 98%)",
          colorInput: "hsl(220, 10%, 16%)",
          colorForeground: "hsl(220, 10%, 98%)",
          colorMutedForeground: "hsl(220, 10%, 60%)",
          fontFamily: "Geist, Inter, sans-serif",
        },

        elements: {
          rootBox: "w-full flex justify-center",

          cardBox:
            "rounded-2xl w-[440px] max-w-full overflow-hidden",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ApiAuthSetup>
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />

            <Route
              path="/sign-in/*?"
              component={SignInPage}
            />

            <Route
              path="/sign-up/*?"
              component={SignUpPage}
            />

            <Route
              path="*"
              component={ProtectedShell}
            />
          </Switch>

          <Toaster />
        </TooltipProvider>
        </ApiAuthSetup>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;