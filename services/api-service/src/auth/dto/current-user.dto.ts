export interface Permission {
  action: string;
  subject: string;
}

/**
 * Mirrors the real `StudentProfile` Prisma model (schema.prisma) — this
 * previously declared `registrationNumber`/`academicYearId`, fields that
 * don't exist on the model at all. The `include: { studentProfile: true }`
 * call always returned the real shape at runtime; only this type was wrong.
 */
export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  birthDate: Date;
  gender: string;
  status: string;
  // Self-service profile-completion fields, added alongside PATCH
  // /student-profiles/me — nullable since existing profiles predate them.
  phone: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuardianStudentRelationship {
  id: string;
  guardianProfileId: string;
  studentProfileId: string;
  relationshipType: string;
  isPrimary: boolean;
  hasFinancialResponsibility: boolean;
  hasAcademicAccess: boolean;
  hasEmergencyContact: boolean;
}

/**
 * Mirrors the real `GuardianProfile` Prisma model — this previously declared
 * a top-level `relationshipType` (that field lives on
 * `GuardianStudentRelationship`, not here) and was missing `fullName`/
 * `email`/`phone`, which are real columns on this model.
 */
export interface GuardianProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  students?: GuardianStudentRelationship[];
}

export class CurrentUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: Permission[];
  guardianProfile: GuardianProfile | null;
  studentProfile: StudentProfile | null;
  csrfToken: string;
}
