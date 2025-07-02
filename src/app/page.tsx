import { School } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JoinClassroomForm } from "@/components/join-classroom-form";

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-2 mb-8 text-center">
        <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
          <School className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-foreground">
          Classroom Maestro
        </h1>
        <p className="max-w-md text-muted-foreground">
          Enter your nickname to join the interactive session. Need a name? Let
          our AI generate one for you!
        </p>
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Join the Classroom</CardTitle>
          <CardDescription>
            Enter a nickname below or generate one to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinClassroomForm />
        </CardContent>
      </Card>
    </main>
  );
}
