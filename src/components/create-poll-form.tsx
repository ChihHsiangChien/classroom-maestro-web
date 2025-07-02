"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { PlusCircle, XCircle, Wand2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generatePollAction } from "@/app/actions";

const pollFormSchema = z.object({
  question: z
    .string()
    .min(5, { message: "Question must be at least 5 characters." })
    .max(200, { message: "Question cannot be more than 200 characters." }),
  options: z
    .array(
      z.object({
        value: z
          .string()
          .min(1, { message: "Option cannot be empty." })
          .max(50, { message: "Option cannot be more than 50 characters." }),
      })
    )
    .min(2, { message: "Must have at least 2 options." })
    .max(5, { message: "Cannot have more than 5 options." }),
});

export type PollData = z.infer<typeof pollFormSchema>;

interface CreatePollFormProps {
  onPollCreate: (data: PollData) => void;
}

export function CreatePollForm({ onPollCreate }: CreatePollFormProps) {
  const [isGenerating, startTransition] = useTransition();
  const [topic, setTopic] = useState("");
  const { toast } = useToast();

  const form = useForm<PollData>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      question: "",
      options: [{ value: "" }, { value: "" }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "options",
  });

  async function handleGeneratePoll() {
    startTransition(async () => {
      const result = await generatePollAction({ topic });
      if (result.poll) {
        form.setValue("question", result.poll.question, {
          shouldValidate: true,
        });
        replace(result.poll.options);
        form.clearErrors();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    });
  }

  function onSubmit(data: PollData) {
    onPollCreate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="topic">Generate with AI</Label>
          <div className="flex items-center gap-2">
            <Input
              id="topic"
              placeholder="e.g. 'The Roman Empire' or 'Photosynthesis'"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleGeneratePoll}
              disabled={isGenerating || !topic}
              className="border-accent text-accent-foreground hover:bg-accent/90 bg-accent shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span className="sr-only">Generate Poll</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a topic and let AI create a poll for you.
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or create manually
            </span>
          </div>
        </div>

        <div className="space-y-8">
          <FormField
            control={form.control}
            name="question"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Poll Question</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What should we learn about next?"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormLabel>Answer Options</FormLabel>
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`options.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input placeholder={`Option ${index + 1}`} {...field} />
                      </FormControl>
                      {fields.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => remove(index)}
                        >
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            {fields.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: "" })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            )}
          </div>

          <Button type="submit" className="w-full md:w-auto">
            Start Poll
          </Button>
        </div>
      </form>
    </Form>
  );
}
