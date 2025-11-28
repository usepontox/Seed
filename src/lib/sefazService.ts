/**
 * Serviço para integração com API de emissão de NFC-e da SEFAZ
 * Este serviço prepara os dados para futura integração com provedor de NF
 */

export interface NfcePayload {
  empresa: {
    cnpj: string;
    inscricao_estadual?: string;
    nome: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  cliente?: {
    cpf?: string;
    cnpj?: string;
    nome?: string;
  };
  itens: Array<{
    codigo: string;
    descricao: string;
    ncm?: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
  }>;
  totais: {
    subtotal: number;
    desconto: number;
    total: number;
  };
  pagamento: {
    forma: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outro';
    valor: number;
  };
}

export interface NfceResponse {
  success: boolean;
  chave?: string;
  protocolo?: string;
  xml?: string;
  data_emissao?: string;
  error?: string;
  message?: string;
}

/**
 * Valida os dados antes de enviar para emissão
 */
export function validarPayloadNfce(payload: NfcePayload): { valido: boolean; erro?: string } {
  if (!payload.empresa.cnpj) {
    return { valido: false, erro: "CNPJ da empresa é obrigatório" };
  }

  if (!payload.itens || payload.itens.length === 0) {
    return { valido: false, erro: "É necessário pelo menos um item na nota" };
  }

  if (payload.totais.total <= 0) {
    return { valido: false, erro: "Valor total da nota deve ser maior que zero" };
  }

  return { valido: true };
}

/**
 * Converte dados da venda para o formato do payload NFC-e
 */
export function converterVendaParaNfce(
  venda: any,
  empresa: any,
  itens: any[]
): NfcePayload {
  return {
    empresa: {
      cnpj: empresa.cnpj || "",
      nome: empresa.nome || "",
      endereco: empresa.endereco || "",
      cidade: empresa.cidade || "",
      estado: empresa.estado || "",
      cep: empresa.cep || "",
    },
    cliente: venda.cliente
      ? {
          cpf: venda.cliente.cpf,
          cnpj: venda.cliente.cnpj,
          nome: venda.cliente.nome,
        }
      : undefined,
    itens: itens.map((item) => ({
      codigo: item.produto.sku || item.produto.id,
      descricao: item.produto.nome,
      ncm: item.produto.ncm || "",
      quantidade: item.quantidade,
      valor_unitario: item.preco_unitario,
      valor_total: item.subtotal,
    })),
    totais: {
      subtotal: venda.subtotal,
      desconto: venda.desconto,
      total: venda.total,
    },
    pagamento: {
      forma: venda.forma_pagamento,
      valor: venda.total,
    },
  };
}

/**
 * Função placeholder para emissão de NFC-e
 * Em produção, esta função deve chamar a API real do provedor de NF
 */
export async function emitirNfce(payload: NfcePayload): Promise<NfceResponse> {
  // Validar payload
  const validacao = validarPayloadNfce(payload);
  if (!validacao.valido) {
    return {
      success: false,
      error: validacao.erro,
      message: "Erro na validação dos dados",
    };
  }

  // TODO: Integrar com API real do provedor de NF
  // Por enquanto, retorna um mock de resposta
  console.log("Payload NFC-e preparado:", payload);

  // Simular resposta de sucesso
  return {
    success: true,
    chave: "MOCK_CHAVE_" + Date.now(),
    protocolo: "MOCK_PROTOCOLO_" + Date.now(),
    xml: "<xml>MOCK XML CONTENT</xml>",
    data_emissao: new Date().toISOString(),
    message: "NFC-e preparada para emissão (modo de desenvolvimento)",
  };
}
