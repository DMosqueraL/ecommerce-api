import { ApiProperty } from '@nestjs/swagger';

type ProfileData = {
  id: number;
  phone: string | null;
  address: string | null;
  docType: string | null;
  docNumber: string | null;
  userId: number;
};

export class ProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '+57 300 123 4567', nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'Calle 123 # 45-67, Bogotá', nullable: true })
  address: string | null;

  @ApiProperty({ example: 'CC', nullable: true })
  docType: string | null;

  @ApiProperty({ example: '1234567890', nullable: true })
  docNumber: string | null;

  @ApiProperty({ example: 1 })
  userId: number;

  constructor(profile: ProfileData) {
    this.id = profile.id;
    this.phone = profile.phone;
    this.address = profile.address;
    this.docType = profile.docType;
    this.docNumber = profile.docNumber;
    this.userId = profile.userId;
  }
}
