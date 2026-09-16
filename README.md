# 💻 Sistema de Inventário Escolar

Aplicação web desenvolvida para facilitar o controle, auditoria e diagnóstico de equipamentos tecnológicos em ambiente escolar (laptops de alunos, tablets e laptops de professores).

---

## 🎯 Sobre o Projeto & Motivação

Como auxiliar técnico de TI em ambiente escolar, lidar com dezenas de computadores, laptops e tablets espalhados pelas salas e laboratórios através de anotações em papel ou planilhas manuais tornava a auditoria e o diagnóstico um processo lento e sujeito a erros.

Desenvolvi esta aplicação para **resolver esse problema real do meu dia a dia**: criar uma ferramenta rápida, visual e prática para cadastrar equipamentos em lote, mapear quais máquinas precisam de reparo (teclado, software, lentidão ou peças quebradas) e gerar relatórios estilizados em Excel para a coordenação em segundos.

A ferramenta foi projetada para ser:
- **Ágil no cadastro:** permite cadastrar itens unitários ou em lote (ex: cadastrar do número 1 ao 30 de uma vez).
- **Independente de backend:** funciona 100% no navegador, salvando tudo no `localStorage` e permitindo exportar para Excel ou fazer backup em JSON.
- **Visual:** painéis de estatísticas e gráficos para identificar rapidamente a quantidade de máquinas quebradas, em bom estado ou com problemas de software.
- **Responsiva:** experiência fluida em computadores, notebooks, tablets e celulares.

---

## 🚀 Tecnologias Utilizadas

- **HTML5:** Estruturação semântica das páginas e formulários.
- **CSS3 (Vanilla):** Design escuro moderno, layout responsivo e transições/animações customizadas sem dependência de frameworks.
- **JavaScript (ES6+):** Lógica de manipulação de dados, filtros de busca, validações e persistência no `localStorage`.
- **[ExcelJS](https://github.com/exceljs/exceljs) & [xlsx-js-style](https://github.com/gitbrent/xlsx-js-style):** Bibliotecas para exportar relatórios em formato `.xlsx` com células estilizadas por status e fórmulas de contagem.
- **[Chart.js](https://www.chartjs.org/):** Geração dinâmica de gráficos de proporção/status dos aparelhos.
- **[FontAwesome](https://fontawesome.com/):** Conjunto de ícones para identificação visual rápida de status e ações.

---

## ⚙️ Funcionalidades

- **Módulos separados por tipo de dispositivo:**
  - **Laptops dos Alunos (`index.html`):** controle detalhado de marcas e 5 categorias de conservação (Bom estado, Erro de software, Teclas faltando, Teclas ruins, Quebrado).
  - **Tablets (`tablets.html`):** controle simplificado focado em tablets (Bom estado ou Quebrado).
  - **Laptops de Professores (`professores.html`):** controle específico para modelos do corpo docente (ThinkPad, Ultra, etc.).
- **Entrada em Lote:** suporte a intervalos numéricos (ex: `1..25, 30, 42..50`).
- **Filtros e Busca Instantânea:** pesquisa por número, marca ou status em tempo real.
- **Exportação de Dados:**
  - Planilha Excel (.xlsx) formatada e colorida.
  - Arquivo CSV para importação em outros sistemas.
- **Backup e Restauração:** exportação e importação de arquivo `.json` para segurança dos dados ou troca de máquina.
- **Edição e Exclusão:** modal para ajuste rápido de observações ou status de qualquer item já cadastrado.

---
