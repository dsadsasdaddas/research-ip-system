import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { MockObject } from '../testing/mocks';

describe('AuthController', () => {
  it('login 委托 authService.login', async () => {
    const service: MockObject = {
      login: jest.fn().mockResolvedValue({ token: 'T' }),
    };
    const controller = new AuthController(service as unknown as AuthService);
    const out = await controller.login({
      username: 'u',
      password: 'p',
    });
    expect(service.login).toHaveBeenCalledWith('u', 'p');
    expect(out).toEqual({ token: 'T' });
  });
});
