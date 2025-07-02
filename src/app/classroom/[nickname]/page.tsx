import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";

interface ClassroomPageProps {
  params: {
    nickname: string;
  };
}

export default function ClassroomPage({ params }: ClassroomPageProps) {
  const nickname = decodeURIComponent(params.nickname);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle>Welcome to the Classroom!</CardTitle>
          <CardDescription>
            You've joined as:{" "}
            <span className="font-bold text-primary">{nickname}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            The lesson will begin shortly. Please wait for the teacher to start
            the session.
          </p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
