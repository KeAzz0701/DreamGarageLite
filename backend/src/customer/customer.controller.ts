import {
  Body,
  Controller,
  Get,
  Param,
  Delete,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { CustomerService } from './customer.service';

@Controller('customer')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
  ) {}

  @Get()
  async getAll() {
    return this.customerService.getAll();
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerService.getById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.customerService.update(id, body);
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerService.delete(id);
  }

  @Get(':id/line-link')
  async getLineLink(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const token = await this.customerService.ensureLineLinkToken(id);
    return { token };
  }

  @Delete(':id/line-link')
  async unlinkLine(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerService.unlinkLineUser(id);
  }
}