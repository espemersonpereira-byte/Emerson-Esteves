import React, { useState } from 'react';
import { BookOpen, Plus, Edit2, Trash2, X, Wrench, Clock, Tag } from 'lucide-react';
import { ServiceCatalogItem } from '../types';
import { uid, today, money } from '../utils';

interface CatalogPageProps {
  catalog: ServiceCatalogItem[];
  onSaveCatalogItem: (item: ServiceCatalogItem) => void;
  onDeleteCatalogItem: (id: string) => void;
}

const emptyItem = (): ServiceCatalogItem => ({
  id: '',
  name: '',
  description: '',
  suggestedPrice: 150,
  priceType: 'fixed',
  estimatedDuration: '2 horas',
  category: 'Serviço Geral',
  materials: '',
  notes: '',
  createdAt: today(),
});

export const CatalogPage: React.FC<CatalogPageProps> = ({
  catalog,
  onSaveCatalogItem,
  onDeleteCatalogItem,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<ServiceCatalogItem>(emptyItem());

  const handleOpenNew = () => {
    setFormData(emptyItem());
    setIsFormOpen(true);
  };

  const handleEdit = (item: ServiceCatalogItem) => {
    setFormData(item);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSaveCatalogItem({
      ...formData,
      id: formData.id || uid(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      suggestedPrice: Number(formData.suggestedPrice) || 0,
      estimatedDuration: (formData.estimatedDuration || '').trim(),
      category: formData.category.trim() || 'Geral',
      materials: formData.materials.trim(),
      notes: formData.notes.trim(),
      createdAt: formData.createdAt || today(),
    });
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
            Padronização e Agilidade
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5">
            Catálogo de Serviços ({catalog.length})
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Cadastre seus serviços recorrentes, tabelas de preços e materiais para criar orçamentos e trabalhos rapidamente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (isFormOpen ? setIsFormOpen(false) : handleOpenNew())}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
        >
          {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isFormOpen ? 'Fechar Formulário' : 'Novo Serviço'}</span>
        </button>
      </div>

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 rounded-3xl bg-[var(--paper)] border-2 border-[var(--g)] shadow-lg space-y-4 text-xs animate-in fade-in duration-200"
        >
          <h3 className="text-base font-extrabold text-[var(--ink)]">
            {formData.id ? 'Editar Serviço do Catálogo' : 'Cadastrar Serviço no Catálogo'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold mb-1">Nome do Serviço *</label>
              <input
                type="text"
                required
                placeholder="Ex.: Instalação de Ar-Condicionado, Plantão 12h, Criação de Logotipo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">Categoria</label>
              <input
                type="text"
                placeholder="Ex.: Manutenção, Saúde, Design, Eventos"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">Tipo de Preço *</label>
              <select
                value={formData.priceType}
                onChange={(e) =>
                  setFormData({ ...formData, priceType: e.target.value as 'fixed' | 'hourly' })
                }
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold"
              >
                <option value="fixed">Valor Fixo / Diária</option>
                <option value="hourly">Valor por Hora</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">Preço Sugerido (R$) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.suggestedPrice || ''}
                onChange={(e) =>
                  setFormData({ ...formData, suggestedPrice: Number(e.target.value) })
                }
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">Duração Estimada</label>
              <input
                type="text"
                placeholder="Ex.: 2 horas, 1 diária, 5 dias úteis"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold mb-1">Descrição Técnica do Serviço</label>
              <input
                type="text"
                placeholder="O que está incluso neste serviço..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold mb-1">Materiais Necessários</label>
              <input
                type="text"
                placeholder="Lista de materiais ou ferramentas padrão"
                value={formData.materials}
                onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">Observações</label>
              <input
                type="text"
                placeholder="Garantia ou condições"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl border border-[var(--line)] text-[var(--muted)] font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-[var(--g)] text-white font-bold cursor-pointer"
            >
              Salvar no Catálogo
            </button>
          </div>
        </form>
      )}

      {catalog.length === 0 ? (
        <div className="text-center py-14 px-6 rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)]">
          <BookOpen className="w-10 h-10 mx-auto mb-2 text-[var(--muted)] opacity-50" />
          <h4 className="text-sm font-bold text-[var(--ink)]">Seu catálogo ainda está vazio</h4>
          <p className="text-xs text-[var(--muted)] max-w-xs mx-auto mt-1 mb-4">
            Cadastre seus serviços para preencher orçamentos e trabalhos com apenas 1 clique.
          </p>
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-[var(--g)] text-white text-xs font-bold cursor-pointer"
          >
            + Cadastrar Primeiro Serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {catalog.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col justify-between gap-3 hover:border-[var(--g)]/50 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--sage)] text-[var(--g)] text-[10px] font-bold mb-1">
                      <Tag className="w-3 h-3" /> {item.category || 'Serviço'}
                    </span>
                    <h4 className="text-base font-bold text-[var(--ink)]">{item.name}</h4>
                  </div>
                  <div className="text-right shrink-0">
                    <strong className="font-mono text-base font-extrabold text-[var(--g)] block">
                      {money(item.suggestedPrice)}
                    </strong>
                    <span className="text-[10px] text-[var(--muted)]">
                      {item.priceType === 'hourly' ? 'por hora' : 'valor fixo'}
                    </span>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-[var(--muted)] mt-1.5">{item.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)] mt-3">
                  {item.estimatedDuration && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--g)]" /> {item.estimatedDuration}
                    </span>
                  )}
                  {item.materials && (
                    <span className="inline-flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-[var(--g)]" /> {item.materials}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--line)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(item)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--cream)] flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remover "${item.name}" do catálogo?`)) {
                      onDeleteCatalogItem(item.id);
                    }
                  }}
                  className="p-1.5 rounded-xl text-[#DC4545] hover:bg-[#DC4545]/10 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
