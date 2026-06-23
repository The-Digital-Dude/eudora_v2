import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { GuardianAccessService } from '../../family/guardian-access.service';

@Injectable()
export class GuardianScopeGuard implements CanActivate {
  constructor(private readonly guardianAccessService: GuardianAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user, params, query, body } = request;

    if (!user) {
      return false;
    }

    // Bypass check for SUPER_ADMIN or ADMIN
    if (user.roles?.includes('SUPER_ADMIN') || user.roles?.includes('ADMIN')) {
      return true;
    }

    // Resolve studentProfileId from params, query, or body
    const studentProfileId =
      params.studentProfileId ||
      query.studentProfileId ||
      body.studentProfileId;

    if (!studentProfileId) {
      throw new ForbiddenException(
        'studentProfileId is required to access this resource.',
      );
    }

    // Validate the link
    await this.guardianAccessService.assertCanAccessStudent(
      user.id,
      studentProfileId,
    );

    return true;
  }
}
