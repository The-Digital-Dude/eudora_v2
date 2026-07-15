"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Heart, Mail, Phone, ShieldCheck, Sparkles, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

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
import { useGetMeQuery } from "@/features/auth/authApi";
import { login } from "@/features/auth/authSlice";
import {
  useCreateGuardianProfileMutation,
  useSelfLinkGuardianMutation,
} from "@/features/dashboard/dashboardApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const step1Schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional().or(z.literal("")),
});

const step2Schema = z.object({
  studentEmail: z
    .string()
    .min(1, "Child's email address is required")
    .email("Please enter a valid email address"),
  relationshipType: z.enum(["FATHER", "MOTHER", "GUARDIAN", "SPONSOR", "OTHER"]),
});

type Step1FormValues = z.infer<typeof step1Schema>;
type Step2FormValues = z.infer<typeof step2Schema>;

export default function CompleteProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Auth selectors
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;
  const isAuthenticated = auth.isAuthenticated;

  // Mutation Hooks
  const [createGuardianProfile, { isLoading: isCreatingProfile }] =
    useCreateGuardianProfileMutation();
  const [selfLinkGuardian, { isLoading: isLinking }] = useSelfLinkGuardianMutation();

  // Lazy trigger query to refresh local session
  const { refetch: refetchMe } = useGetMeQuery();

  // Onboarding wizard states
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);

  const step1Form = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema as any),
    defaultValues: {
      fullName: "",
      phone: "",
    },
  });

  const step2Form = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema as any),
    defaultValues: {
      studentEmail: "",
      relationshipType: "GUARDIAN",
    },
  });

  // Pre-fill full name if available from Google login
  useEffect(() => {
    if (user) {
      const defaultName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      if (defaultName) {
        step1Form.setValue("fullName", defaultName);
      }
    }
  }, [user, step1Form]);

  // Protect route - ensure user is authenticated as a Guardian
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    const isGuardian =
      user.role === "GUARDIAN" ||
      (Array.isArray(user.roles) &&
        user.roles.some(
          (r: any) => r === "GUARDIAN" || r.name === "GUARDIAN" || r.role?.name === "GUARDIAN",
        ));

    if (!isGuardian) {
      router.push("/student"); // students land on their momentum dashboard
    }
  }, [isAuthenticated, user, router]);

  const handleCreateProfile = async (values: Step1FormValues) => {
    try {
      await createGuardianProfile({
        fullName: values.fullName,
        phone: values.phone || undefined,
        email: user?.email,
      }).unwrap();
      toast.success("Profile details saved!");
      setStep(2);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.data?.message || "Failed to save profile details. Please try again.";
      toast.error(errMsg);
    }
  };

  const handleLinkStudent = async (values: Step2FormValues) => {
    try {
      await selfLinkGuardian({
        studentEmail: values.studentEmail,
        relationshipType: values.relationshipType,
      }).unwrap();

      setSuccess(true);
      toast.success("Child profile linked successfully!");

      // Refresh auth state in redux
      const { data: updatedUser } = await refetchMe();
      if (updatedUser) {
        dispatch(login({ user: updatedUser, token: null }));
      }

      // Navigate to dashboard after short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      console.error(err);
      const errMsg =
        err?.data?.message || "Failed to link student. Verify the email and try again.";
      toast.error(errMsg);
    }
  };

  return (
    <div className="dot-grid bg-muted/50 text-foreground relative flex min-h-screen flex-col items-center justify-center px-4 py-12 font-sans select-none">
      {/* Centered wizard container */}
      <div className="animate-fade-in-up w-full max-w-[480px] space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-foreground rounded-xl p-2.5 text-background shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-foreground text-xl font-bold tracking-tight">
            Eudora
          </span>
        </div>

        {/* Wizard Card */}
        <div className="border-border/80 bg-card rounded-3xl border p-8 shadow-[0_24px_60px_rgba(0,0,0,0.035),0_4px_12px_rgba(0,0,0,0.015)] md:p-10">
          {/* Progress Indicators */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === 1 ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </span>
              <span className="text-muted-foreground text-xs font-semibold">Profile Details</span>
            </div>
            <div className="border-border w-8 border-t"></div>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === 2 ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </span>
              <span className="text-muted-foreground text-xs font-semibold">Link Child</span>
            </div>
          </div>

          {success && (
            <div className="border-success/20 bg-success/10 text-success mb-6 flex animate-pulse items-center gap-2 rounded-xl border p-3 text-xs font-semibold">
              <ShieldCheck className="text-success h-4 w-4" />
              Profile completed successfully! Redirecting...
            </div>
          )}

          {/* STEP 1: Profile Details */}
          {step === 1 && !success && (
            <Form {...step1Form}>
              <form onSubmit={step1Form.handleSubmit(handleCreateProfile)} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-xl font-bold tracking-tight">
                    Set Up Your Profile
                  </h2>
                  <p className="text-muted-foreground text-xs leading-normal">
                    Please confirm your profile information. This will help teachers and staff
                    identify you.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Full Name */}
                  <FormField
                    control={step1Form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                          Full Name
                        </FormLabel>
                        <div className="relative">
                          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                            <User className="h-4 w-4" />
                          </span>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder="Jane Doe"
                              className="cupertino-input border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:border-ring h-11 rounded-xl pl-10"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone number */}
                  <FormField
                    control={step1Form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                          Phone Number
                        </FormLabel>
                        <div className="relative">
                          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                            <Phone className="h-4 w-4" />
                          </span>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              className="cupertino-input border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:border-ring h-11 rounded-xl pl-10"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isCreatingProfile}
                  className="bg-foreground hover:bg-foreground/90 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold text-background transition-all active:scale-98"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </Form>
          )}

          {/* STEP 2: Link Child */}
          {step === 2 && !success && (
            <Form {...step2Form}>
              <form onSubmit={step2Form.handleSubmit(handleLinkStudent)} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-xl font-bold tracking-tight">
                    Link to Your Child
                  </h2>
                  <p className="text-muted-foreground text-xs leading-normal">
                    Enter your child&apos;s school email address to associate their student profile
                    with your account.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Relationship Type */}
                  <FormField
                    control={step2Form.control}
                    name="relationshipType"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                          Relationship
                        </FormLabel>
                        <div className="relative">
                          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                            <Heart className="h-4 w-4" />
                          </span>
                          <FormControl>
                            <select
                              {...field}
                              className="border-border bg-muted/50 text-foreground focus:border-ring h-11 w-full cursor-pointer appearance-none rounded-xl border pl-10 text-xs font-semibold focus:outline-none"
                            >
                              <option value="FATHER">Father</option>
                              <option value="MOTHER">Mother</option>
                              <option value="GUARDIAN">Guardian</option>
                              <option value="SPONSOR">Sponsor</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Student Email */}
                  <FormField
                    control={step2Form.control}
                    name="studentEmail"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                          Child&apos;s School Email
                        </FormLabel>
                        <div className="relative">
                          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                            <Mail className="h-4 w-4" />
                          </span>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="child@student.eudora.app"
                              className="cupertino-input border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:border-ring h-11 rounded-xl pl-10"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="hover:bg-muted/50 h-11 flex-1 rounded-xl text-xs font-semibold active:scale-98"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLinking}
                    className="bg-foreground hover:bg-foreground/90 flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold text-background transition-all active:scale-98"
                  >
                    Complete Setup
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
