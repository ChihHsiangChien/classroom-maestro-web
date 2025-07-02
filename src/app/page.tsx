import { Crown, School, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TeacherLoginForm } from "@/components/teacher-login-form";

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
          The interactive classroom for modern learning. Join as a student or
          sign in as a teacher.
        </p>
      </div>
      <Tabs defaultValue="student" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="student">
            <User className="mr-2 h-4 w-4" />
            Student
          </TabsTrigger>
          <TabsTrigger value="teacher">
            <Crown className="mr-2 h-4 w-4" />
            Teacher
          </TabsTrigger>
        </TabsList>
        <TabsContent value="student">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Join the Classroom</CardTitle>
              <CardDescription>
                Please use the unique URL provided by your teacher to join the
                classroom.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground p-4 bg-muted/50 rounded-md">
                Ask your teacher for the link!
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="teacher">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Teacher Sign In</CardTitle>
              <CardDescription>
                Access your dashboard to manage the classroom.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeacherLoginForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
