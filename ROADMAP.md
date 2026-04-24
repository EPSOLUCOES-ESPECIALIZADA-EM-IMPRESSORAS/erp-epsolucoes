# Roadmap de Desenvolvimento e Documentação do Sistema

Este documento serve como guia para a continuidade do projeto por outros desenvolvedores, detalhando o que foi feito, as decisões técnicas tomadas e o que ainda pode ser melhorado.

## 🏗 Estrutura Técnica
- **Frontend:** React 18 com Vite e TypeScript.
- **Estilização:** Tailwind CSS (utilizando o padrão v4 com `@theme`).
- **Ícones:** Lucide React.
- **Componentes:** Baseado em Radix UI (padrão shadcn/ui flexível).
- **Backend/Banco de Dados:** Firebase (Firestore para dados, Authentication para login Google, Storage para arquivos).

## ✅ Funcionalidades Implementadas
1. **Gestão de OS:** Cadastro, edição, listagem e busca avançada de Ordens de Serviço.
2. **Dashboard Operacional:** Visão geral de métricas, gráficos de status e **Sistema de Alertas** para OS atrasadas ou urgentes.
3. **Anexos Avançados:** 
   - Suporte para múltiplos arquivos (PDF, Imagens, Word, Excel, TXT).
   - Drag-and-Drop (Arraste e Solte) nos detalhes da OS.
   - Barra de progresso real para uploads.
   - Visualização de ícones específicos por tipo de arquivo.
4. **Resiliência de Rede:** Configuração otimizada do Firebase Storage para conexões instáveis (timeouts estendidos e retentativas automáticas).

## 🚀 Próximas Melhorias Sugeridas
- **Sistema de Notificações:** Implementar Push Notifications ou alertas em tempo real via Firestore para mudanças de status.
- **Relatórios em PDF:** Gerar laudos técnicos e comprovantes de entrada diretamente no navegador.
- **Gestão de Estoque:** Vincular peças utilizadas na OS ao estoque de produtos.
- **WhatsApp Integration:** Botão para enviar o status da OS ou o orçamento diretamente para o cliente via API do WhatsApp.
- **Modo Offline:** Implementar Service Workers para consulta básica de ordens sem internet.

## ⚠️ Problemas Identificados e Ajustes Recentes
- **Erro `storage/retry-limit-exceeded`:** Identificado em conexões lentas. 
  - *Correção aplicada:* Aumentamos o `maxOperationRetryTime` para 10 minutos e implementamos `uploadBytesResumable` com monitoramento de progresso para evitar que o upload pareça travado.
- **Performance de Filtros:** Atualmente os filtros são aplicados em memória. Para bases muito grandes (> 1000 OS), sugerimos migrar a filtragem para queries diretas no Firestore com índices compostos.
- **Permissões de Arquivo:** As regras do Firebase (`firestore.rules`) foram endurecidas, mas sempre revisar ao adicionar novos tipos de metadados aos arquivos.

## 🛠 Como Rodar o Projeto (Localmente)
1. Certifique-se de ter o **Node.js 18+** instalado.
2. Extraia o ZIP e abra o terminal na pasta.
3. Execute `npm install` para instalar as dependências.
4. Configure as variáveis de ambiente no arquivo `.env` (baseado no `.env.example`).
5. Execute `npm run dev` para iniciar o servidor de desenvolvimento.

---
*Documento gerado em 24 de Abril de 2026.*
