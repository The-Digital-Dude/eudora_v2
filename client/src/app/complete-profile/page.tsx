"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Phone, Mail, User, ShieldCheck, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login } from "@/features/auth/authSlice";
import { useGetMeQuery } from "@/features/auth/authApi";
import { useCreateGuardianProfileMutation, useSelfLinkGuardianMutation } from "@/features/dashboard/dashboardApi";

export default function CompleteProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Auth selectors
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;
  const isAuthenticated = auth.isAuthenticated;

  // Mutation Hooks
  const [createGuardianProfile, { isLoading: isCreatingProfile }] = useCreateGuardianProfileMutation();
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

    const isGuardian = user.role === "GUARDIAN" ||
      (Array.isArray(user.roles) && user.roles.some((r: any) =>
        r === "GUARDIAN" || r.name === "GUARDIAN" || r.role?.name === "GUARDIAN"
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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 dot-grid relative select-none font-sans bg-neutral-50 text-neutral-900">
      
      {/* Centered wizard container */}
      <div className="w-full max-w-[480px] space-y-8 animate-fade-in-up">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900 font-display">
            Eudora
          </span>
        </div>

        {/* Wizard Card */}
        <div className="bg-white border border-neutral-200/80 rounded-[28px] p-8 md:p-10 shadow-[0_24px_60px_rgba(0,0,0,0.035),0_4px_12px_rgba(0,0,0,0.015)]">
          
          {/* Progress Indicators */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 1 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
              }`}>
                1
              </span>
              <span className="text-xs font-semibold text-neutral-500">Profile Details</span>
            </div>
            <div className="w-8 border-t border-neutral-200"></div>
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
              }`}>
                2
              </span>
              <span className="text-xs font-semibold text-neutral-500">Link Child</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2 animate-pulse">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Profile completed successfully! Redirecting...
            </div>
          )}

          {/* STEP 1: Profile Details */}
          {step === 1 && !success && (
            <form onSubmit={handleCreateProfile} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight font-display">
                  Set Up Your Profile
                </h2>
                <p className="text-xs text-neutral-400 leading-normal">
                  Please confirm your profile information. This will help teachers and staff identify you.
                </p>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Full Name
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                      <User className="w-4 h-4" />
                    </span>
                    <Input
                      type="text"
                      placeholder="Jane Doe"
                      className="pl-10 h-11 border-neutral-200 bg-neutral-50/50 text-neutral-900 rounded-xl focus:border-neutral-900 placeholder:text-neutral-300 cupertino-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Phone number */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="pl-10 h-11 border-neutral-200 bg-neutral-50/50 text-neutral-900 rounded-xl focus:border-neutral-900 placeholder:text-neutral-300 cupertino-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isCreatingProfile || !fullName}
                className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* STEP 2: Link Student */}
          {step === 2 && !success && (
            <form onSubmit={handleLinkStudent} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight font-display">
                  Link to Your Child
                </h2>
                <p className="text-xs text-neutral-400 leading-normal">
                  Enter your child's school email address to associate their student profile with your account.
                </p>
              </div>

              <div className="space-y-4">
                {/* Relationship Type */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Relationship
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                      <Heart className="w-4 h-4" />
                    </span>
                    <select
                      value={relationshipType}
                      onChange={(e) => setRelationshipType(e.target.value)}
                      className="w-full pl-10 h-11 border border-neutral-200 bg-neutral-50/50 text-neutral-900 rounded-xl focus:outline-none focus:border-neutral-900 cursor-pointer text-xs font-semibold appearance-none"
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
                  <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Child's School Email
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <Input
                      type="email"
                      placeholder="child@student.eudora.app"
                      className="pl-10 h-11 border-neutral-200 bg-neutral-50/50 text-neutral-900 rounded-xl focus:border-neutral-900 placeholder:text-neutral-300 cupertino-input"
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
                  className="flex-1 h-11 rounded-xl text-xs font-semibold hover:bg-neutral-50 active:scale-98"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLinking || !studentEmail}
                  className="flex-1 h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
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
