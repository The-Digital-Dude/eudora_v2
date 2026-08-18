import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
import { LookupQueryDto } from '../assessments/dto/assessments.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';

/**
 * Grade levels — the top of the Class -> Program -> Course taxonomy.
 *
 * Reads are open to every signed-in role because the class list populates
 * pickers all over the product (programme form, assessment and question
 * editors). Writes are admin-only.
 */
@Controller('classes')
@UseGuards(RolesGuard)
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  async list(@Query() query: LookupQueryDto) {
    return this.classes.list(query);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async create(
    @Body() body: CreateClassDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.classes.create(body, user.id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateClassDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.classes.update(id, body, user.id);
  }
}
