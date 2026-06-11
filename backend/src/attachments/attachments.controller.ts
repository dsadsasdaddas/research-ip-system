import {
  Controller, Post, Get, Delete, Param, Query, Res,
  UseGuards, UseInterceptors, UploadedFile, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';
import * as fs from 'fs';

const storage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private svc: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('relationType') relationType: string,
    @Body('relationId')   relationId: string,
    @Body('remark')       remark: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.saveFile(file, relationType, +relationId, user.username, remark);
  }

  @Get()
  list(
    @Query('relationType') relationType: string,
    @Query('relationId')   relationId: string,
  ) {
    return this.svc.list(relationType, +relationId);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response, @CurrentUser() user: AuthUser) {
    const att = await this.svc.findOne(+id);
    await this.svc.checkAccess(att, user);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.originalName)}"`);
    res.setHeader('Content-Type', att.mimeType || 'application/octet-stream');
    const stream = fs.createReadStream(att.filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ message: '文件读取失败' });
      }
    });
    stream.pipe(res);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const att = await this.svc.findOne(+id);
    this.svc.checkAccess(att, user);
    return this.svc.remove(+id);
  }
}
