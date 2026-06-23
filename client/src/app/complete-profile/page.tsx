"use client";

import { ArrowRight,Heart, Mail, Phone, ShieldCheck, Sparkles, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetMeQuery } from "@/features/auth/authApi";
import { login } from "@/features/auth/authSlice";
import {
  useCreateGuardianProfileMutation,
  useSelfLinkGuardianMutation,
} from "@/features/dashboard/dashboardApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [relationshipType, setRelationshipType] = useState("GUARDIAN");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Pre-fill full name if available from Google login
  useEffect(() => {
    if (user && !fullName) {
      setFullName(`${user.firstName || ""} ${user.lastName || ""}`.trim());
    }
  }, [user, fullName]);

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
      router.push("/learn"); // redirect students to learn space
    }
  }, [isAuthenticated, user, router]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;
    setError("");

    try {
      await createGuardianProfile({
        fullName,
        phone: phone || undefined,
        email: user?.email,
      }).unwrap();
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err?.data?.message || "Failed to save profile details. Please try again.");
    }
  };

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail) return;
    setError("");

    try {
      await selfLinkGuardian({
        studentEmail,
        relationshipType,
      }).unwrap();

      setSuccess(true);

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
      setError(err?.data?.message || "Failed to link student. Verify the email and try again.");
    }
  };

  return (
    <div className="dot-grid relative flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12 font-sans text-neutral-900 select-none">
      {/* Centered wizard container */}
      <div className="animate-fade-in-up w-full max-w-[480px] space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-xl bg-neutral-900 p-2.5 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-neutral-900">
            Eudora
          </span>
        </div>

        {/* Wizard Card */}
        <div className="rounded-[28px] border border-neutral-200/80 bg-white p-8 shadow-[0_24px_60px_rgba(0,0,0,0.035),0_4px_12px_rgba(0,0,0,0.015)] md:p-10">
          {/* Progress Indicators */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === 1 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                }`}
              >
                1
              </span>
              <span className="text-xs font-semibold text-neutral-500">Profile Details</span>
            </div>
            <div className="w-8 border-t border-neutral-200"></div>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === 2 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                }`}
              >
                2
              </span>
              <span className="text-xs font-semibold text-neutral-500">Link Child</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-500">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 flex animate-pulse items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold text-emerald-600">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Profile completed successfully! Redirecting...
            </div>
          )}

          {/* STEP 1: Profile Details */}
          {step === 1 && !success && (
            <form onSubmit={handleCreateProfile} className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-display text-xl font-bold tracking-tight">
                  Set Up Your Profile
                </h2>
                <p className="text-xs leading-normal text-neutral-400">
                  Please confirm your profile information. This will help teachers and staff
                  identify you.
                </p>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Full Name
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                      <User className="h-4 w-4" />
                    </span>
                    <Input
                      type="text"
                      placeholder="Jane Doe"
                      className="cupertino-input h-11 rounded-xl border-neutral-200 bg-neutral-50/50 pl-10 text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Phone number */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                      <Phone className="h-4 w-4" />
                    </span>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="cupertino-input h-11 rounded-xl border-neutral-200 bg-neutral-50/50 pl-10 text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isCreatingProfile || !fullName}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-900 font-semibold text-white transition-all hover:bg-neutral-800 active:scale-98"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          {/* STEP 2: Link Student */}
          {step === 2 && !success && (
            <form onSubmit={handleLinkStudent} className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-display text-xl font-bold tracking-tight">
                  Link to Your Child
                </h2>
                <p className="text-xs leading-normal text-neutral-400">
                  Enter your child's school email address to associate their student profile with
                  your account.
                </p>
              </div>

              <div className="space-y-4">
                {/* Relationship Type */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Relationship
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                      <Heart className="h-4 w-4" />
                    </span>
                    <select
                      value={relationshipType}
                      onChange={(e) => setRelationshipType(e.target.value)}
                      className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-neutral-50/50 pl-10 text-xs font-semibold text-neutral-900 focus:border-neutral-900 focus:outline-none"
                    >
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                      <option value="GUARDIAN">Guardian</option>
                      <option value="SPONSOR">Sponsor</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                {/* Student Email */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Child's School Email
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input
                      type="email"
                      placeholder="child@student.eudora.app"
                      className="cupertino-input h-11 rounded-xl border-neutral-200 bg-neutral-50/50 pl-10 text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="h-11 flex-1 rounded-xl text-xs font-semibold hover:bg-neutral-50 active:scale-98"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLinking || !studentEmail}
                  className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-900 font-semibold text-white transition-all hover:bg-neutral-800 active:scale-98"
                >
                  Complete Setup
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
