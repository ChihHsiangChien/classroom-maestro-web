"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  roomCode: z
    .string()
    .min(4, { message: "Classroom code must be at least 4 characters." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

// Hardcoded credentials for demonstration purposes
const DEMO_ROOM_CODE = "DEMO";
const DEMO_PASSWORD = "password";

export function TeacherLoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomCode: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (
      values.roomCode === DEMO_ROOM_CODE &&
      values.password === DEMO_PASSWORD
    ) {
      toast({
        title: "Signed In!",
        description: "Redirecting to your teacher dashboard.",
      });
      router.push("/teacher");
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid classroom code or password. Please try again.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="roomCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Classroom Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g. DEMO" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={!form.formState.isValid}
        >
          Sign In
        </Button>
      </form>
    </Form>
  );
}
