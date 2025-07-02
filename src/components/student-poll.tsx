"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PollData } from "./create-poll-form";
import { useToast } from "@/hooks/use-toast";

const voteFormSchema = z.object({
  option: z.string({
    required_error: "You need to select an option.",
  }),
});

interface StudentPollProps {
  poll: PollData;
  onVoteSubmit: (data: z.infer<typeof voteFormSchema>) => void;
}

export function StudentPoll({ poll, onVoteSubmit }: StudentPollProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof voteFormSchema>>({
    resolver: zodResolver(voteFormSchema),
  });

  function onSubmit(data: z.infer<typeof voteFormSchema>) {
    onVoteSubmit(data);
    toast({
      title: "Vote Submitted!",
      description: "Thank you for participating in the poll.",
    });
  }

  return (
    <Card className="w-full max-w-2xl animate-in fade-in shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">{poll.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="option"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Choose your answer:</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      {poll.options.map((option, index) => (
                        <FormItem
                          key={index}
                          className="flex items-center space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50"
                        >
                          <FormControl>
                            <RadioGroupItem value={option.value} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {option.value}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" />
              Submit Vote
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
