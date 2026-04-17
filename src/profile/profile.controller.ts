import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  findMe(@Req() req) {
    return this.profileService.findByUserId(req.user.id);
  }

  @Patch('me')
  updateMe(@Req() req, @Body() body: UpdateProfileDto) {
    return this.profileService.update(req.user.id, body);
  }
}
