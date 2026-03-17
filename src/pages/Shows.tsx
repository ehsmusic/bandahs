import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { Show, Cliente } from '../types';
import { orderBy, addDoc, collection, serverTimestamp, doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { 
  Music, 
  MapPin, 
  Calendar, 
  Clock, 
  ChevronRight,
  Filter,
  Search,
  Plus,
  XCircle,
  UserPlus,
  Users,
  Volume2,
  Tag,
  Utensils
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { useForm } from 'react-hook-form';

export const Shows = () => {
  const { data: shows } = useFirestoreCollection<Show>('shows', [orderBy('dataEvento', 'asc')]);
  const { data: clientes } = useFirestoreCollection<Cliente>('clientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewClientMode, setIsNewClientMode] = useState(false);
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>();
  const clientType = watch('clientType');

  const onSubmit = async (formData: any) => {
    try {
      let clienteId = formData.clienteId;

      if (isNewClientMode) {
        const rawPhone = formData.newClientPhone.replace(/\D/g, '');
        clienteId = rawPhone;
        
        // Criar novo cliente
        await setDoc(doc(db, 'clientes', clienteId), {
          id: clienteId,
          nome: formData.newClientName,
          telefone: rawPhone,
          dataCadastro: serverTimestamp()
        });
      }

      const [year, month, day] = formData.dataEvento.split('-').map(Number);
      const [hour, minute] = (formData.horarioEvento || '00:00').split(':').map(Number);
      const dateObj = new Date(year, month - 1, day, hour, minute);
      
      const dataFormatada = format(dateObj, 'dd-MM-yyyy');
      const showId = `${formData.tipoEvento}-${clienteId || 'sem-cliente'}-${dataFormatada}-${Math.random().toString(36).substr(2, 5)}`;
      
      const showData = {
        ...formData,
        clienteId: clienteId || 'none',
        id: showId,
        dataEvento: Timestamp.fromDate(dateObj),
        statusEvento: 'Confirmado',
        reuniaoId: 'manual',
        publicoEstimado: Number(formData.publicoEstimado) || 0,
        somContratado: formData.somContratado === 'true',
        alimentacao: formData.alimentacao === 'true',
      };

      // Remover campos temporários do formulário de novo cliente
      delete (showData as any).newClientName;
      delete (showData as any).newClientPhone;
      delete (showData as any).clientType;

      await setDoc(doc(db, 'shows', showId), showData);
      
      // Adicionar financeiro inicial
      await setDoc(doc(db, 'shows', showId, 'financeiro', 'geral'), {
        valorContrato: formData.valorContrato || 0,
        valorPagoTotal: 0,
        observacoes: 'Show inserido manualmente'
      });

      setIsModalOpen(false);
      reset();
      alert("Show criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar show:", error);
    }
  };

  const filteredShows = shows.filter(show => {
    const matchesSearch = (String(show.nomeEvento || '').toLowerCase()).includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Todos' || show.statusEvento === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Shows</h1>
          <p className="text-slate-500 mt-1">Gerencie todos os eventos confirmados da banda.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={20} />
          Novo Show
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar show..." 
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
          <Filter size={18} className="text-slate-400" />
          <select 
            className="bg-transparent outline-none text-sm font-medium"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="Todos">Todos Status</option>
            <option value="Confirmado">Confirmado</option>
            <option value="Em negociação">Em negociação</option>
            <option value="Realizado">Realizado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredShows.map(show => {
          const cliente = clientes.find(c => c.id === show.clienteId);
          
          let date: Date;
          if (show.dataEvento instanceof Timestamp) {
            date = show.dataEvento.toDate();
          } else if (show.dataEvento?.seconds) {
            date = new Date(show.dataEvento.seconds * 1000);
          } else if (show.dataEvento instanceof Date) {
            date = show.dataEvento;
          } else {
            date = new Date();
          }
          
          return (
            <Link 
              to={`/shows/${show.id}`} 
              key={show.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-500/50 transition-all group flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden shadow-sm"
            >
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1.5",
                show.statusEvento === 'Confirmado' ? "bg-emerald-500" :
                show.statusEvento === 'Realizado' ? "bg-blue-500" :
                show.statusEvento === 'Cancelado' ? "bg-rose-500" :
                show.statusEvento === 'Em negociação' ? "bg-amber-500" :
                "bg-slate-300"
              )} />

              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex flex-col items-center justify-center text-sm font-bold border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-all ml-1">
                <span className="text-emerald-600 text-xs">{format(date, 'dd/MM')}</span>
                <span className="text-slate-500 text-[10px]">{format(date, 'yyyy')}</span>
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{show.nomeEvento}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest",
                    show.statusEvento === 'Confirmado' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-500"
                  )}>
                    {show.statusEvento}
                  </span>
                </div>
                <p className="text-slate-600 text-sm font-medium">
                  <span className="text-slate-400 text-xs font-normal">Contratante:</span> {cliente?.nome || 'Não informado'}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5"><Calendar size={14} className="text-emerald-600/70" /> {format(date, 'dd/MM/yyyy')}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} className="text-emerald-600/70" /> {show.horarioEvento}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-emerald-600/70" /> {show.local} • {show.cidade}</span>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md text-[10px] text-slate-500 border border-slate-100">
                    <Tag size={12} className="text-emerald-600/70" /> {show.tipoEvento}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md text-[10px] text-slate-500 border border-slate-100">
                    <Users size={12} className="text-emerald-600/70" /> {show.publicoEstimado || 0} pessoas
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md text-[10px] text-slate-500 border border-slate-100">
                    <Volume2 size={12} className="text-emerald-600/70" /> 
                    {show.somContratado ? 'Som HS Produções' : 'Som do Cliente'}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md text-[10px] text-slate-500 border border-slate-100">
                    <Utensils size={12} className="text-emerald-600/70" /> 
                    {show.alimentacao ? 'Com Alimentação' : 'Sem Alimentação'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-auto">
                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contrato</span>
                  <span className="text-sm font-bold text-slate-700">
                    {show.valorContrato 
                      ? `R$ ${show.valorContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                      : 'R$ 0,00'}
                  </span>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-emerald-600 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Modal Novo Show */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Novo Show</h2>
              <button onClick={() => { setIsModalOpen(false); setIsNewClientMode(false); }} className="text-slate-400 hover:text-slate-600"><XCircle /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-slate-900">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Data *</label>
                  <input type="date" {...register('dataEvento', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Horário *</label>
                  <input type="time" {...register('horarioEvento', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>

              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-500">Cliente *</label>
                  <button 
                    type="button"
                    onClick={() => setIsNewClientMode(!isNewClientMode)}
                    className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                  >
                    {isNewClientMode ? <Search size={14} /> : <UserPlus size={14} />}
                    {isNewClientMode ? 'Selecionar Existente' : 'Novo Cliente'}
                  </button>
                </div>

                {!isNewClientMode ? (
                  <select {...register('clienteId')} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="none">Sem cliente selecionado</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    <input {...register('newClientName', { required: isNewClientMode })} placeholder="Nome do Novo Cliente" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    <input {...register('newClientPhone', { required: isNewClientMode })} placeholder="Telefone (DDD + Número)" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Tipo de Evento *</label>
                  <select {...register('tipoEvento', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="Casamento">Casamento</option>
                    <option value="Formatura">Formatura</option>
                    <option value="Aniversário">Aniversário</option>
                    <option value="Confraternização">Confraternização</option>
                    <option value="Corporativo">Corporativo</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Público Estimado</label>
                  <input type="number" {...register('publicoEstimado')} placeholder="Ex: 200" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Som Contratado?</label>
                  <select {...register('somContratado')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="false">Cliente possui som</option>
                    <option value="true">Contratar HS Produções</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Alimentação Banda?</label>
                  <select {...register('alimentacao')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="true">Sim, haverá alimentação</option>
                    <option value="false">Não haverá</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Duração do Show</label>
                  <select {...register('duracao')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="1 hora">1 hora</option>
                    <option value="2 horas">2 horas</option>
                    <option value="3 horas">3 horas</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Forma de Pagamento</label>
                  <select {...register('formaPagamento')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="À vista">À vista</option>
                    <option value="Parcelado">Parcelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Nome do Evento</label>
                <input {...register('nomeEvento', { required: true })} placeholder="Ex: Casamento de João e Maria" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Cidade</label>
                  <input {...register('cidade')} placeholder="Cidade" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Local</label>
                  <input {...register('local')} placeholder="Nome do Local" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Valor do Contrato (R$)</label>
                <input type="number" step="0.01" {...register('valorContrato', { valueAsNumber: true })} placeholder="0,00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20">
                  Criar Show
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
