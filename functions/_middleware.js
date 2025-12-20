export async function onRequest(context) {
  const { request, env } = context;

  // 从环境变量读取，如果没有设置则无法登录（更安全）
  const USERNAME = env.BASIC_AUTH_USER; 
  const PASSWORD = env.BASIC_AUTH_PASS; 

  const auth = request.headers.get('Authorization');
  const expectedAuth = `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`;

  if (!USERNAME || !PASSWORD || auth !== expectedAuth) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }
  return await context.next();
}
