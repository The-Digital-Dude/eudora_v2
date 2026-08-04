import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { BillingModule } from './billing/billing.module';
import { AttendanceModule } from './attendance/attendance.module';
import { HomeworkModule } from './homework/homework.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { DiagnosticsModule } from './diagnostics/diagnostics.module';
import { LiveClassesModule } from './live-classes/live-classes.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { LessonsModule } from './lessons/lessons.module';
import { CatalogModule } from './catalog/catalog.module';
import { LeadsModule } from './leads/leads.module';
import { CommunicationModule } from './communication/communication.module';
import { MakeupModule } from './makeup/makeup.module';
import { TeacherModule } from './teacher/teacher.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { TimetableModule } from './timetable/timetable.module';
import { GradebookModule } from './gradebook/gradebook.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GamificationModule } from './gamification/gamification.module';
import { MessagingModule } from './messaging/messaging.module';
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
    BillingModule,
    AttendanceModule,
    HomeworkModule,
    EvaluationModule,
    DiagnosticsModule,
    LiveClassesModule,
    AssessmentsModule,
    LessonsModule,
    CatalogModule,
    LeadsModule,
    CommunicationModule,
    MakeupModule,
    TeacherModule,
    NotificationsModule,
    UploadsModule,
    TimetableModule,
    GradebookModule,
    DashboardModule,
    GamificationModule,
    MessagingModule,
    ParentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
