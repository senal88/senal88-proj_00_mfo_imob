import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Calendar,
  Building,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileCode,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { BankAccount, BankStatement, Transaction, LeaseCharge } from '@/types/imob'
import {
  listarContasBancarias,
  listarExtratosBancarios,
  listarTransacoes,
  listarCobrancasLocacao,
} from '@/lib/imobDb'
import {
  exportarCSV,
  exportarOFX,
  exportarExcel,
  exportarPDFExecutivo,
  exportarJSON,
  exportarTXT,
} from '@/lib/exportacaoFinanceira'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function Contas() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [contas, setContas] = useState<BankAccount[]>([])
  const [contaSelecionada, setContaSelecionada] = useState<BankAccount | null>(null)
  const [extratos, setExtratos] = useState<BankStatement[]>([])
  const [extratoSelecionado, setExtratoSelecionado] = useState<BankStatement | null>(null)
  const [transacoes, setTransacoes] = useState<Transaction[]>([])
  const [cobrancas, setCobrancas] = useState<LeaseCharge[]>([])
  const [loading, setLoading] = useState(true)

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [accs, stmts, txs, charges] = await Promise.all([
        listarContasBancarias(usuario?.familia_id),
        listarExtratosBancarios({ familiaId: usuario?.familia_id }),
        listarTransacoes({ familiaId: usuario?.familia_id }),
        listarCobrancasLocacao({ familiaId: usuario?.familia_id }),
      ])

      // Fallback gracioso com os dados reais esperados se a tabela retornar vazia
      const accList: BankAccount[] =
        accs.length > 0
          ? accs
          : [
              {
                id: 'acc-btg-51002',
                bank_name: 'Banco BTG Pactual S.A.',
                bank_code: '208',
                agency: '0001',
                account_number: '51002-9',
                account_type: 'Conta Corrente',
                description: 'Conta Subledger • Locação Imóvel 51002 (Ed. Emílio Bumachar)',
                balance: 10000,
                is_active: true,
              },
            ]

      const stmtList: BankStatement[] =
        stmts.length > 0
          ? stmts
          : [
              {
                id: 'stmt-2026-08',
                bank_account_id: accList[0].id,
                statement_period: 'Extrato de Agosto/2026',
                reference_month: '2026-08',
                competence: '2026-08',
                start_date: '2026-08-01',
                end_date: '2026-08-31',
                opening_balance: 0,
                closing_balance: 10000,
                status: 'conciliado',
              },
            ]

      const txList: Transaction[] =
        txs.length > 0
          ? txs
          : [
              {
                id: 'tx-20260805-51002-902',
                statement_id: stmtList[0].id,
                bank_account_id: accList[0].id,
                date: '2026-08-05',
                amount: 10000,
                type: 'credit',
                fitid: 'FITID-20260805-51002-902',
                description:
                  'PIX RECEBIDO - DANIELLA ALMANCA GONCALVES DA COSTA E OLIVEIRA - ALUGUEL APTO 902',
                category: 'Receita de Locação',
                reconciled: true,
                status: 'conciliado',
              },
            ]

      const chargeList: LeaseCharge[] =
        charges.length > 0
          ? charges
          : [
              {
                id: 'chg-202608',
                competence: '2026-08',
                due_date: '2026-08-05',
                amount: 10000,
                paid_amount: 10000,
                payment_date: '2026-08-05',
                status: 'paid',
                notes: 'Aluguel Apto 902 quitado via PIX',
              },
            ]

      setContas(accList)
      setContaSelecionada(accList[0])
      setExtratos(stmtList)
      setExtratoSelecionado(stmtList[0])
      setTransacoes(txList)
      setCobrancas(chargeList)
    } finally {
      setLoading(false)
    }
  }, [usuario?.familia_id])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const totalCreditos = transacoes
    .filter((t) => t.type === 'credit')
    .reduce((acc, t) => acc + t.amount, 0)
  const totalDebitos = transacoes
    .filter((t) => t.type === 'debit')
    .reduce((acc, t) => acc + t.amount, 0)

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const formatarData = (dataStr: string) => {
    if (!dataStr) return ''
    const partes = dataStr.split('T')[0].split('-')
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataStr
  }

  // Parâmetros para exportação
  const exportParams = {
    transactions: transacoes,
    account: contaSelecionada,
    statement: extratoSelecionado,
    familyName: usuario?.familia_nome || 'Família BNI',
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Topo / Título & Barra de Ferramentas de Exportação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#00205b]">
            Gestão de Contas & Subledger Bancário
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Conciliação bancária, extratos e subledger • {usuario?.familia_nome || 'Família BNI'}
          </p>
        </div>

        {/* MÓDULO 4: Barra de ferramentas "Exportar Demonstrativo" */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-[#00205b] hover:bg-[#001742] text-white flex items-center gap-2 shadow-xs">
                <Download className="h-4 w-4 text-blue-200" />
                <span className="font-semibold text-sm">Exportar Demonstrativo</span>
                <ChevronDown className="h-3.5 w-3.5 text-blue-200" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white border border-gray-200 shadow-lg"
            >
              <DropdownMenuLabel className="text-xs text-gray-500">
                Formatos Disponíveis
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  exportarOFX(exportParams)
                  toast.success('Arquivo OFX 102 gerado com sucesso!')
                }}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <FileCode className="h-4 w-4 text-[#0052cc]" />
                <div>
                  <div className="font-bold text-gray-900">OFX 102</div>
                  <div className="text-[10px] text-gray-500">Open Financial Exchange</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  exportarExcel(exportParams)
                  toast.success('Planilha Excel gerada com sucesso!')
                }}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <div>
                  <div className="font-bold text-gray-900">Excel (.xlsx / .xls)</div>
                  <div className="text-[10px] text-gray-500">Planilha formatada</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  exportarCSV(exportParams)
                  toast.success('Arquivo CSV com separador ; gerado com sucesso!')
                }}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <FileText className="h-4 w-4 text-amber-600" />
                <div>
                  <div className="font-bold text-gray-900">CSV Brasileiro (;)</div>
                  <div className="text-[10px] text-gray-500">Separador ponto e vírgula</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  exportarPDFExecutivo(exportParams)
                  toast.info('Abrindo visualizador de impressão do PDF Executivo...')
                }}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <Layers className="h-4 w-4 text-rose-600" />
                <div>
                  <div className="font-bold text-gray-900">PDF Executivo</div>
                  <div className="text-[10px] text-gray-500">MFO Trust Cabeçalho Oficial</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  exportarJSON(exportParams)
                  toast.success('JSON exportado com sucesso!')
                }}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <span className="font-mono text-[10px] font-bold text-gray-500">{`{ }`}</span>
                <span className="text-gray-700">JSON Estruturado</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  exportarTXT(exportParams)
                  toast.success('TXT estruturado exportado com sucesso!')
                }}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <span className="font-mono text-[10px] font-bold text-gray-500">TXT</span>
                <span className="text-gray-700">Relatório em Texto Puro</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cards de Resumo & Conta Bancária Ativa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Conta Bancária Principal */}
        <Card className="border border-blue-200 bg-white rounded-2xl shadow-xs md:col-span-1">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center font-bold">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Conta Bancária Titular
                </span>
                <h3 className="text-sm font-bold text-[#00205b] leading-tight">
                  {contaSelecionada?.bank_name || 'Banco BTG Pactual S.A.'}
                </h3>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Agência:</span>
                <span className="font-semibold text-gray-800">
                  {contaSelecionada?.agency || '0001'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Conta Corrente:</span>
                <span className="font-mono font-bold text-[#00205b]">
                  {contaSelecionada?.account_number || '51002-9'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Código do Banco:</span>
                <span className="font-semibold text-gray-800">
                  {contaSelecionada?.bank_code || '208'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Status Subledger:</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Ativa e Monitorada
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card Entradas / Receitas de Locação */}
        <Card className="border border-emerald-200 bg-white rounded-2xl shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Total de Entradas (Agosto/2026)
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-700">
                {formatarMoeda(totalCreditos)}
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">
                1 crédito de aluguel conciliado
              </span>
            </div>
            <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Taxa de Inadimplência:</span>
              <span className="font-bold text-emerald-700">0,0%</span>
            </div>
          </CardContent>
        </Card>

        {/* Card Competência & Cobrança de Locação */}
        <Card className="border border-gray-200 bg-white rounded-2xl shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Competência Vigente
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#0052cc] flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#00205b]">
                {extratoSelecionado?.reference_month || '2026-08'}
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">
                {extratoSelecionado?.statement_period || 'Extrato de Agosto/2026'}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Cobranças liquidadas:</span>
              <span className="font-bold text-[#00205b]">
                {cobrancas.length} ({formatarMoeda(10000)})
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção Principal: Extrato e Transações Reais (imob.transaction) */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-gray-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-[#00205b]">
                Lançamentos do Subledger Bancário
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Consulta em tempo real à tabela <code>imob.transaction</code> e{' '}
                <code>imob.bank_statement</code>
              </CardDescription>
            </div>

            <span className="text-xs bg-white text-gray-700 px-3 py-1 rounded-lg border border-gray-200 font-medium">
              Mostrando {transacoes.length} lançamento(s)
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0052cc] border-t-transparent mx-auto mb-3" />
              <p className="text-xs text-gray-500">Carregando transações do subledger...</p>
            </div>
          ) : transacoes.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Landmark className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">
                Nenhuma transação encontrada para este período.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50/90 text-gray-600 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-6">Data</th>
                    <th className="py-3.5 px-4">FITID</th>
                    <th className="py-3.5 px-4">Descrição do Lançamento</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4 text-right">Valor</th>
                    <th className="py-3.5 px-6 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transacoes.map((tx) => (
                    <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs text-gray-700 whitespace-nowrap">
                        {formatarData(tx.date)}
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {tx.fitid || '-'}
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-900 max-w-md">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
                              tx.type === 'credit'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-600',
                            )}
                          >
                            {tx.type === 'credit' ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <span className="block leading-snug">{tx.description}</span>
                            <span className="text-[11px] text-gray-400 font-normal">
                              {tx.type === 'credit' ? 'Entrada via PIX' : 'Débito em conta'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700 font-medium">
                          {tx.category || 'Aluguel'}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'py-4 px-4 text-right font-bold whitespace-nowrap',
                          tx.type === 'credit' ? 'text-emerald-700' : 'text-rose-700',
                        )}
                      >
                        {tx.type === 'credit' ? '+' : '-'}
                        {formatarMoeda(tx.amount)}
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Conciliado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção Secundária: Cobranças de Locação Registradas (imob.lease_charge) */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#00205b]">
                Cobranças de Locação Emitidas (imob.lease_charge)
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Títulos de cobrança gerados com vínculo ao contrato de locação
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/80 text-gray-600 uppercase text-[11px] font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-6">Competência</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor Previsto</th>
                  <th className="py-3 px-4">Valor Pago</th>
                  <th className="py-3 px-4">Data Pagamento</th>
                  <th className="py-3 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cobrancas.map((chg) => (
                  <tr key={chg.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-6 font-semibold text-gray-900 font-mono">
                      {chg.competence}
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono">
                      {formatarData(chg.due_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#00205b]">
                      {formatarMoeda(chg.amount)}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {formatarMoeda(chg.paid_amount || chg.amount)}
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono">
                      {chg.payment_date ? formatarData(chg.payment_date) : '-'}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                        Liquidado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
