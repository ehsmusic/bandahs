import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { Integrante } from '../types';
import { 
  Plus, 
  XCircle,
  UserCircle, 
  Phone, 
  Mail, 
  Music, 
  DollarSign,
  Edit2,
  Trash2,
  Search
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, orderBy, getDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';

export const Integrantes = () => {
  const { data: integrantes, loading } = useFirestoreCollection<Integrante>('integrantes', [orderBy('nome', 'asc')]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntegrante, setEditingIntegrante] = useState<Integrante | null>(null);
  
  const { register, handleSubmit, reset, setValue } = useForm<Partial<Integrante>>();

  const filteredIntegrantes = integrantes.filter(i => 
    (String(i.nome || '').toLowerCase()).includes(searchTerm.toLowerCase()) || 
    (String(i.funcao || '').toLowerCase()).includes(searchTerm.toLowerCase())
  );

  const onSubmit = async (data: any) => {
    let rawPhone = data.telefone.replace(/\D/g, '');
    
    // Garantir formato internacional 55
    if (!rawPhone.startsWith('55')) {
      rawPhone = '55' + rawPhone;
    }
    
    const id = rawPhone;

    try {
      if (!editingIntegrante) {
        // Verificar se já existe
        const docSnap = await getDoc(doc(db, 'integrantes', id));
        if (docSnap.exists()) {
          alert("Já existe um integrante com este telefone/ID.");
          return;
        }
      }

      await setDoc(doc(db, 'integrantes', id), {
        ...data,
        telefone: rawPhone,
        id,
        cachePadrao: Number(data.cachePadrao)
      }, { merge: true });
      
      setIsModalOpen(false);
      reset();
      setEditingIntegrante(null);
    } catch (error) {
      console.error("Erro ao salvar integrante:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'integrantes', id));
    } catch (error) {
      console.error("Erro ao excluir integrante:", error);
    }
  };

  const handleEdit = (integrante: Integrante) => {
    setEditingIntegrante(integrante);
    setValue('nome', integrante.nome);
    setValue('funcao', integrante.funcao);
    setValue('telefone', integrante.telefone);
    setValue('email', integrante.email);
    setValue('cachePadrao', integrante.cachePadrao);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Integrantes</h1>
          <p className="text-slate-500 mt-1">Gerencie a equipe e músicos da banda.</p>
        </div>
        <button 
          onClick={() => { 
            setEditingIntegrante(null); 
            reset({
              nome: '',
              funcao: '',
              telefone: '',
              email: '',
              cachePadrao: 0
            }); 
            setIsModalOpen(true); 
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={20} />
          Novo Integrante
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome ou função..." 
          className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrantes.map(integrante => (
          <div key={integrante.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 hover:border-emerald-500/30 transition-all group shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                <UserCircle size={32} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleEdit(integrante)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(integrante.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">{integrante.nome}</h3>
              <p className="text-emerald-600 text-sm font-bold flex items-center gap-1">
                <Music size={14} /> {integrante.funcao}
              </p>
            </div>

            <div className="space-y-2 text-sm text-slate-500">
              <div className="flex items-center gap-2"><Phone size={14} /> {integrante.telefone}</div>
              {integrante.email && <div className="flex items-center gap-2"><Mail size={14} /> {integrante.email}</div>}
              <div className="flex items-center gap-2 font-bold text-slate-700 mt-2">
                <DollarSign size={14} className="text-emerald-600" /> 
                Cache Padrão: R$ {integrante.cachePadrao}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingIntegrante ? 'Editar Integrante' : 'Novo Integrante'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Nome Completo *</label>
                <input {...register('nome', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Função / Instrumento *</label>
                  <input {...register('funcao', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Cache Padrão (R$) *</label>
                  <input type="number" {...register('cachePadrao', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Telefone (Formato: 5511999999999) *</label>
                <input 
                  {...register('telefone', { 
                    required: true,
                    pattern: {
                      value: /^(55)?\d{10,11}$/,
                      message: "Formato inválido. Use 55 + DDD + Número"
                    }
                  })} 
                  placeholder="5511999999999"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">E-mail</label>
                <input {...register('email')} type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all text-slate-700">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20">Salvar Integrante</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
