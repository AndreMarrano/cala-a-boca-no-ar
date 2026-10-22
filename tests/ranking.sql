-- Execute no SQL Editor ou via MCP. Toda a massa de teste é revertida ao final.
begin;
set local role service_role;
do $$
declare r jsonb; n integer; ip text := repeat('a',64);
begin
  r := public.cala_rank_inspect('__qa_ranking_0047',ip);
  assert r->>'exists' = 'false', 'Fixture já existe';
  r := public.cala_rank_submit('__qa_ranking_0047','0047',150,false,ip);
  assert r->>'error' = 'new_name', 'Não criar sem confirmação';
  r := public.cala_rank_submit('__qa_ranking_0047','0047',150,true,ip);
  assert r->>'created' = 'true' and (r->>'best')::int = 150, 'Cadastro com zero inicial';
  assert (select pin_hash <> '0047' and pin_hash like '$2%' from cala_private.players where name_key = '__qa_ranking_0047'), 'PIN deve ser bcrypt';
  assert r::text not like '%pin_hash%', 'Resposta não pode conter hash';
  r := public.cala_rank_submit('__qa_ranking_0047','9999',999,false,ip);
  assert r->>'error' = 'wrong_pin', 'PIN errado recusado';
  assert (select best_score = 150 from cala_private.players where name_key = '__qa_ranking_0047'), 'PIN errado não altera recorde';
  r := public.cala_rank_submit('__QA_RANKING_0047','0047',75,false,ip);
  assert (r->>'best')::int = 150 and r->>'improved' = 'false', 'Case insensitive e recorde menor';
  r := public.cala_rank_submit('__qa_ranking_0047','0047',200,false,ip);
  assert (r->>'best')::int = 200 and r->>'improved' = 'true', 'Novo recorde';
  r := public.cala_rank_submit('__qa_ranking_0047','7777',500,true,ip);
  assert r->>'error' = 'name_taken', 'Novo cadastro não pode trocar PIN';
  r := public.cala_rank_submit('__qa_ranking_0047','0047',200,false,ip);
  assert (r->>'best')::int = 200, 'Cadastro anterior continua válido';
  for n in 1..6 loop
    r := public.cala_rank_submit('__qa_ranking_0047','9999',999,false,ip);
    assert r->>'error' = 'wrong_pin', 'Seis erros permitidos antes do bloqueio';
  end loop;
  r := public.cala_rank_submit('__qa_ranking_0047','0047',500,false,ip);
  assert r->>'error' = 'rate_limited', 'Bloqueio após seis erros';
  assert (select best_score = 200 from cala_private.players where name_key = '__qa_ranking_0047'), 'Bloqueio não grava';
  r := public.cala_rank_submit('__qa_ranking_0047','047',500,false,ip);
  assert r->>'error' = 'invalid_input', 'PIN com três dígitos recusado';
  r := public.cala_rank_submit('__qa_ranking_0047','0047',1801,false,ip);
  assert r->>'error' = 'invalid_input', 'Pontuação fora do limite recusada';
  r := public.cala_rank_submit('__qa_empate_b','0000',200,true,ip);
  r := public.cala_rank_submit('__qa_empate_a','0000',200,true,ip);
  assert (select count(*) = 3 from cala_private.players where name_key like '__qa_%'), 'Uma linha por nome';
  assert (select jsonb_array_length(public.cala_rank_list()) >= 3), 'Ranking contém pontuações';
end;
$$;
reset role;
do $$
begin
  assert not has_schema_privilege('anon','cala_private','usage'), 'Schema privado';
  assert not has_table_privilege('anon','cala_private.players','select'), 'PINs não acessíveis';
  assert not has_table_privilege('authenticated','cala_private.players','update'), 'Sem escrita direta';
  assert not has_function_privilege('anon','public.cala_rank_submit(text,text,integer,boolean,text)','execute'), 'RPC não pública';
  assert not has_function_privilege('authenticated','public.cala_rank_list()','execute'), 'Leitura pública passa pela Edge Function';
  assert (select relrowsecurity from pg_class where oid = 'cala_private.players'::regclass), 'RLS ativa';
end;
$$;
rollback;
select 'Cadastro, PIN, recorde, limites e permissões: OK. Testes revertidos.' as resultado;
