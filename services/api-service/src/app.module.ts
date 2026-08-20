import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { InstitutionModule } from './institution/institution.module';
import { AcademicModule } from './academic/academic.module';
import { StudentModule } from './student/student.module';
import { FamilyModule } from './family/family.module';
import { AttendanceModule } from './attendance/attendance.module';
import { HomeworkModule } from './homework/homework.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { DiagnosticsModule } from './diagnostics/diagnostics.module';
import { LiveClassesModule } from './live-classes/live-classes.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { LessonsModule } from './lessons/lessons.module';
import { CatalogModule } from './catalog/catalog.module';
import { ClassesModule } from './classes/classes.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { BillingModule } from './billing/billing.module';
import { LeadsModule } from './leads/leads.module';
import { CommunicationModule } from './communication/communication.module';
import { MakeupModule } from './makeup/makeup.module';
import { TeacherModule } from './teacher/teacher.module';
import { TeacherApplicationsModule } from './teacher-applications/teacher-applications.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DeviceTokensModule } from './device-tokens/device-tokens.module';
import { DevicePairingModule } from './auth/device-pairing/device-pairing.module';
import { UploadsModule } from './uploads/uploads.module';
import { TimetableModule } from './timetable/timetable.module';
import { GradebookModule } from './gradebook/gradebook.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GamificationModule } from './gamification/gamification.module';
import { ParentModule } from './parent/parent.module';
import { ApiEnvelopeInterceptor } from './common/http/api-envelope.interceptor';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { AuditModule } from './common/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    /**
     * A generous default ceiling — it is not meant to shape normal use, only to
     * stop one IP from hammering the API. The endpoints that actually cost
     * something when abused (signup, login, file upload) narrow it further with
     * their own @Throttle decorators.
     *
     * Until this existed the public, unauthenticated /auth/register accepted
     * unlimited requests, which is free account creation — and, once teacher
     * applications began accepting PDFs, free object storage on our bill.
     */
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    InstitutionModule,
    AcademicModule,
    StudentModule,
    FamilyModule,
    AttendanceModule,
    HomeworkModule,
    EvaluationModule,
    DiagnosticsModule,
    LiveClassesModule,
    AssessmentsModule,
    LessonsModule,
    CatalogModule,
    ClassesModule,
    EntitlementsModule,
    BillingModule,
    LeadsModule,
    CommunicationModule,
    MakeupModule,
    TeacherModule,
    TeacherApplicationsModule,
    NotificationsModule,
    DeviceTokensModule,
    DevicePairingModule,
    UploadsModule,
    TimetableModule,
    GradebookModule,
    DashboardModule,
    GamificationModule,
    ParentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      // First in the chain deliberately: rejecting a flood should not cost a
      // JWT verification or a database round trip per request.
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiEnvelopeInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule {}
