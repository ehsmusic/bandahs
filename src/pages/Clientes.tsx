import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { Cliente } from '../types';
import { 
  Plus, 
  Search, 
  MessageCircle, 
  Mail, 
  Phone, 
  XCircle,
  Edit2,
  Trash2,
  UserPlus
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useForm } from 'react-hook-form';

export const Clientes = () => {
  const { data: clientes, loading } = useFirestoreCollection<Cliente>('clientes', [orderBy('nome', 'asc')]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Partial<Cliente>>();

  const filteredClientes = clientes.filter(c => 
    (String(c.nome || '').toLowerCase()).includes(searchTerm.toLowerCase()) || 
    (String(c.telefone || '')).includes(searchTerm)
  );

  const onSubmit = async (data: any) => {
    console.log("Submetendo formulário de cliente:", data);
    let rawPhone = String(data.telefone).replace(/\D/g, '');
    
    // Garantir formato internacional 55
    if (!rawPhone.startsWith('55')) {
      rawPhone = '55' + rawPhone;
    }
    
    const id = editingCliente ? editingCliente.id : rawPhone;
    try {
      await setDoc(doc(db, 'clientes', String(id)), {
        ...data,
        telefone: rawPhone,
        id: String(id),
        dataCadastro: editingCliente?.dataCadastro || serverTimestamp()
      }, { merge: true });
      
      // Se o ID mudou (telefone mudou e não estamos usando ID fixo), poderíamos deletar o antigo, 
      // mas como o usuário reclamou de duplicatas, vamos garantir que usamos o ID correto.
      // Se o telefone mudou e o ID era o telefone, e agora o ID é o novo telefone, 
      // o setDoc criará um novo se o ID for diferente.
      
      setIsModalOpen(false);
      reset();
      setEditingCliente(null);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }
  };

  const handleEdit = (cliente: Cliente) => {
    console.log("Editando cliente:", cliente);
    setEditingCliente(cliente);
    setValue('nome', cliente.nome);
    setValue('telefone', String(cliente.telefone));
    setValue('email', cliente.email);
    setValue('cpf', cliente.cpf);
    setValue('endereco', cliente.endereco);
    setValue('observacoes', cliente.observacoes);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    setClientToDelete(String(id));
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    const idStr = String(clientToDelete);
    console.log("Excluindo cliente ID:", idStr);
    try {
      await deleteDoc(doc(db, 'clientes', idStr));
      setClientToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Clientes</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Gerencie sua base de contatos e contratantes.</p>
        </div>
        <button 
          onClick={() => { setEditingCliente(null); reset(); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 w-full sm:w-auto"
        >
          <UserPlus size={20} />
          Novo Cliente
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome ou telefone..." 
          className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClientes.map(cliente => (
                <tr key={cliente.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{cliente.nome}</div>
                    <div className="text-xs text-slate-400">ID: {cliente.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        {cliente.telefone}
                      </div>
                      {cliente.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail size={14} className="text-slate-400" />
                          {cliente.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {cliente.cpf || 'Não informado'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a 
                        href={`https://wa.me/${cliente.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="WhatsApp"
                      >
                        <MessageCircle size={20} />
                      </a>
                      <button 
                        type="button"
                        onClick={() => handleEdit(cliente)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(cliente.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit, (err) => console.log("Erros de validação:", err))} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Nome Completo *</label>
                <input {...register('nome', { required: 'Nome é obrigatório' })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/50 outline-none" />
                {errors.nome && <p className="text-rose-500 text-xs mt-1">{errors.nome.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Telefone (Ex: 5511999999999) *</label>
                  <input 
                    {...register('telefone', { 
                      required: 'Telefone é obrigatório',
                      pattern: {
                        value: /^(55)?\d{10,11}$/,
                        message: "Use 55 + DDD + Número"
                      }
                    })} 
                    placeholder="5511999999999" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/50 outline-none" 
                  />
                  {errors.telefone && <p className="text-rose-500 text-xs mt-1">{errors.telefone.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">CPF</label>
                  <input {...register('cpf')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/50 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">E-mail</label>
                <input {...register('email')} type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Endereço Completo</label>
                <input {...register('endereco')} placeholder="Rua, Número, Bairro, Cidade - UF" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Observações</label>
                <textarea {...register('observacoes')} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/50 outline-none" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all text-slate-700">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20">Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Exclusão</h3>
            <p className="text-slate-500 mb-6">Deseja realmente excluir este cliente? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all text-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-600/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
