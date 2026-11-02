-- Local test database only (never run this on production).
-- Server key the app uses for server-only functions in the signed-in browser tests: SERVER_RPC_KEY=e2e-server-key
insert into private.server_keys (name, key_hash)
values ('app', encode(sha256(convert_to('e2e-server-key', 'UTF8')), 'hex'))
on conflict do nothing;
