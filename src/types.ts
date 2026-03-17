export interface Cliente {
  id: string; // Telefone internacional
  nome: string;
  telefone: string;
  email?: string;
  cpf?: string;
  endereco?: string;
  observacoes?: string;
  dataCadastro: any;
}

export interface Reuniao {
  id: string;
  data: any; // Timestamp
  horario: string;
  clienteId: string;
  nomeEvento: string;
  local: string;
  tipoEvento: 'Casamento' | 'Corporativo' | 'Aniversário' | 'Outro';
  publicoEstimado: number;
  follow?: string;
  linkReuniao?: string;
  status: 'Agendada' | 'Em andamento' | 'Em espera' | 'Realizada' | 'Cancelada';
  decisao?: 'Aprovado' | 'Recusado';
  inicioReal?: any;
  fimReal?: any;
  duracaoSegundos?: number;
  isPaused?: boolean;
  lastStart?: any;
  valorShow?: number;
  somContratado?: boolean;
  duracao?: string;
}

export interface ReuniaoLog {
  id: string;
  texto: string;
  data: any;
}

export interface Show {
  id: string; // [tipoEvento]-[telefone]-[dataEvento]
  clienteId: string;
  reuniaoId: string;
  nomeEvento: string;
  dataEvento: any; // Timestamp
  horarioEvento: string;
  cidade: string;
  local: string;
  endereco: string;
  tipoEvento: 'Casamento' | 'Formatura' | 'Aniversário' | 'Confraternização' | 'Corporativo' | 'Outros';
  statusEvento: 'Confirmado' | 'Cancelado' | 'Em negociação' | 'Realizado' | 'Finalizado';
  observacoes?: string;
  cerimonialista?: string;
  localCerimonia?: string;
  valorContrato?: number;
  publicoEstimado?: number;
  somContratado?: boolean;
  formaPagamento?: 'À vista' | 'Parcelado';
  duracao?: string;
  alimentacao?: boolean;
  valorPagoTotal?: number;
}

export interface Integrante {
  id: string; // Telefone
  nome: string;
  funcao: string;
  telefone: string;
  email?: string;
  cachePadrao: number;
}

export interface EquipeShow {
  id: string;
  integranteId: string;
  funcao: string;
  cache: number;
  observacoes?: string;
  confirma: boolean;
}

export interface DocumentoShow {
  id: string;
  nomeDocumento: string;
  urlArquivo: string;
  dataUpload: any;
  tipoDocumento: 'Contrato' | 'Orçamento' | 'Comprovante' | 'Outro';
}

export interface FinanceiroShow {
  valorContrato: number;
  valorPagoTotal: number;
  observacoes?: string;
}

export interface ParcelaFinanceira {
  id: string;
  valorPagoParcela: number;
  formaPagamento: string;
  statusPagamento: 'Pendente' | 'Pago';
  linkComprovante?: string;
  dataPagamento?: any;
}
