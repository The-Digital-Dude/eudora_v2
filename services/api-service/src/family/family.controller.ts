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
  CreateFamilyDto,
  UpdateFamilyDto,
  AddFamilyMemberDto,
} from './dto/family.dto';
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

  // --- Family Endpoints ---

  @Post('families')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createFamily(@Body() dto: CreateFamilyDto) {
    return this.familyService.createFamily(dto);
  }

  @Get('families')
  async findAllFamilies(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.familyService.findAllFamilies(pageNum, limitNum);
  }

  @Get('families/:id')
  async findFamilyById(@Param('id') id: string) {
    return this.familyService.findFamilyById(id);
  }

  @Patch('families/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateFamily(@Param('id') id: string, @Body() dto: UpdateFamilyDto) {
    return this.familyService.updateFamily(id, dto);
  }

  @Delete('families/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteFamily(@Param('id') id: string) {
    return this.familyService.deleteFamily(id);
  }

  @Post('families/:id/members')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async addMemberToFamily(
    @Param('id') familyId: string,
    @Body() dto: AddFamilyMemberDto,
  ) {
    return this.familyService.addMemberToFamily(familyId, dto);
  }

  @Delete('families/:id/members')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async removeMemberFromFamily(
    @Param('id') familyId: string,
    @Query('studentProfileId') studentProfileId?: string,
    @Query('guardianProfileId') guardianProfileId?: string,
  ) {
    return this.familyService.removeMemberFromFamily(
      familyId,
      studentProfileId,
      guardianProfileId,
    );
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
