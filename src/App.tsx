import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  ShieldAlert, 
  FileText, 
  History, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  ArrowRight,
  ChevronRight,
  Menu,
  X,
  Trash2,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Supplier, Batch, Customer, Sale, Account, AuditLog } from './types';

type Tab = 'dashboard' | 'inventory' | 'sales' | 'customers' | 'suppliers' | 'accounting' | 'audit';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({ totalSales: 0, stockValue: 0, criticalExpiry: 0, lowStock: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'product' | 'supplier' | 'customer' | 'purchase' | 'sale' | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [currentItem, setCurrentItem] = useState<any>({});

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const openModal = (type: 'product' | 'supplier' | 'customer' | 'purchase' | 'sale', data: any = {}) => {
    setModalType(type);
    setFormData(data);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setFormData({});
    setCurrentItem({});
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let url = '';
    let method = 'POST';

    switch (modalType) {
      case 'product': url = '/api/products'; break;
      case 'supplier': url = '/api/suppliers'; break;
      case 'customer': url = '/api/customers'; break;
      case 'purchase': url = '/api/purchases'; break;
      case 'sale': url = '/api/sales'; break;
    }

    let payload = { ...formData };

    if (modalType === 'purchase') {
      const items = formData.items || [];
      if (items.length === 0) {
        alert('Adicione pelo menos um item à compra.');
        return;
      }
      const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.cost_price), 0);
      
      payload = {
        supplier_id: formData.supplier_id,
        total_amount: totalAmount,
        currency: selectedSupplier?.currency,
        exchange_rate: selectedSupplier?.exchange_rate,
        incoterm: 'CIF',
        items: items.map((item: any) => ({
          product_id: item.product_id,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          quantity: item.quantity,
          cost_price: item.cost_price,
          selling_price: item.selling_price,
          zone: item.zone || 'Normal'
        }))
      };
    }

    if (modalType === 'sale') {
      const subtotal = formData.quantity * formData.unit_price;
      payload = {
        customer_id: formData.customer_id,
        items: [{
          batch_id: formData.batch_id,
          quantity: formData.quantity,
          unit_price: formData.unit_price
        }],
        total_amount: subtotal * 1.18,
        vat_amount: subtotal * 0.18
      };
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao processar pedido');
        return;
      }
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, prodRes, batchRes, custRes, suppRes, accRes, auditRes, salesRes] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/products').then(r => r.json()),
        fetch('/api/batches').then(r => r.json()),
        fetch('/api/customers').then(r => r.json()),
        fetch('/api/suppliers').then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
        fetch('/api/audit').then(r => r.json()),
        fetch('/api/sales').then(r => r.json())
      ]);

      setStats(statsRes);
      setProducts(prodRes);
      setBatches(batchRes);
      setCustomers(custRes);
      setSuppliers(suppRes);
      setAccounts(accRes);
      setAuditLogs(auditRes);
      setSales(salesRes);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-GW', { style: 'currency', currency: 'XOF' }).format(value);
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        activeTab === id 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      }`}
    >
      <Icon size={20} />
      <span className={`${!isSidebarOpen && 'hidden'} font-medium`}>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <ShieldAlert className="text-white" size={20} />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">GUIFARMA</span>}
        </div>

        <nav className="flex-1 px-3 space-y-2">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem id="inventory" icon={Package} label="Inventário" />
          <SidebarItem id="sales" icon={ShoppingCart} label="Vendas & Faturas" />
          <SidebarItem id="customers" icon={Users} label="Clientes" />
          <SidebarItem id="suppliers" icon={Truck} label="Fornecedores" />
          <SidebarItem id="accounting" icon={FileText} label="Contabilidade" />
          <SidebarItem id="audit" icon={History} label="Auditoria" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-800 text-slate-400"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-bottom border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold capitalize">{activeTab.replace('-', ' ')}</h1>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-medium border border-emerald-500/20">
              OHADA Compliant
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold">
              GS
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                      title="Vendas Totais" 
                      value={formatCurrency(stats.totalSales)} 
                      icon={TrendingUp} 
                      color="emerald" 
                    />
                    <StatCard 
                      title="Valor em Stock" 
                      value={formatCurrency(stats.stockValue)} 
                      icon={DollarSign} 
                      color="blue" 
                    />
                    <StatCard 
                      title="Validade Crítica" 
                      value={stats.criticalExpiry} 
                      subtitle="Próximos 60 dias"
                      icon={AlertTriangle} 
                      color="orange" 
                    />
                    <StatCard 
                      title="Stock Baixo" 
                      value={stats.lowStock} 
                      subtitle="Abaixo do mínimo"
                      icon={Package} 
                      color="rose" 
                    />
                  </div>

                  {/* Recent Activity & Charts Placeholder */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-lg">Fluxo de Caixa OHADA</h3>
                        <BarChart3 className="text-slate-500" size={20} />
                      </div>
                      <div className="h-64 flex items-end gap-4 px-4">
                        {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                          <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-lg relative group">
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-lg transition-all duration-500" 
                              style={{ height: `${h}%` }}
                            />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              {h}k
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-4 text-xs text-slate-500 px-2">
                        <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                      <h3 className="font-semibold text-lg mb-6">Alertas Sanitários</h3>
                      <div className="space-y-4">
                        {batches.filter(b => b.sanitary_status !== 'Ativo').slice(0, 5).map(b => (
                          <div key={b.id} className="flex gap-4 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                            <AlertTriangle className="text-rose-500 shrink-0" size={18} />
                            <div>
                              <p className="text-sm font-medium">{b.product_name}</p>
                              <p className="text-xs text-slate-400">Lote: {b.batch_number} • {b.sanitary_status}</p>
                            </div>
                          </div>
                        ))}
                        {batches.filter(b => b.sanitary_status !== 'Ativo').length === 0 && (
                          <div className="text-center py-8 text-slate-500 italic text-sm">
                            Nenhum alerta sanitário ativo.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="text" 
                          placeholder="Pesquisar lotes, produtos..." 
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => openModal('product')}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors border border-slate-700"
                      >
                        <Plus size={18} /> Novo Produto
                      </button>
                      <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors">
                        <Plus size={18} /> Novo Lote
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-semibold">Produto</th>
                          <th className="px-6 py-4 font-semibold">Lote / Origem</th>
                          <th className="px-6 py-4 font-semibold">Validade</th>
                          <th className="px-6 py-4 font-semibold">Qtd</th>
                          <th className="px-6 py-4 font-semibold">Status Sanitário</th>
                          <th className="px-6 py-4 font-semibold">Zona</th>
                          <th className="px-6 py-4 font-semibold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {batches.map(batch => (
                          <tr key={batch.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-medium">{batch.product_name}</p>
                              <p className="text-xs text-slate-500">{batch.unit}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-mono text-sm">{batch.batch_number}</p>
                              <p className="text-[10px] text-slate-500 uppercase">
                                {batch.supplier_name || 'Stock Inicial'} • {(batch as any).purchase_ref || 'N/A'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-sm ${new Date(batch.expiry_date) < new Date() ? 'text-rose-500 font-bold' : ''}`}>
                                {new Date(batch.expiry_date).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium">{batch.quantity}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                batch.sanitary_status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-500' :
                                batch.sanitary_status === 'Recolhido' ? 'bg-orange-500/10 text-orange-500' :
                                'bg-rose-500/10 text-rose-500'
                              }`}>
                                {batch.sanitary_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">{batch.zone}</td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-slate-400 hover:text-white p-1">
                                <ChevronRight size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'sales' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Vendas e Faturação OHADA</h3>
                    <button 
                      onClick={() => openModal('sale')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors"
                    >
                      <Plus size={18} /> Nova Venda / Fatura
                    </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-semibold">Data</th>
                          <th className="px-6 py-4 font-semibold">Nº Fatura</th>
                          <th className="px-6 py-4 font-semibold">Cliente</th>
                          <th className="px-6 py-4 font-semibold">Total</th>
                          <th className="px-6 py-4 font-semibold">IVA (18%)</th>
                          <th className="px-6 py-4 font-semibold">Status</th>
                          <th className="px-6 py-4 font-semibold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {sales.map(sale => (
                          <tr key={sale.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 text-slate-400 text-sm">
                              {new Date(sale.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-emerald-500 font-bold">
                              {sale.fiscal_number}
                            </td>
                            <td className="px-6 py-4 font-medium">
                              {sale.customer_name}
                            </td>
                            <td className="px-6 py-4 font-bold">
                              {formatCurrency(sale.total_amount)}
                            </td>
                            <td className="px-6 py-4 text-slate-400">
                              {formatCurrency(sale.vat_amount)}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold uppercase">
                                {sale.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-slate-400 hover:text-white p-1">
                                <FileText size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {sales.length === 0 && (
                          <tr className="text-center py-8 text-slate-500 italic text-sm">
                            <td colSpan={7} className="py-10">
                              Nenhuma fatura emitida.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'accounting' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                      <FileText className="text-emerald-500" size={20} />
                      Plano de Contas OHADA
                    </h3>
                    <div className="space-y-3">
                      {accounts.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-emerald-500 font-bold w-12">{acc.code}</span>
                            <span className="font-medium">{acc.name}</span>
                          </div>
                          <span className={`font-semibold ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(acc.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                      <h3 className="font-semibold text-lg mb-4">Exportação Contábil</h3>
                      <p className="text-slate-400 text-sm mb-6">Gere relatórios formatados para auditoria fiscal e contabilidade externa.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <button className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                          <FileText className="text-blue-400" />
                          <span className="text-xs font-medium">Diário (PDF)</span>
                        </button>
                        <button className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                          <TrendingUp className="text-emerald-400" />
                          <span className="text-xs font-medium">Balanço (Excel)</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
                      <h3 className="font-semibold text-emerald-500 mb-2">Conformidade Fiscal</h3>
                      <p className="text-sm text-emerald-500/70">
                        O sistema garante a numeração sequencial imutável de faturas conforme as normas da OHADA e da Direção Geral de Impostos da Guiné-Bissau.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Logs de Auditoria Imutáveis</h3>
                    <span className="text-xs text-slate-500">Retenção: 5 Anos</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-semibold">Data/Hora</th>
                          <th className="px-6 py-4 font-semibold">Ação</th>
                          <th className="px-6 py-4 font-semibold">Tabela</th>
                          <th className="px-6 py-4 font-semibold">ID Registo</th>
                          <th className="px-6 py-4 font-semibold">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {auditLogs.map(log => (
                          <tr key={log.id} className="text-sm hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 text-slate-400">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-emerald-500">{log.action}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-300">{log.table_name}</td>
                            <td className="px-6 py-4 font-mono">#{log.record_id}</td>
                            <td className="px-6 py-4">
                              <div className="max-w-xs truncate text-xs text-slate-500" title={log.new_value}>
                                {log.new_value}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'suppliers' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Gestão de Fornecedores</h3>
                    <button 
                      onClick={() => openModal('supplier')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors"
                    >
                      <Plus size={18} /> Novo Fornecedor
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suppliers.map(supplier => (
                      <div key={supplier.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                            <Truck size={24} />
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2 py-1 bg-slate-800 rounded-full text-slate-400">
                            {supplier.type}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold mb-1">{supplier.name}</h4>
                        <div className="space-y-2 text-sm text-slate-400">
                          <p className="flex items-center gap-2"><ArrowRight size={14} className="text-emerald-500" /> {supplier.country}</p>
                          <p className="flex items-center gap-2"><ArrowRight size={14} className="text-emerald-500" /> {supplier.contact}</p>
                          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-xs">Moeda: <b className="text-slate-200">{supplier.currency}</b></span>
                            <span className="text-xs">Câmbio: <b className="text-slate-200">{supplier.exchange_rate}</b></span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            openModal('purchase', { supplier_id: supplier.id });
                          }}
                          className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors"
                        >
                          Registar Compra / Importação
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'customers' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Gestão de Clientes</h3>
                    <button 
                      onClick={() => openModal('customer')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors"
                    >
                      <Plus size={18} /> Novo Cliente
                    </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-semibold">Nome</th>
                          <th className="px-6 py-4 font-semibold">NIF</th>
                          <th className="px-6 py-4 font-semibold">Classificação</th>
                          <th className="px-6 py-4 font-semibold">Limite de Crédito</th>
                          <th className="px-6 py-4 font-semibold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {customers.map(customer => (
                          <tr key={customer.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 font-medium">{customer.name}</td>
                            <td className="px-6 py-4 text-slate-400">{customer.tax_id}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                customer.classification === 'A' ? 'bg-emerald-500/10 text-emerald-500' :
                                customer.classification === 'B' ? 'bg-blue-500/10 text-blue-500' :
                                'bg-slate-500/10 text-slate-500'
                              }`}>
                                Classe {customer.classification}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold">{formatCurrency(customer.credit_limit)}</td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-slate-400 hover:text-white p-1">
                                <ChevronRight size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {customers.length === 0 && (
                          <tr className="text-center py-8 text-slate-500 italic text-sm">
                            <td colSpan={5} className="py-10">Nenhum cliente registado.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Other tabs would follow similar patterns */}
              {['sales'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <AlertTriangle size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium">Módulo em Desenvolvimento</p>
                  <p className="text-sm">A interface para {activeTab} está a ser finalizada.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold capitalize">
                  {modalType === 'product' && 'Novo Produto'}
                  {modalType === 'supplier' && 'Novo Fornecedor'}
                  {modalType === 'customer' && 'Novo Cliente'}
                  {modalType === 'purchase' && 'Registar Compra'}
                  {modalType === 'sale' && 'Nova Venda'}
                </h3>
                <button onClick={closeModal} className="text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {modalType === 'product' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Nome do Produto</label>
                      <input 
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Categoria</label>
                        <input 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={formData.category || ''}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Unidade</label>
                        <input 
                          placeholder="Ex: Caixa, Frasco"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={formData.unit || ''}
                          onChange={e => setFormData({...formData, unit: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Stock Mínimo</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        value={formData.min_stock || 0}
                        onChange={e => setFormData({...formData, min_stock: parseInt(e.target.value)})}
                      />
                    </div>
                  </>
                )}

                {modalType === 'supplier' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Nome da Empresa</label>
                      <input 
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">País</label>
                        <input 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={formData.country || ''}
                          onChange={e => setFormData({...formData, country: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Tipo</label>
                        <select 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={formData.type || 'Distribuidor'}
                          onChange={e => setFormData({...formData, type: e.target.value})}
                        >
                          <option>Fabricante</option>
                          <option>Distribuidor</option>
                          <option>Importador</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Moeda</label>
                        <input 
                          placeholder="EUR, USD, XOF"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={formData.currency || 'XOF'}
                          onChange={e => setFormData({...formData, currency: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Taxa de Câmbio</label>
                        <input 
                          type="number"
                          step="0.0001"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={formData.exchange_rate || 1.0}
                          onChange={e => setFormData({...formData, exchange_rate: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Contacto</label>
                      <input 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        value={formData.contact || ''}
                        onChange={e => setFormData({...formData, contact: e.target.value})}
                      />
                    </div>
                  </>
                )}

                {modalType === 'customer' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Nome do Cliente / Farmácia</label>
                      <input 
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">NIF / ID Fiscal</label>
                      <input 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        value={formData.tax_id || ''}
                        onChange={e => setFormData({...formData, tax_id: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Classificação</label>
                        <select 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={formData.classification || 'C'}
                          onChange={e => setFormData({...formData, classification: e.target.value})}
                        >
                          <option value="A">Classe A (Baixo Risco)</option>
                          <option value="B">Classe B (Médio Risco)</option>
                          <option value="C">Classe C (Alto Risco)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Limite de Crédito</label>
                        <input 
                          type="number"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={formData.credit_limit || 0}
                          onChange={e => setFormData({...formData, credit_limit: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                  </>
                )}

                {modalType === 'purchase' && (
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <p className="text-xs font-bold text-emerald-500 uppercase">Fornecedor: {selectedSupplier?.name}</p>
                      <p className="text-[10px] text-emerald-500/70">Moeda: {selectedSupplier?.currency} • Câmbio: {selectedSupplier?.exchange_rate}</p>
                    </div>

                    {/* List of added items */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Package size={14} /> Itens da Compra ({formData.items?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {(formData.items || []).map((item: any, index: number) => (
                          <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm">
                                {products.find(p => p.id === item.product_id)?.name}
                              </p>
                              <p className="text-[10px] text-slate-500 uppercase">
                                Lote: {item.batch_number} • Qtd: {item.quantity} • Custo: {item.cost_price} {selectedSupplier?.currency}
                              </p>
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                const newItems = [...formData.items];
                                newItems.splice(index, 1);
                                setFormData({ ...formData, items: newItems });
                              }}
                              className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        {(!formData.items || formData.items.length === 0) && (
                          <div className="text-center py-4 border-2 border-dashed border-slate-800 rounded-xl text-slate-600 text-xs italic">
                            Nenhum item adicionado ainda.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add Item Form */}
                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 space-y-4">
                      <h4 className="text-xs font-bold text-emerald-500 uppercase">Adicionar Item</h4>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Produto</label>
                        <select 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={currentItem.product_id || ''}
                          onChange={e => setCurrentItem({...currentItem, product_id: parseInt(e.target.value)})}
                        >
                          <option value="">Selecionar Produto...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Nº Lote</label>
                          <input 
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            value={currentItem.batch_number || ''}
                            onChange={e => setCurrentItem({...currentItem, batch_number: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Validade</label>
                          <input 
                            type="date"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            value={currentItem.expiry_date || ''}
                            onChange={e => setCurrentItem({...currentItem, expiry_date: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Quantidade</label>
                          <input 
                            type="number"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            value={currentItem.quantity || ''}
                            onChange={e => setCurrentItem({...currentItem, quantity: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Zona</label>
                          <select 
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            value={currentItem.zone || 'Normal'}
                            onChange={e => setCurrentItem({...currentItem, zone: e.target.value})}
                          >
                            <option>Normal</option>
                            <option>Frio</option>
                            <option>Controlados</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Preço Custo ({selectedSupplier?.currency})</label>
                          <input 
                            type="number"
                            step="0.01"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            value={currentItem.cost_price || ''}
                            onChange={e => setCurrentItem({...currentItem, cost_price: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Preço Venda (XOF)</label>
                          <input 
                            type="number"
                            step="0.01"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            value={currentItem.selling_price || ''}
                            onChange={e => setCurrentItem({...currentItem, selling_price: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={() => {
                          if (currentItem.product_id && currentItem.batch_number && currentItem.quantity) {
                            const items = formData.items || [];
                            setFormData({ ...formData, items: [...items, currentItem] });
                            setCurrentItem({});
                          } else {
                            alert('Preencha os campos obrigatórios do item (Produto, Lote, Quantidade)');
                          }
                        }}
                        className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Adicionar Item à Compra
                      </button>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 uppercase font-bold">Total da Compra:</span>
                        <span className="text-lg font-bold text-emerald-500">
                          {selectedSupplier?.currency} {(formData.items || []).reduce((sum: number, i: any) => sum + (i.quantity * i.cost_price), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {modalType === 'sale' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Cliente</label>
                      <select 
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        onChange={e => setFormData({...formData, customer_id: parseInt(e.target.value)})}
                      >
                        <option value="">Selecionar Cliente...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Lote (Medicamento)</label>
                      <select 
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        onChange={e => {
                          const batch = batches.find(b => b.id === parseInt(e.target.value));
                          if (batch) {
                            setFormData({
                              ...formData, 
                              batch_id: batch.id,
                              unit_price: batch.selling_price
                            });
                          }
                        }}
                      >
                        <option value="">Selecionar Lote...</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id} disabled={b.quantity <= 0}>
                            {b.product_name} - {b.batch_number} (Disp: {b.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Quantidade</label>
                        <input 
                          type="number"
                          required
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={formData.quantity || 0}
                          onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Preço Unitário (XOF)</label>
                        <input 
                          type="number"
                          required
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          value={formData.unit_price || 0}
                          onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Subtotal:</span>
                        <span className="font-bold">{formatCurrency((formData.quantity || 0) * (formData.unit_price || 0))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">IVA (18%):</span>
                        <span className="font-bold text-rose-400">{formatCurrency((formData.quantity || 0) * (formData.unit_price || 0) * 0.18)}</span>
                      </div>
                      <div className="flex justify-between text-lg pt-2 border-t border-slate-700">
                        <span className="font-bold">Total:</span>
                        <span className="font-bold text-emerald-400">{formatCurrency((formData.quantity || 0) * (formData.unit_price || 0) * 1.18)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-lg shadow-emerald-900/20"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }: { title: string, value: string | number, subtitle?: string, icon: any, color: 'emerald' | 'blue' | 'orange' | 'rose' }) {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-xl border ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
          <TrendingUp size={12} />
          +12%
        </div>
      </div>
      <div>
        <h4 className="text-slate-400 text-sm font-medium mb-1">{title}</h4>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

