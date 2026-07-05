import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {

  @Get()
  getHello() {
    return {
      message: 'Dream Garage Lite API',
    };
  }

  @Get('api/status')
  getStatus() {
    return {
      status: 'OK',
      system: 'Dream Garage Lite',
      version: '0.1.0',
      ai: [
        'OpenAI',
        'Gemini'
      ]
    };
  }

}