
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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
import { useI18n } from "@/lib/i18n/provider";
import { Skeleton } from "./ui/skeleton";

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
  const { t } = useI18n();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
        title: t('teacherLoginForm.toast_success_title'),
        description: t('teacherLoginForm.toast_success_description'),
      });
      router.push("/teacher");
    } else {
      toast({
        variant: "destructive",
        title: t('teacherLoginForm.toast_error_title'),
        description: t('teacherLoginForm.toast_error_description'),
      });
    }
  }

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="roomCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('teacherLoginForm.room_code_label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('teacherLoginForm.room_code_placeholder')} {...field} />
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
              <FormLabel>{t('teacherLoginForm.password_label')}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t('teacherLoginForm.password_placeholder')} {...field} />
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
          {t('teacherLoginForm.signin_button')}
        </Button>
      </form>
    </Form>
  );
}
