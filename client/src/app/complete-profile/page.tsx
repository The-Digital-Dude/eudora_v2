"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Heart, Mail, Phone, ShieldCheck, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { AddChildForm } from "@/components/add-child-form";
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
import { getRoleHome } from "@/lib/access-control";
import { readNextParam, withNext } from "@/lib/safe-next";
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
  // Step 2 shows the create-a-child form by default; this flips it to the
  // link-an-existing-account form for school-issued students.
  const [linkExisting, setLinkExisting] = useState(false);

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
      router.push(withNext("/login", readNextParam()));
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

  /**
   * Shared tail of both step-2 paths: refresh the session so the new GUARDIAN
   * role and profile are in the store, then move on. Without the refetch the
   * guardian lands on their portal still carrying the plain-USER roles they
   * registered with, and the route guard bounces them.
   */
  const finishOnboarding = async (successMessage: string) => {
    setSuccess(true);
    toast.success(successMessage);

    const { data: updatedUser } = await refetchMe();
    if (updatedUser) {
      dispatch(login({ user: updatedUser, csrfToken: updatedUser.csrfToken }));
    }

    // Send them to their own role's home, not /dashboard — that route is
    // ADMIN_ROLES-only, so a freshly-onboarded guardian landed on the
    // "Access Denied" card instead of the portal they just set up.
    //
    // Unless they arrived mid-purchase: `next` returns them to the checkout
    // they abandoned to set this up, which is the whole point of carrying it.
    const next = readNextParam();
    setTimeout(() => {
      router.push(next ?? getRoleHome(updatedUser ?? user));
    }, 1500);
  };

  const handleChildAdded = async (child: { fullName: string }) => {
    await finishOnboarding(`${child.fullName} is all set up!`);
  };

  const handleLinkStudent = async (values: Step2FormValues) => {
    try {
      await selfLinkGuardian({
        studentEmail: values.studentEmail,
        relationshipType: values.relationshipType,
      }).unwrap();

      await finishOnboarding("Child profile linked successfully!");
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
        <div className="flex flex-col items-center">
          <Image src="/landing/eudora_logo.png" alt="Eudora" width={218} height={72} className="h-11 w-auto" />
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
          {/*
            Adding a child creates one; it does not hunt for an existing
            account. This step used to ask only for the child's school email
            and call self-link, which 404s ("No student account matches…")
            whenever the child has no account — which is every direct sign-up.
            Onboarding therefore ended in an error for exactly the people it
            existed for. Linking an existing, school-issued student is still
            possible, but as the secondary path it actually is.
          */}
          {step === 2 && !success && !linkExisting && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-display text-xl font-bold tracking-tight">
                  Add your child
                </h2>
                <p className="text-muted-foreground text-xs leading-normal">
                  Who are you setting this up for? You can add more children
                  later.
                </p>
              </div>

              <AddChildForm onCreated={handleChildAdded} submitLabel="Complete setup" />

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="hover:bg-muted/50 h-10 rounded-xl px-4 text-xs font-semibold active:scale-98"
                >
                  Back
                </Button>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setLinkExisting(true)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] font-semibold hover:underline"
                  >
                    My child already has an account
                  </button>
                  {/* No step of onboarding should be a wall. The family portal
                      offers this same form, so someone who is not ready to
                      name a child can go there and come back. */}
                  <button
                    type="button"
                    onClick={() => router.push(readNextParam() ?? getRoleHome(user))}
                    className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] font-semibold hover:underline"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && !success && linkExisting && (
            <Form {...step2Form}>
              <form onSubmit={step2Form.handleSubmit(handleLinkStudent)} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-xl font-bold tracking-tight">
                    Link to Your Child
                  </h2>
                  <p className="text-muted-foreground text-xs leading-normal">
                    For a student the school has already set up. Enter the email
                    address on their existing account.
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
                    onClick={() => setLinkExisting(false)}
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
