"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Sparkles } from "lucide-react";

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
import { generateNicknameAction } from "@/app/actions";

const formSchema = z.object({
  nickname: z
    .string()
    .min(2, {
      message: "Nickname must be at least 2 characters.",
    })
    .max(50, {
      message: "Nickname must not be longer than 50 characters.",
    }),
});

export function JoinClassroomForm() {
  const [isGenerating, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nickname: "",
    },
  });

  async function handleGenerateNickname() {
    startTransition(async () => {
      const seed = Math.random().toString(36).substring(2, 15);
      const result = await generateNicknameAction({ seed });
      if (result.nickname) {
        form.setValue("nickname", result.nickname, { shouldValidate: true });
        form.clearErrors("nickname");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    });
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Here you would typically handle joining the classroom,
    // e.g., using WebSockets or Firestore.
    console.log("Joining with nickname:", values.nickname);
    toast({
      title: "Welcome!",
      description: `You have joined the classroom as ${values.nickname}.`,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Choose your Nickname</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="e.g. Cosmic-Explorer 🚀" {...field} />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  className="border-accent text-accent-foreground hover:bg-accent/90 bg-accent"
                  size="icon"
                  onClick={handleGenerateNickname}
                  disabled={isGenerating}
                  aria-label="Generate nickname"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={isGenerating || !form.formState.isValid}
        >
          Join Classroom
        </Button>
      </form>
    </Form>
  );
}
