import { request } from '../request';

const DEMO_USER_KEY = 'tenant_admin_demo_user';

const demoUsers: Record<string, Api.Auth.UserInfo & { password: string; token: string }> = {
  super: {
    userId: '1',
    userName: '平台超管',
    password: '123456',
    token: 'demo-token-super',
    roles: ['R_SUPER'],
    buttons: ['*']
  },
  admin: {
    userId: '2',
    userName: '租户管理员',
    password: '123456',
    token: 'demo-token-admin',
    roles: ['R_ADMIN'],
    buttons: ['add', 'edit', 'approve', 'export']
  },
  user: {
    userId: '3',
    userName: '审核专员',
    password: '123456',
    token: 'demo-token-auditor',
    roles: ['R_AUDITOR'],
    buttons: ['approve']
  },
  soybean: {
    userId: '2',
    userName: '租户管理员',
    password: '123456',
    token: 'demo-token-admin',
    roles: ['R_ADMIN'],
    buttons: ['add', 'edit', 'approve', 'export']
  }
};

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
export function fetchLogin(userName: string, password: string) {
  const account = demoUsers[userName.toLowerCase()];

  if (account && account.password === password) {
    localStorage.setItem(DEMO_USER_KEY, userName.toLowerCase());

    return Promise.resolve({
      data: {
        token: account.token,
        refreshToken: `${account.token}-refresh`
      },
      error: null
    });
  }

  return request<Api.Auth.LoginToken>({
    url: '/auth/login',
    method: 'post',
    data: {
      userName,
      password
    }
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  const key = localStorage.getItem(DEMO_USER_KEY) || 'admin';
  const account = demoUsers[key] || demoUsers.admin;
  const { password: _password, token: _token, ...userInfo } = account;

  return Promise.resolve({
    data: userInfo,
    error: null
  });
}

/**
 * Refresh token
 *
 * @param refreshToken Refresh token
 */
export function fetchRefreshToken(refreshToken: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/refreshToken',
    method: 'post',
    data: {
      refreshToken
    }
  });
}

/**
 * return custom backend error
 *
 * @param code error code
 * @param msg error message
 */
export function fetchCustomBackendError(code: string, msg: string) {
  return request({ url: '/auth/error', params: { code, msg } });
}
