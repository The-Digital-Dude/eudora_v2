import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequiredPermission } from '../decorators/permissions.decorator';

describe('Guards Unit Tests', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('RolesGuard', () => {
    let guard: RolesGuard;

    beforeEach(() => {
      guard = new RolesGuard(reflector);
    });

    function createMockContext(user: any, handlerRoles?: string[], classRoles?: string[]): ExecutionContext {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key, targets) => {
        if (key === 'roles') {
          if (targets[0] === 'handler') {
            return handlerRoles;
          }
          return classRoles;
        }
        return undefined;
      });

      return {
        getHandler: () => 'handler',
        getClass: () => 'class',
        switchToHttp: () => ({
          getRequest: () => ({
            user,
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('should return true if no roles are required', () => {
      const context = createMockContext({ roles: ['USER'] }, undefined);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return false if there is no user on the request', () => {
      const context = createMockContext(undefined, ['ADMIN']);
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should return true if user is SUPER_ADMIN', () => {
      const context = createMockContext({ roles: ['SUPER_ADMIN'] }, ['ADMIN']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return true if user has the required role', () => {
      const context = createMockContext({ roles: ['ADMIN'] }, ['ADMIN']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return false if user does not have the required role', () => {
      const context = createMockContext({ roles: ['USER'] }, ['ADMIN']);
      expect(guard.canActivate(context)).toBe(false);
    });
  });

  describe('PermissionsGuard', () => {
    let guard: PermissionsGuard;

    beforeEach(() => {
      guard = new PermissionsGuard(reflector);
    });

    function createMockContext(
      user: any,
      handlerPermissions?: RequiredPermission[],
      classPermissions?: RequiredPermission[],
    ): ExecutionContext {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key, targets) => {
        if (targets[0] === 'handler') {
          return handlerPermissions;
        }
        return classPermissions;
      });

      return {
        getHandler: () => 'handler',
        getClass: () => 'class',
        switchToHttp: () => ({
          getRequest: () => ({
            user,
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('should return true if no permissions are required', () => {
      const context = createMockContext({ permissions: [] }, undefined);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return false if there is no user on the request', () => {
      const context = createMockContext(undefined, [{ action: 'read', subject: 'User' }]);
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should return true if user is SUPER_ADMIN', () => {
      const context = createMockContext({ roles: ['SUPER_ADMIN'], permissions: [] }, [
        { action: 'read', subject: 'User' },
      ]);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return true if user has the required permission', () => {
      const context = createMockContext(
        { roles: ['USER'], permissions: [{ action: 'read', subject: 'User' }] },
        [{ action: 'read', subject: 'User' }],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return true if user has all of the required permissions', () => {
      const context = createMockContext(
        {
          roles: ['USER'],
          permissions: [
            { action: 'read', subject: 'User' },
            { action: 'update', subject: 'User' },
          ],
        },
        [
          { action: 'read', subject: 'User' },
          { action: 'update', subject: 'User' },
        ],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return false if user is missing any of the required permissions', () => {
      const context = createMockContext(
        {
          roles: ['USER'],
          permissions: [{ action: 'read', subject: 'User' }],
        },
        [
          { action: 'read', subject: 'User' },
          { action: 'update', subject: 'User' },
        ],
      );
      expect(guard.canActivate(context)).toBe(false);
    });
  });
});
