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
import { InstitutionModule } from './institution/institution.module';
import { AcademicModule } from './academic/academic.module';
import { StudentModule } from './student/student.module';
import { FamilyModule } from './family/family.module';
import { BillingModule } from './billing/billing.module';
import { AttendanceModule } from './attendance/attendance.module';
import { HomeworkModule } from './homework/homework.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { LeadsModule } from './leads/leads.module';
import { CommunicationModule } from './communication/communication.module';
import { MakeupModule } from './makeup/makeup.module';
import { ApiEnvelopeInterceptor } from './common/http/api-envelope.interceptor';
import { ApiExceptionFilter } from './common/http/api-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
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
    AssessmentsModule,
    LeadsModule,
    CommunicationModule,
    MakeupModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
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
