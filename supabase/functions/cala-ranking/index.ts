// Endpoint público; a autenticação das gravações é feita pelo nome + PIN.
// As credenciais do banco são lidas apenas do ambiente da função.
const ORIGEM = 'https://andremarrano.github.io';
const url = Deno.env.get('SUPABASE_URL')!;
const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const secret = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': ORIGEM,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Cache-Control': 'no-store',
  'Vary': 'Origin',
};
function resposta(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers }); }
async function rpc(nome: string, args: Record<string, unknown> = {}) {
  const r = await fetch(url + '/rest/v1/rpc/' + nome, {
    method: 'POST', headers: { apikey: secret!, 'Content-Type': 'application/json' },
    body: JSON.stringify(args), signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error('database_unavailable');
  return await r.json();
}
const erros: Record<string, [number, string]> = {
  wrong_pin: [403, 'Código incorreto. A pontuação não foi registrada.'],
  new_name: [409, 'Este nome ainda não existe. Continue para criar seu cadastro.'],
  name_taken: [409, 'Este nome acabou de ser cadastrado. Use o código dele ou escolha outro nome.'],
  rate_limited: [429, 'Muitas tentativas. Aguarde 10 minutos e tente novamente.'],
  invalid_input: [400, 'Confira o nome, o código de 4 números e a pontuação.'],
};
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  if (origin && origin !== ORIGEM) return resposta({ error: 'origin', message: 'Origem não autorizada.' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!['GET', 'POST'].includes(req.method)) return resposta({ error: 'method', message: 'Método não permitido.' }, 405);
  try {
    if (!secret || !url) throw new Error('missing_configuration');
    if (req.method === 'GET') return resposta({ rows: await rpc('cala_rank_list') });
    // Tamanho limitado mesmo se Content-Length estiver ausente ou incorreto.
    const reader = req.body?.getReader();
    if (!reader) return resposta({ error: 'invalid_input', message: erros.invalid_input[1] }, 400);
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); return resposta({ error: 'invalid_input', message: 'Pedido muito grande.' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let data;
    try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch (_) { return resposta({ error: 'invalid_input', message: erros.invalid_input[1] }, 400); }
    if (!data || typeof data.name !== 'string' || !['inspect', 'submit'].includes(data.action)) return resposta({ error: 'invalid_input', message: erros.invalid_input[1] }, 400);
    const name = data.name.normalize('NFKC').replace(/\s+/gu, ' ').trim();
    if (!name || [...name].length > 24 || /[\p{Cc}\p{Cf}]/u.test(name)) return resposta({ error: 'invalid_input', message: 'Escolha um nome de 1 a 24 caracteres visíveis.' }, 400);
    // O gateway fornece o endereço de origem. Só seu hash é guardado por até 1 dia.
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
    const ipHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip)))).map(b => b.toString(16).padStart(2, '0')).join('');
    let result;
    if (data.action === 'inspect') result = await rpc('cala_rank_inspect', { p_name: name, p_ip: ipHash });
    else {
      if (typeof data.pin !== 'string' || !/^[0-9]{4}$/.test(data.pin) || !Number.isSafeInteger(data.score) || data.score < 0 || data.score > 1800 || typeof data.create !== 'boolean') return resposta({ error: 'invalid_input', message: erros.invalid_input[1] }, 400);
      result = await rpc('cala_rank_submit', { p_name: name, p_pin: data.pin, p_score: data.score, p_create: data.create, p_ip: ipHash });
    }
    if (result.error) { const [status, message] = erros[result.error] || [400, 'Não foi possível registrar.']; return resposta({ error: result.error, message }, status); }
    return resposta(result);
  } catch (_) {
    // Não registrar corpo, PIN, IP ou chave em logs.
    return resposta({ error: 'unavailable', message: 'O ranking está indisponível agora. Sua pontuação continua aqui; tente novamente.' }, 503);
  }
});
