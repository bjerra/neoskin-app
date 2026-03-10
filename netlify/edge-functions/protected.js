
const handler = async (event) => {
  const { headers } = event;
  const authHeader = headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  // Verify JWT (use jsonwebtoken or Netlify's context)
  // If valid, return protected data
  return { statusCode: 200, body: JSON.stringify({ message: 'Protected content' }) };
}

export default handler;