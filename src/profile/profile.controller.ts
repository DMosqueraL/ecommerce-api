import { Controller, Get, Post, Patch, Body, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  findMe(@Req() req) {
    return this.profileService.findByUserId(req.user.id);
  }

  @Post('me')
  createMe(@Req() req, @Body() body: CreateProfileDto) {
    return this.profileService.create(req.user.id, body);
  }

  @Patch('me')
  updateMe(@Req() req, @Body() body: UpdateProfileDto) {
    return this.profileService.update(req.user.id, body);
  }
}
