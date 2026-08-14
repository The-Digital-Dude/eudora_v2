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
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller()
@UseGuards(RolesGuard)
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  // --- Program Endpoints ---

  @Post('programs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createProgram(@Body() dto: CreateProgramDto) {
    return this.institutionService.createProgram(dto);
  }

  @Get('programs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAllPrograms(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.institutionService.findAllPrograms(pageNum, limitNum, search);
  }

  @Get('programs/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
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
