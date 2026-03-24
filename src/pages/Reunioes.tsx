import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { Reuniao, Cliente } from '../types';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  FileText,
  CheckCircle,
  XCircle,
  ExternalLink,
  Edit2,
  Users
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, addDoc, collection, orderBy, Timestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

import { useNavigate } from 'react-router-dom';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export const Reunioes = () => {
  const navigate = useNavigate();
  const { data: reunioes } = useFirestoreCollection<Reuniao>('reunioes', [orderBy('data', 'desc')]);
  const { data: clientes } = useFirestoreCollection<Cliente>('clientes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReuniao, setEditingReuniao] = useState<Reuniao | null>(null);
  const [heleModal, setHeleModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [filterStatus, setFilterStatus] = useState<string>('Ativas');
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Partial<Reuniao>>();

  const onSubmit = async (formData: any) => {
    try {
      if (!formData.data || !formData.horario) {
        alert("Data e horário são obrigatórios");
        return;
      }

      const [year, month, day] = formData.data.split('-').map(Number);
      const [hour, minute] = (formData.horario || '00:00').split(':').map(Number);
      const dateObj = new Date(year, month - 1, day, hour, minute);
      
      const { data, horario, ...rest } = formData;
      
      const finalData: any = {
        ...rest,
        horario,
        data: Timestamp.fromDate(dateObj),
        somContratado: formData.somContratado === 'true',
        duracao: formData.duracao || '',
      };

      // Remover campos undefined para evitar erro no Firestore
      Object.keys(finalData).forEach(key => finalData[key] === undefined && delete finalData[key]);

      if (editingReuniao) {
        await updateDoc(doc(db, 'reunioes', editingReuniao.id), finalData);
      } else {
        await addDoc(collection(db, 'reunioes'), {
          ...finalData,
          status: 'Agendada',
          dataCriacao: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      reset();
      setEditingReuniao(null);
    } catch (error) {
      console.error("Erro ao salvar reunião:", error);
      alert("Erro ao salvar reunião. Verifique o console.");
    }
  };

  const handleEdit = (reuniao: Reuniao) => {
    setEditingReuniao(reuniao);
    
    // Convert Timestamp to YYYY-MM-DD for input
    let dateStr = '';
    if (reuniao.data instanceof Timestamp) {
      dateStr = format(reuniao.data.toDate(), 'yyyy-MM-dd');
    } else if (reuniao.data && typeof reuniao.data === 'string') {
      dateStr = reuniao.data;
    }

    setValue('data', dateStr);
    setValue('horario', reuniao.horario);
    setValue('clienteId', reuniao.clienteId);
    setValue('tipoEvento', reuniao.tipoEvento);
    setValue('nomeEvento', reuniao.nomeEvento);
    setValue('local', reuniao.local);
    setValue('publicoEstimado', reuniao.publicoEstimado);
    setValue('linkReuniao', reuniao.linkReuniao);
    setValue('follow', reuniao.follow);
    setValue('valorShow', reuniao.valorShow);
    setValue('somContratado', reuniao.somContratado);
    setValue('duracao', reuniao.duracao);
    setIsModalOpen(true);
  };

  const handleDecisao = async (reuniao: Reuniao, decisao: 'Aprovado' | 'Recusado') => {
    try {
      await updateDoc(doc(db, 'reunioes', reuniao.id), {
        decisao,
        status: 'Realizada'
      });
      alert(`Reunião marcada como ${decisao}`);
    } catch (error) {
      console.error("Erro ao processar decisão:", error);
    }
  };

  const handleGerarEvento = async (reuniao: Reuniao) => {
    try {
      const cliente = clientes.find(c => c.id === reuniao.clienteId);
      
      let dateObj: Date;
      if (reuniao.data instanceof Timestamp) {
        dateObj = reuniao.data.toDate();
      } else {
        dateObj = new Date(reuniao.data + 'T' + (reuniao.horario || '00:00'));
      }

      const dataFormatada = format(dateObj, 'dd-MM-yyyy');
      const showId = `${reuniao.tipoEvento || 'Outro'}-${cliente?.id || 'unknown'}-${dataFormatada}`;
      
      await setDoc(doc(db, 'shows', showId), {
        id: showId,
        clienteId: reuniao.clienteId,
        reuniaoId: reuniao.id,
        nomeEvento: reuniao.nomeEvento || '',
        dataEvento: Timestamp.fromDate(dateObj),
        horarioEvento: reuniao.horario || '',
        local: reuniao.local || '',
        statusEvento: 'Confirmado',
        tipoEvento: reuniao.tipoEvento || 'Outro',
        valorContrato: reuniao.valorShow || 0,
        cidade: '',
        endereco: ''
      }, { merge: true });

      // Adicionar dados financeiros iniciais
      await setDoc(doc(db, 'shows', showId, 'financeiro', 'geral'), {
        valorContrato: reuniao.valorShow || 0,
        valorPagoTotal: 0,
        observacoes: 'Gerado a partir da reunião'
      }, { merge: true });

      setHeleModal({
        isOpen: true,
        message: `Com certeza! Já gerei o evento "${reuniao.nomeEvento}" para você. Tudo pronto na aba de Shows!`
      });
    } catch (error) {
      console.error("Erro ao gerar evento:", error);
    }
  };

  const handleGerarOrcamento = async (reuniao: Reuniao) => {
    const cliente = clientes.find(c => c.id === reuniao.clienteId);
    
    let dataEvento = '';
    if (reuniao.data instanceof Timestamp) {
      dataEvento = format(reuniao.data.toDate(), 'dd/MM/yyyy');
    } else {
      dataEvento = reuniao.data;
    }

    const formatPhone = (phone: any) => {
      const cleaned = String(phone || '').replace(/\D/g, '');
      return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    };

    const payload = {
      tituloEvento: reuniao.nomeEvento,
      valor: reuniao.valorShow || 0,
      nomeCliente: cliente?.nome || 'Não informado',
      telefone: formatPhone(cliente?.telefone || ''),
      cidade: reuniao.local || 'Não informada',
      dataEvento,
      tipoEvento: reuniao.tipoEvento,
      duracao: reuniao.duracao || '',
      somContratado: reuniao.somContratado ? 'Sim' : 'Não',
      publicoEstimado: reuniao.publicoEstimado || 0
    };

    try {
      const response = await fetch('https://webhook.ehstech.com.br/webhook/orcamentoHS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Criar documento no Firebase (subcoleção da reunião)
        await addDoc(collection(db, 'reunioes', reuniao.id, 'documentos'), {
          dataUpload: serverTimestamp(),
          nomeDocumento: `${reuniao.nomeEvento}.pdf`,
          tipoDocumento: 'PDF',
          urlArquivo: result.urlArquivo || ''
        });

        setHeleModal({
          isOpen: true,
          message: "Olá! Acabei de enviar o orçamento para o sistema. O documento foi gerado e salvo no histórico da reunião!"
        });
      } else {
        alert("Erro ao enviar orçamento. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro no webhook:", error);
      alert("Erro de conexão ao enviar orçamento.");
    }
  };

  const filteredReunioes = reunioes.filter(r => {
    if (filterStatus === 'Todas') return true;
    if (filterStatus === 'Ativas') return ['Agendada', 'Em andamento', 'Em espera'].includes(r.status);
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Reuniões</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Acompanhe negociações e agendamentos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 w-full sm:w-auto"
        >
          <Plus size={20} />
          Agendar Reunião
        </button>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-full sm:w-fit shadow-sm overflow-x-auto scrollbar-hide">
        {['Ativas', 'Agendada', 'Em andamento', 'Em espera', 'Realizada', 'Cancelada', 'Todas'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              filterStatus === status 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredReunioes.map(reuniao => {
          const cliente = clientes.find(c => c.id === reuniao.clienteId);
          
          let formattedDate = '';
          if (reuniao.data instanceof Timestamp) {
            formattedDate = format(reuniao.data.toDate(), 'dd/MM/yyyy');
          } else if (reuniao.data && typeof reuniao.data === 'string') {
            const [year, month, day] = reuniao.data.split('-');
            formattedDate = `${day}/${month}/${year}`;
          }

          return (
            <div 
              key={reuniao.id} 
              onClick={() => navigate(`/reunioes/${reuniao.id}`)}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 relative overflow-hidden group cursor-pointer hover:border-blue-500/50 transition-all shadow-sm"
            >
              <div className="absolute top-0 right-0 p-4">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  reuniao.decisao === 'Aprovado' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                  reuniao.decisao === 'Recusado' ? "bg-rose-50 text-rose-600 border border-rose-100" : 
                  reuniao.status === 'Em andamento' ? "bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse" :
                  reuniao.status === 'Em espera' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                  reuniao.status === 'Cancelada' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                  "bg-blue-50 text-blue-600 border border-blue-100"
                )}>
                  {reuniao.status} {reuniao.decisao ? `(${reuniao.decisao})` : ''}
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-blue-600 border border-slate-100">
                  <Calendar size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">{reuniao.nomeEvento || 'Sem Nome'}</h3>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(reuniao); }} 
                      disabled={reuniao.status === 'Em andamento'}
                      className={cn(
                        "p-1 transition-all",
                        reuniao.status === 'Em andamento' 
                          ? "text-slate-200 cursor-not-allowed" 
                          : "text-slate-400 hover:text-blue-600"
                      )}
                      title={reuniao.status === 'Em andamento' ? "Não é possível editar uma reunião em andamento" : "Editar"}
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">{cliente?.nome || 'Cliente não encontrado'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  {formattedDate} às {reuniao.horario}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  {reuniao.local || 'Não definido'}
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  {reuniao.tipoEvento}
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  {reuniao.publicoEstimado || 0} pessoas
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <span className="text-slate-400 font-normal">Valor:</span>
                  {reuniao.valorShow ? `R$ ${reuniao.valorShow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não definido'}
                </div>
                {reuniao.linkReuniao && (
                  <a href={reuniao.linkReuniao} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                    <Video size={16} />
                    Link da Reunião
                  </a>
                )}
              </div>

              {reuniao.follow && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Follow-up / Observações</p>
                  <p className="text-xs text-slate-600 italic">"{reuniao.follow}"</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                {reuniao.valorShow && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleGerarOrcamento(reuniao); }}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-slate-200"
                  >
                    <ExternalLink size={14} />
                    Gerar Orçamento
                  </button>
                )}

                {reuniao.decisao === 'Aprovado' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleGerarEvento(reuniao); }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/10"
                  >
                    <Plus size={14} />
                    Gerar Evento
                  </button>
                )}
                
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDecisao(reuniao, 'Aprovado'); }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                    reuniao.decisao === 'Aprovado' ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100"
                  )}
                >
                  <CheckCircle size={14} />
                  Aprovar
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDecisao(reuniao, 'Recusado'); }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                    reuniao.decisao === 'Recusado' ? "bg-rose-600 text-white shadow-md shadow-rose-600/10" : "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100"
                  )}
                >
                  <XCircle size={14} />
                  Recusar
                </button>
                {reuniao.status !== 'Cancelada' && (
                  <button 
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      await updateDoc(doc(db, 'reunioes', reuniao.id), { status: 'Cancelada' });
                      alert("Reunião cancelada com sucesso!");
                    }}
                    className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-rose-100"
                  >
                    <XCircle size={14} />
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingReuniao ? 'Editar Reunião' : 'Agendar Reunião'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingReuniao(null); }} className="text-slate-400 hover:text-slate-600"><XCircle /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Data *</label>
                  <input type="date" {...register('data', { required: "Data é obrigatória" })} className={cn("w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50", errors.data ? "border-rose-500" : "border-slate-200")} />
                  {errors.data && <p className="text-rose-500 text-[10px] mt-1 font-bold">{String(errors.data.message)}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Horário *</label>
                  <input type="time" {...register('horario', { required: "Horário é obrigatório" })} className={cn("w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50", errors.horario ? "border-rose-500" : "border-slate-200")} />
                  {errors.horario && <p className="text-rose-500 text-[10px] mt-1 font-bold">{String(errors.horario.message)}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Cliente *</label>
                  <select {...register('clienteId', { required: "Cliente é obrigatório" })} className={cn("w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50", errors.clienteId ? "border-rose-500" : "border-slate-200")}>
                    <option value="">Selecione um cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {errors.clienteId && <p className="text-rose-500 text-[10px] mt-1 font-bold">{String(errors.clienteId.message)}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Tipo de Evento *</label>
                  <select {...register('tipoEvento', { required: "Tipo de evento é obrigatório" })} className={cn("w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50", errors.tipoEvento ? "border-rose-500" : "border-slate-200")}>
                    <option value="Casamento">Casamento</option>
                    <option value="Corporativo">Corporativo</option>
                    <option value="Aniversário">Aniversário</option>
                    <option value="Outro">Outro</option>
                  </select>
                  {errors.tipoEvento && <p className="text-rose-500 text-[10px] mt-1 font-bold">{errors.tipoEvento.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Nome do Evento</label>
                <input {...register('nomeEvento')} placeholder="Ex: Casamento de João e Maria" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Público Estimado</label>
                <input type="number" {...register('publicoEstimado', { valueAsNumber: true })} placeholder="Ex: 200" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Local do Evento</label>
                <input {...register('local')} placeholder="Ex: Buffet França" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Link da Reunião</label>
                <input {...register('linkReuniao')} placeholder="https://meet.google.com/..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Som Contratado?</label>
                <select {...register('somContratado')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="false">Não</option>
                  <option value="true">Sim (HS Produções)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Duração do Show</label>
                <select {...register('duracao')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="">Selecione a duração</option>
                  <option value="1 hora">1 hora</option>
                  <option value="2 horas">2 horas</option>
                  <option value="3 horas">3 horas</option>
                  <option value="Outra">Outra</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Valor do Show (R$)</label>
                <input type="number" step="0.01" {...register('valorShow', { valueAsNumber: true })} placeholder="0,00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Follow-up / O que aconteceu?</label>
                <textarea {...register('follow')} rows={3} placeholder="Registre aqui os detalhes da negociação..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingReuniao(null); }} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all text-slate-700">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
                  {editingReuniao ? 'Salvar Alterações' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal da Hele */}
      {heleModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 text-center space-y-6">
              <div className="relative inline-block">
                <div className="w-32 h-32 mx-auto rounded-full bg-blue-50 border-2 border-blue-100 overflow-hidden">
                  <img 
                    src="https://res.cloudinary.com/dvq0tmbil/image/upload/v1771442541/heleTransparente_uqdzk4.png" 
                    alt="Hele Assistente"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                  <CheckCircle size={20} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Ação Concluída!</h3>
                <p className="text-slate-500 leading-relaxed">
                  {heleModal.message}
                </p>
              </div>

              <button 
                onClick={() => setHeleModal({ isOpen: false, message: '' })}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
