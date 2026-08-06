import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthTokenController } from './auth-token.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleOAuthProvider } from './oauth/providers/google.provider';
import { AppleOAuthProvider } from './oauth/providers/apple.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { getJwtSecret } from './utils/jwt-config';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecret(configService),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') ||
            '1d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController, AuthTokenController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleOAuthProvider,
    AppleOAuthProvider,
  ],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
