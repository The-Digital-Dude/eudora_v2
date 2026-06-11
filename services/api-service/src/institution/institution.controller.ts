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
} from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { CreateCampusDto, UpdateCampusDto } from './dto/campus.dto';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller()
@UseGuards(RolesGuard)
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  // --- Campus Endpoints ---

  @Post('campuses')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createCampus(@Body() dto: CreateCampusDto) {
    return this.institutionService.createCampus(dto);
  }

  @Get('campuses')
  async findAllCampuses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.institutionService.findAllCampuses(pageNum, limitNum);
  }

  @Get('campuses/:id')
  async findCampusById(@Param('id') id: string) {
    return this.institutionService.findCampusById(id);
  }

  @Patch('campuses/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateCampus(@Param('id') id: string, @Body() dto: UpdateCampusDto) {
    return this.institutionService.updateCampus(id, dto);
  }

  @Delete('campuses/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteCampus(@Param('id') id: string) {
    return this.institutionService.deleteCampus(id);
  }

  // --- Program Endpoints ---

  @Post('programs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createProgram(@Body() dto: CreateProgramDto) {
    return this.institutionService.createProgram(dto);
  }

  @Get('programs')
  async findAllPrograms(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('campusId') campusId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.institutionService.findAllPrograms(pageNum, limitNum, campusId);
  }

  @Get('programs/:id')
  async findProgramById(@Param('id') id: string) {
    return this.institutionService.findProgramById(id);
  }

  @Patch('programs/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateProgram(@Param('id') id: string, @Body() dto: UpdateProgramDto) {
    return this.institutionService.updateProgram(id, dto);
  }

  @Delete('programs/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteProgram(@Param('id') id: string) {
    return this.institutionService.deleteProgram(id);
  }
}
