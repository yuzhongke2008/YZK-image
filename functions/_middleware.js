export async function onRequest(context) {
  const { request } = context;
  
  // 你设定的账号密码
  const USERNAME = "meizu2008"; 
  const PASSWORD = "cdma2008"; 

  const auth = request.headers.get('Authorization');
  const expectedAuth = `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`;

  if (auth !== expectedAuth) {
    return new Response('Unauthorized: Access Denied', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="My Private Image Host"',
      },
    });
  }

  return await context.next();
}
