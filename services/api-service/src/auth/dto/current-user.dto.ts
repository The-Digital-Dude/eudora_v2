export interface Permission {
  action: string;
  subject: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  registrationNumber: string;
  academicYearId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuardianProfile {
  id: string;
  userId: string;
  relationshipType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
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
}
