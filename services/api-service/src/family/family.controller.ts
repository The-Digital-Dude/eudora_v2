import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import {
  CreateGuardianProfileDto,
  UpdateGuardianProfileDto,
} from './dto/guardian.dto';
import {
  CreateRelationshipDto,
  UpdateRelationshipDto,
} from './dto/relationship.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Roles('SUPER_ADMIN', 'ADMIN')
@Controller()
@UseGuards(RolesGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  // --- Guardian Profile Endpoints ---

  @Post('guardian-profiles')
  @Roles('ADMIN', 'SUPER_ADMIN', 'GUARDIAN')
  async createGuardianProfile(
    @Body() dto: CreateGuardianProfileDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const isOnlyGuardian =
      user.roles.includes('GUARDIAN') &&
      !user.roles.includes('ADMIN') &&
      !user.roles.includes('SUPER_ADMIN');

    if (isOnlyGuardian) {
      dto.userId = user.id;
    }
    return this.familyService.createGuardianProfile(dto);
  }

  /**
   * The onboarding wizard's step 1. Always acts on the caller's own profile,
   * so unlike POST /guardian-profiles it can neither be pointed at someone
   * else nor 409 on the row registration already created for them.
   */
  @Post('guardian-profiles/me')
  @Roles('ADMIN', 'SUPER_ADMIN', 'GUARDIAN')
  async upsertOwnGuardianProfile(
    @Body() dto: CreateGuardianProfileDto,
    @Req() req: any,
  ) {
    return this.familyService.upsertOwnGuardianProfile(req.user.id, dto);
  }

  @Get('guardian-profiles')
  async findAllGuardianProfiles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.familyService.findAllGuardianProfiles(pageNum, limitNum);
  }

  @Get('guardian-profiles/:id')
  async findGuardianProfileById(@Param('id') id: string) {
    return this.familyService.findGuardianProfileById(id);
  }

  @Patch('guardian-profiles/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'GUARDIAN')
  async updateGuardianProfile(
    @Param('id') id: string,
    @Body() dto: UpdateGuardianProfileDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const isOnlyGuardian =
      user.roles.includes('GUARDIAN') &&
      !user.roles.includes('ADMIN') &&
      !user.roles.includes('SUPER_ADMIN');

    if (isOnlyGuardian) {
      const profile = await this.familyService.findGuardianProfileById(id);
      if (profile.userId !== user.id) {
        throw new ForbiddenException('You can only update your own profile');
      }
      dto.userId = user.id;
    }
    return this.familyService.updateGuardianProfile(id, dto);
  }

  @Delete('guardian-profiles/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteGuardianProfile(@Param('id') id: string) {
    return this.familyService.deleteGuardianProfile(id);
  }

  // --- Guardian Student Relationship Endpoints ---

  @Post('guardian-relationships')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createRelationship(@Body() dto: CreateRelationshipDto) {
    return this.familyService.createRelationship(dto);
  }

  @Get('guardian-relationships')
  async findAllRelationships(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('guardianProfileId') guardianProfileId?: string,
    @Query('studentProfileId') studentProfileId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.familyService.findAllRelationships(
      pageNum,
      limitNum,
      guardianProfileId,
      studentProfileId,
    );
  }

  @Get('guardian-relationships/:guardianProfileId/:studentProfileId')
  async findRelationship(
    @Param('guardianProfileId') guardianProfileId: string,
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.familyService.findRelationship(
      guardianProfileId,
      studentProfileId,
    );
  }

  @Patch('guardian-relationships/:guardianProfileId/:studentProfileId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateRelationship(
    @Param('guardianProfileId') guardianProfileId: string,
    @Param('studentProfileId') studentProfileId: string,
    @Body() dto: UpdateRelationshipDto,
  ) {
    return this.familyService.updateRelationship(
      guardianProfileId,
      studentProfileId,
      dto,
    );
  }

  @Delete('guardian-relationships/:guardianProfileId/:studentProfileId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteRelationship(
    @Param('guardianProfileId') guardianProfileId: string,
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.familyService.deleteRelationship(
      guardianProfileId,
      studentProfileId,
    );
  }

  @Post('guardian-relationships/self-link')
  @Roles('GUARDIAN', 'ADMIN', 'SUPER_ADMIN')
  async selfLink(
    @Body() dto: { studentEmail: string; relationshipType?: string },
    @Req() req: any,
  ) {
    return this.familyService.selfLink(
      req.user.id,
      dto.studentEmail,
      dto.relationshipType,
    );
  }
}
