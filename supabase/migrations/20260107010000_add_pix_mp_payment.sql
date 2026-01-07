-- Adicionar pix_mp como forma de pagamento válida
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_forma_pagamento_check;

ALTER TABLE vendas ADD CONSTRAINT vendas_forma_pagamento_check 
  CHECK (forma_pagamento IN ('dinheiro', 'debito', 'credito', 'pix', 'pix_mp', 'fiado'));
